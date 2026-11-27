/**
 * Graph tools: relationship questions answered by the Memgraph catalog graph
 * (filled by `npm run graph:sync`, see docs/memgraph/README.md).
 *
 * Every query is fixed and read-only: the model only supplies values.
 * Prices and stock in the graph are a snapshot from the last sync, so results say so.
 */
import { tool } from "langchain";
import { z } from "zod";
import { GraphUnavailableError, int, runRead } from "@/lib/graph/client";
import { result, safely, status, type Runtime } from "./shared";

const SNAPSHOT_NOTE = "Prices are from the last catalog sync. Call get_product_details before quoting a price or stock level.";

const GRAPH_DOWN = result({
  error: "graph_unavailable",
  message: "Relationship search is unavailable right now. Use search_products with the brand or category instead.",
});

/** Like safely(), plus a readable fallback when Memgraph is off or unreachable. */
const graphSafely = (fn: () => Promise<string>) =>
  safely(async () => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof GraphUnavailableError) return GRAPH_DOWN;
      throw err;
    }
  });

// Candidates share a subcategory or a brand with the product. Same subcategory counts more than same brand.
// Products with the same title (colour variants listed separately) are dropped or collapsed into one row.
const RELATED_PRODUCTS = `
  MATCH (p:Product {id: $id})-[:IN_SUBCATEGORY|MADE_BY]->(hub)<-[:IN_SUBCATEGORY|MADE_BY]-(o:Product)
  WHERE o.title <> p.title AND o.stock > 0
  WITH o, collect(DISTINCT labels(hub)[0]) AS shared
  WITH o, "Subcategory" IN shared AS sameSubcategory, "Brand" IN shared AS sameBrand
  WITH o, sameSubcategory, sameBrand,
       (CASE WHEN sameSubcategory THEN 2 ELSE 0 END) + (CASE WHEN sameBrand THEN 1 ELSE 0 END) AS score
  ORDER BY score DESC, o.sold DESC
  WITH o.title AS title,
       collect({product: o, sameSubcategory: sameSubcategory, sameBrand: sameBrand, score: score})[0] AS best,
       count(*) AS variants
  WITH best, variants, best.product AS o
  OPTIONAL MATCH (o)-[:MADE_BY]->(b:Brand)
  OPTIONAL MATCH (o)-[:IN_SUBCATEGORY]->(s:Subcategory)
  RETURN o.id AS id, o.title AS title, b.name AS brand, s.name AS subcategory,
         o.salePrice AS price, o.rating AS rating, o.sold AS sold,
         best.sameSubcategory AS sameSubcategory, best.sameBrand AS sameBrand, variants
  ORDER BY best.score DESC, o.sold DESC
  LIMIT $limit`;

type RelatedRow = {
  id: string;
  title: string;
  brand: string | null;
  subcategory: string | null;
  price: number;
  rating: number;
  sold: number;
  sameSubcategory: boolean;
  sameBrand: boolean;
  variants: number;
};

export const findRelatedProducts = tool(
  ({ productId, limit }, runtime: Runtime) =>
    graphSafely(async () => {
      status(runtime, "Finding related products…");
      const rows = await runRead<RelatedRow>(RELATED_PRODUCTS, { id: productId, limit: int(limit) });
      if (!rows.length) {
        const [found] = await runRead(`MATCH (p:Product {id: $id}) RETURN p.id AS id`, { id: productId });
        return result(
          found
            ? { related: [], message: "Nothing related is in stock right now." }
            : { error: "not_found", message: "That product isn't in the catalog graph. Find its id with search_products." },
        );
      }
      return result({
        note: SNAPSHOT_NOTE,
        related: rows.map(({ sameSubcategory, sameBrand, variants, ...r }) => ({
          ...r,
          url: `/product/${r.id}`,
          why: sameSubcategory && sameBrand ? "same type and brand" : sameSubcategory ? "same type" : "same brand",
          ...(variants > 1 ? { otherListings: variants - 1 } : {}),
        })),
      });
    }),
  {
    name: "find_related_products",
    description:
      "Products related to one product: same subcategory and/or same brand, in stock, best matches and best sellers first. " +
      "Use for 'similar', 'like this', 'alternatives', 'what else', 'goes with'. Needs a product id: get one from search_products first.",
    schema: z.object({
      productId: z.string().describe("Product id from search_products or get_product_details"),
      limit: z.number().int().min(1).max(10).default(5),
    }),
  },
);

