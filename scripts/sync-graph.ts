/**
 * Rebuild the Memgraph catalog graph from the Route API.
 * Safe to run any number of times: every write is a MERGE. See docs/memgraph/README.md, Lesson 9.
 *
 *   npm run graph:sync
 */
import neo4j, { type Session } from "neo4j-driver";
import { salePrice } from "../lib/format";
import { getAllPages, getJSON } from "../lib/store-api";
import type { Brand, Category, ListResponse, Product } from "../lib/types";

const driver = neo4j.driver(
  process.env.MEMGRAPH_URI ?? "bolt://localhost:7687",
  neo4j.auth.basic(process.env.MEMGRAPH_USER ?? "", process.env.MEMGRAPH_PASSWORD ?? ""),
  { disableLosslessIntegers: true },
);

const LABELS = ["Product", "Brand", "Category", "Subcategory"] as const;

async function ensureSchema(session: Session) {
  for (const label of LABELS) {
    // Auto-commit (session.run) is required for schema queries in Memgraph.
    // Re-running them when they already exist is a no-op.
    await session.run(`CREATE CONSTRAINT ON (n:${label}) ASSERT n.id IS UNIQUE`);
    await session.run(`CREATE INDEX ON :${label}(id)`);
  }
}

async function main() {
  const runId = new Date().toISOString();

  // 1. Fetch. If anything fails we throw here, before touching the graph.
  const [products, categories, brands] = await Promise.all([
    getAllPages<Product>("/products"),
    getJSON<ListResponse<Category>>("/categories").then((r) => r.data),
    getAllPages<Brand>("/brands"),
  ]);
  console.log(`Fetched ${products.length} products, ${categories.length} categories, ${brands.length} brands`);

  // 2. Transform API objects into flat rows shaped for the graph.
  const categoryRows = categories.map((c) => ({ id: c._id, name: c.name, slug: c.slug }));
  const brandRows = brands.map((b) => ({ id: b._id, name: b.name, slug: b.slug }));

  // /subcategories is incomplete, so collect them from the products themselves.
  const subMap = new Map<string, { id: string; name: string; slug: string; categoryId: string }>();
  for (const p of products)
    for (const s of p.subcategory)
      subMap.set(s._id, { id: s._id, name: s.name, slug: s.slug, categoryId: s.category });
  const subcategoryRows = [...subMap.values()];

  const productRows = products.map((p) => ({
    id: p._id,
    title: p.title,
    slug: p.slug,
    price: p.price,
    // Same rule as the storefront: the API sends priceAfterDiscount: 0 for "no discount".
    salePrice: salePrice(p),
    rating: p.ratingsAverage,
    ratingsCount: p.ratingsQuantity,
    stock: p.quantity,
    sold: p.sold,
    brandId: p.brand?._id ?? null,
    categoryId: p.category._id,
    subcategoryIds: p.subcategory.map((s) => s._id),
  }));

  const session = driver.session();
  try {
    // 3. Schema
    await ensureSchema(session);

    // 4. Nodes
    await session.run(
      `UNWIND $rows AS row
       MERGE (c:Category {id: row.id})
       SET c.name = row.name, c.slug = row.slug, c.syncedAt = $runId`,
      { rows: categoryRows, runId },
    );
    await session.run(
      `UNWIND $rows AS row
       MERGE (b:Brand {id: row.id})
       SET b.name = row.name, b.slug = row.slug, b.syncedAt = $runId`,
      { rows: brandRows, runId },
    );
    await session.run(
      `UNWIND $rows AS row
       MERGE (s:Subcategory {id: row.id})
       SET s.name = row.name, s.slug = row.slug, s.syncedAt = $runId
       WITH s, row
       MATCH (c:Category {id: row.categoryId})
       MERGE (s)-[:UNDER]->(c)`,
      { rows: subcategoryRows, runId },
    );
    await session.run(
      `UNWIND $rows AS row
       MERGE (p:Product {id: row.id})
       SET p.title = row.title, p.slug = row.slug,
           p.price = row.price, p.salePrice = row.salePrice,
           p.rating = row.rating, p.ratingsCount = toInteger(row.ratingsCount),
           p.stock = toInteger(row.stock), p.sold = toInteger(row.sold),
           p.syncedAt = $runId`,
      { rows: productRows, runId },
    );

    // 5. Edges: clear each product's old links, then write the current ones.
    await session.run(
      `UNWIND $ids AS id
       MATCH (:Product {id: id})-[r:MADE_BY|BELONGS_TO|IN_SUBCATEGORY]->()
       DELETE r`,
      { ids: productRows.map((r) => r.id) },
    );
    await session.run(
      `UNWIND $rows AS row
       MATCH (p:Product {id: row.id}), (c:Category {id: row.categoryId})
       MERGE (p)-[:BELONGS_TO]->(c)`,
      { rows: productRows },
    );
    // Separate query: a missing brand must not block the category edge (Lesson 5.6).
    await session.run(
      `UNWIND $rows AS row
       WITH row WHERE row.brandId IS NOT NULL
       MATCH (p:Product {id: row.id}), (b:Brand {id: row.brandId})
       MERGE (p)-[:MADE_BY]->(b)`,
      { rows: productRows },
    );
    await session.run(
      `UNWIND $rows AS row
       UNWIND row.subcategoryIds AS subId
       MATCH (p:Product {id: row.id}), (s:Subcategory {id: subId})
       MERGE (p)-[:IN_SUBCATEGORY]->(s)`,
      { rows: productRows },
    );

    // 6. Stale nodes: anything this run didn't touch is gone from the API.
    //    `IS NULL` matters: null <> $runId is null (not true), so nodes without syncedAt would survive.
    const stale = await session.run(
      `MATCH (n)
       WHERE (n:Product OR n:Brand OR n:Category OR n:Subcategory)
         AND (n.syncedAt IS NULL OR n.syncedAt <> $runId)
       DETACH DELETE n
       RETURN count(*) AS removed`,
      { runId },
    );
    console.log(`Removed ${stale.records[0].get("removed")} stale nodes`);

    // 7. Verify
    const nodes = await session.run(`MATCH (n) RETURN labels(n)[0] AS label, count(*) AS n ORDER BY label`);
    for (const r of nodes.records) console.log(`  ${r.get("label")}: ${r.get("n")}`);
    const edges = await session.run(`MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS n ORDER BY type`);
    for (const r of edges.records) console.log(`  -[:${r.get("type")}]->: ${r.get("n")}`);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
