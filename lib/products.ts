export type Category = "Audio" | "Home" | "Wearables" | "Accessories";

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  category: Category;
  rating: number;
  reviews: number;
  colors: { name: string; hex: string }[];
  features: string[];
  /** Two-stop gradient used for the product artwork. */
  palette: [string, string];
  shape: "circle" | "ring" | "pill" | "square" | "arch" | "drop";
  badge?: string;
};

export const categories: Category[] = ["Audio", "Home", "Wearables", "Accessories"];

export const products: Product[] = [
  {
    slug: "orbit-headphones",
    name: "Orbit Headphones",
    tagline: "Wireless over-ear with adaptive noise cancelling",
    description:
      "Orbit wraps you in quiet. Plush memory-foam cushions, 40-hour battery life and adaptive noise cancelling that tunes itself to the room you're in. Fold them flat and they slip into the included travel case.",
    price: 249,
    category: "Audio",
    rating: 4.8,
    reviews: 1284,
    colors: [
      { name: "Graphite", hex: "#2b2b2e" },
      { name: "Sand", hex: "#d9cbb3" },
      { name: "Sage", hex: "#9fb19a" },
    ],
    features: ["40-hour battery", "Adaptive ANC", "USB-C fast charge", "Multipoint Bluetooth 5.4"],
    palette: ["#ffb199", "#ff6a88"],
    shape: "ring",
    badge: "Bestseller",
  },
  {
    slug: "pulse-earbuds",
    name: "Pulse Earbuds",
    tagline: "Tiny buds, big sound",
    description:
      "Pulse fits in the coin pocket of your jeans and still delivers full, warm sound. Sweat resistant, with a case that adds three full charges.",
    price: 129,
    category: "Audio",
    rating: 4.6,
    reviews: 842,
    colors: [
      { name: "Snow", hex: "#f1f1ee" },
      { name: "Midnight", hex: "#1f2937" },
    ],
    features: ["8h + 24h with case", "IPX5 sweat resistant", "Wireless charging case", "Transparency mode"],
    palette: ["#a1c4fd", "#c2e9fb"],
    shape: "pill",
  },
  {
    slug: "halo-lamp",
    name: "Halo Lamp",
    tagline: "Soft, dimmable light for any corner",
    description:
      "A hand-finished ceramic base topped with a frosted glass globe. Halo dims smoothly from a candle glow to bright reading light with a single touch.",
    price: 89,
    category: "Home",
    rating: 4.9,
    reviews: 412,
    colors: [
      { name: "Chalk", hex: "#efe9e1" },
      { name: "Terracotta", hex: "#c46a4a" },
    ],
    features: ["Touch dimming", "Warm 2700K LED", "Ceramic base", "Rechargeable, cord-free"],
    palette: ["#fddb92", "#f6a36b"],
    shape: "circle",
    badge: "New",
  },
  {
    slug: "drift-diffuser",
    name: "Drift Diffuser",
    tagline: "Ultrasonic aroma diffuser",
    description:
      "Drift fills a room with a fine, cool mist and a gentle scent. Whisper quiet, with an auto shut-off and a soft ambient light ring.",
    price: 59,
    category: "Home",
    rating: 4.5,
    reviews: 298,
    colors: [
      { name: "Stone", hex: "#bfb8ad" },
      { name: "Oak", hex: "#a57c52" },
    ],
    features: ["8-hour runtime", "Auto shut-off", "Ambient light ring", "Under 25 dB"],
    palette: ["#d4fc79", "#96e6a1"],
    shape: "drop",
  },
  {
    slug: "tempo-watch",
    name: "Tempo Watch",
    tagline: "A smartwatch that looks like a watch",
    description:
      "Tempo pairs a classic analog face with a hidden e-ink display for notifications, steps and sleep. Two weeks of battery, sapphire glass, and nothing you have to charge every night.",
    price: 199,
    category: "Wearables",
    rating: 4.7,
    reviews: 655,
    colors: [
      { name: "Silver", hex: "#c9ccd1" },
      { name: "Black", hex: "#222" },
      { name: "Gold", hex: "#c9a86a" },
    ],
    features: ["14-day battery", "Sapphire glass", "Sleep & step tracking", "Water resistant 5 ATM"],
    palette: ["#c3cfe2", "#8e9eab"],
    shape: "circle",
  },
  {
    slug: "loop-band",
    name: "Loop Band",
    tagline: "Screenless fitness tracker",
    description:
      "No screen, no distractions. Loop quietly tracks heart rate, recovery and sleep and shows it all in the app when you want it.",
    price: 99,
    category: "Wearables",
    rating: 4.4,
    reviews: 377,
    colors: [
      { name: "Coral", hex: "#ff7f6e" },
      { name: "Ink", hex: "#253047" },
    ],
    features: ["7-day battery", "Continuous heart rate", "Recovery score", "Knit strap"],
    palette: ["#fbc2eb", "#a6c1ee"],
    shape: "ring",
  },
  {
    slug: "carry-tote",
    name: "Carry Tote",
    tagline: "Recycled canvas everyday tote",
    description:
      "Made from 100% recycled canvas with a padded laptop sleeve and a magnetic top closure. Big enough for the day, light enough to forget it's there.",
    price: 69,
    category: "Accessories",
    rating: 4.7,
    reviews: 521,
    colors: [
      { name: "Natural", hex: "#e8dfcf" },
      { name: "Olive", hex: "#6b7250" },
      { name: "Navy", hex: "#2a3550" },
    ],
    features: ["Recycled canvas", 'Fits 16" laptop', "Magnetic closure", "Water-resistant base"],
    palette: ["#e0c3fc", "#8ec5fc"],
    shape: "arch",
  },
  {
    slug: "dock-charger",
    name: "Dock Charger",
    tagline: "3-in-1 wireless charging stand",
    description:
      "Charge your phone, earbuds and watch at once on a single weighted aluminium stand. Folds flat for travel.",
    price: 79,
    category: "Accessories",
    rating: 4.6,
    reviews: 433,
    colors: [
      { name: "Space", hex: "#3a3a3c" },
      { name: "Silver", hex: "#d1d3d4" },
    ],
    features: ["15W fast wireless", "Charges 3 devices", "Foldable design", "Aluminium body"],
    palette: ["#84fab0", "#8fd3f4"],
    shape: "square",
    badge: "Sale",
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export const SHIPPING_FREE_OVER = 150;
export const SHIPPING_FLAT = 9;
export const TAX_RATE = 0.08;

export function orderTotals(subtotal: number) {
  const shipping = subtotal === 0 || subtotal >= SHIPPING_FREE_OVER ? 0 : SHIPPING_FLAT;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}