const BRAND_OVERVIEW = `
  MATCH (b:Brand) WHERE toLower(b.name) = toLower($name)
  OPTIONAL MATCH (b)<-[:MADE_BY]-(p:Product)-[:IN_SUBCATEGORY]->(s:Subcategory)-[:UNDER]->(c:Category)
  WITH b, c, s, p ORDER BY p.sold DESC
  WITH b, c, s, count(p) AS products, min(p.salePrice) AS minPrice, max(p.salePrice) AS maxPrice,
       collect({id: p.id, title: p.title}) AS ranked
  RETURN b.name AS brand,
         collect(CASE WHEN c IS NULL THEN null ELSE
           {category: c.name, subcategory: s.name, products: products, minPrice: minPrice, maxPrice: maxPrice, ranked: ranked}
         END) AS coverage`;

type BrandRow = {
  brand: string;
  coverage: {
    category: string;
    subcategory: string;
    products: number;
    minPrice: number;
    maxPrice: number;
    ranked: { id: string; title: string }[];
  }[];
};

/** Best sellers first, one entry per title, at most n. */
const topUnique = (items: { id: string; title: string }[], n: number) =>
  items.filter((x, i) => items.findIndex((y) => y.title === x.title) === i).slice(0, n);

export const getBrandOverview = tool(
  ({ brandName }, runtime: Runtime) =>
    graphSafely(async () => {
      status(runtime, `Looking at ${brandName}…`);
      const [row] = await runRead<BrandRow>(BRAND_OVERVIEW, { name: brandName });
      if (!row) return result({ error: "not_found", message: `No brand named “${brandName}”. list_brands shows them all.` });
      if (!row.coverage.length) return result({ brand: row.brand, coverage: [], message: "This brand has no products in the store right now." });
      return result({
        note: SNAPSHOT_NOTE,
        brand: row.brand,
        coverage: row.coverage
          .sort((a, b) => b.products - a.products)
          .map(({ ranked, ...c }) => ({
            ...c,
            bestSellers: topUnique(ranked, 3).map((p) => ({ ...p, url: `/product/${p.id}` })),
          })),
      });
    }),
  {
    name: "get_brand_overview",
    description:
      "What one brand sells here: each category and subcategory it covers, with product counts, price range and best sellers. " +
      "Use for 'what does <brand> sell', 'does <brand> make <type>', 'tell me about <brand>'.",
    schema: z.object({ brandName: z.string().describe("Brand name, e.g. DeFacto. Case doesn't matter.") }),
  },
);

const CATEGORY_BRANDS = `
  MATCH (c:Category) WHERE toLower(c.name) CONTAINS toLower($category)
  OPTIONAL MATCH (c)<-[:BELONGS_TO]-(p:Product)-[:MADE_BY]->(b:Brand)
  OPTIONAL MATCH (p)-[:IN_SUBCATEGORY]->(s:Subcategory)
  WITH c, b, count(DISTINCT p) AS products, avg(p.rating) AS avgRating,
       min(p.salePrice) AS minPrice, max(p.salePrice) AS maxPrice, collect(DISTINCT s.name) AS subcategories
  ORDER BY products DESC
  RETURN c.name AS category,
         collect(CASE WHEN b IS NULL THEN null ELSE
           {brand: b.name, products: products, avgRating: round(avgRating * 10) / 10.0,
            minPrice: minPrice, maxPrice: maxPrice, subcategories: subcategories}
         END) AS brands`;

export const getCategoryBrands = tool(
  ({ category }, runtime: Runtime) =>
    graphSafely(async () => {
      status(runtime, "Comparing brands…");
      const rows = await runRead(CATEGORY_BRANDS, { category });
      if (!rows.length) return result({ error: "not_found", message: `No category matching “${category}”. list_categories shows them all.` });
      return result({ note: SNAPSHOT_NOTE, categories: rows });
    }),
  {
    name: "get_category_brands",
    description:
      "Brands that sell in a category, with product counts, average rating, price range and the subcategories each covers. " +
      "Use to compare brands or suggest one ('which brands sell electronics?', 'best brand for men's clothes').",
    schema: z.object({ category: z.string().describe("Category name or part of it, e.g. Electronics, Men's Fashion") }),
  },
);

export const graphTools = [findRelatedProducts, getBrandOverview, getCategoryBrands];
