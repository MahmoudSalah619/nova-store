/**
 * The single source of truth for what the assistant may say about the store.
 * The system prompt and the store-info tool both read from here, so a policy changes in one place.
 * Only list facts the site actually does. If a fact isn't here, the assistant says it doesn't know.
 */
export const STORE = {
  name: "Nova",
  assistantName: "Nova Assistant",
  tagline: "Fashion and electronics from the brands you love.",
  currency: "EGP",
  sells: "fashion (men's and women's) and electronics, from brands such as DeFacto, Puma, Dell, Lenovo, Canon and Sony",

  policies: {
    payment: "Orders are paid cash on delivery. Card payment isn't available on the site.",
    shipping:
      "Delivery is to cities in Egypt. Any shipping cost or tax is set by the store when the order is placed, and the order confirmation shows the final amount to pay.",
    returns: "Returns are accepted within 30 days of delivery.",
    account:
      "An account is needed to save a wishlist, place orders and see order history. Sign in or register at /login.",
    orders:
      "Orders are placed from the checkout page (/checkout) while signed in. Placed orders appear under My orders (/orders) with their payment and delivery status.",
    cart: "The cart is saved in this browser. It isn't shared across devices.",
    contact:
      "There is no phone or email support listed on the site. For anything the assistant can't do, the user should use the pages on the site.",
  },

  /** Pages the assistant can link to or open. */
  pages: {
    home: { path: "/", description: "Home page with best sellers and categories" },
    shop: { path: "/shop", description: "All products with category, brand, search and sort filters" },
    cart: { path: "/cart", description: "The shopping cart" },
    checkout: { path: "/checkout", description: "Place a cash-on-delivery order (requires sign-in)" },
    wishlist: { path: "/wishlist", description: "Saved products (requires sign-in)" },
    orders: { path: "/orders", description: "Order history (requires sign-in)" },
    login: { path: "/login", description: "Sign in or register" },
  },
} as const;

export type StorePage = keyof typeof STORE.pages;
export type PolicyTopic = keyof typeof STORE.policies;

/** The fixed reply for anything outside the store. Deterministic on purpose: no model call decides its wording. */
export const OUT_OF_SCOPE_REPLY =
  `I'm the ${STORE.name} shopping assistant, so I can only help with things on this store: ` +
  "finding products, prices and stock, your cart, wishlist and orders, and how shopping here works. " +
  "What can I help you find?";
