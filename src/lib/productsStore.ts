import { products as defaultProducts } from "@/data/products";
import type { Product } from "@/context/ProductContext";

const STORAGE_KEY = "frames_of_divine_products";
const LEGACY_STORAGE_KEY = "colour_seven_products";
let memoryCache: Product[] | null = null;

const FASHION_CATEGORIES = new Set(["Watches", "Shoes", "Clothing", "Accessories"]);
const FASHION_NAMES = [
  "OVERSIZED HOODIE",
  "NIKE AIR FORCE 1 '07",
  "OUTLAW CHRONO WATCH",
  "OUTLAW CAP",
  "GRAPHIC OVERSIZED TEE",
  "CUBAN CHAIN SILVER",
  "CLASSIC GOLDEN CHRONOGRAPH",
  "STREETWEAR SNEAKERS",
  "DISTRESSED STREETWEAR JOGGER",
  "OUTLAW KNIT BEANIE",
  "RETRO DIVE WATCH",
  "OUTLAW DUFFLE BAG"
];

function isFashionProduct(product: Partial<Product>): boolean {
  if (product.brand === "Colour Seven") return true;
  if (product.category && FASHION_CATEGORIES.has(product.category)) return true;
  if (product.name && FASHION_NAMES.some((n) => product.name?.toLowerCase().includes(n.toLowerCase()))) return true;
  return false;
}

function buildDefaultProducts(): Product[] {
  return defaultProducts
    .map((product) => ({
      ...product,
      brand: product.brand || "Frames of Divine",
      stock: product.stock ?? 15,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
}

function readProducts(): Product[] {
  if (typeof window === "undefined") return buildDefaultProducts();

  try {
    // Clean up legacy storage key
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaults = buildDefaultProducts();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }

    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      // Purge any fashion products
      const sanitized = (parsed as Product[]).filter((p) => !isFashionProduct(p));
      if (sanitized.length === 0) {
        const defaults = buildDefaultProducts();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
        return defaults;
      }
      // If we filtered out some fashion products, save the cleaned list
      if (sanitized.length !== parsed.length) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return buildDefaultProducts();
}

function saveProducts(products: Product[]): void {
  memoryCache = products;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    throw new Error("Could not save products in this browser. Check available local storage space.");
  }
}

export async function loadProducts(force = false): Promise<Product[]> {
  if (memoryCache && !force) return memoryCache;

  // Attempt to fetch fresh products from Supabase API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.products) && json.products.length > 0) {
          saveProducts(json.products);
          return json.products;
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote products, falling back to local:", e);
    }
  }

  memoryCache = readProducts();
  return memoryCache;
}

export function getProductsSync(): Product[] {
  return memoryCache || readProducts();
}

export function invalidateProductsCache(): void {
  memoryCache = null;
}

export async function refreshProducts(): Promise<Product[]> {
  return loadProducts(true);
}

export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  const price = Number(product.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a valid non-negative number");
  }

  const slug =
    (product as any).slug ||
    product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  let created: Product = {
    ...product,
    price,
    slug,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };

  // Persist directly to Supabase database via server API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.product) {
          created = json.product;
        }
      }
    } catch (e) {
      console.warn("Failed to persist product to Supabase:", e);
    }
  }

  saveProducts([...getProductsSync().filter((p) => p.id !== created.id), created]);
  return created;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const products = getProductsSync();
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) throw new Error("Product not found");

  if (updates.price !== undefined && (!Number.isFinite(Number(updates.price)) || Number(updates.price) < 0)) {
    throw new Error("Price must be a valid non-negative number");
  }

  if (typeof window !== "undefined") {
    try {
      await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn("Failed to patch product in Supabase:", e);
    }
  }

  const updated = products.map((product) =>
    product.id === id ? { ...product, ...updates } : product
  );
  saveProducts(updated);
}

export async function deleteProduct(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Failed to delete product from Supabase:", e);
    }
  }
  saveProducts(getProductsSync().filter((product) => product.id !== id));
}