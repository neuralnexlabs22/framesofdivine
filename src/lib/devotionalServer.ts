import { supabaseQuery } from "@/lib/supabaseDb";
import {
  devotionalCategories,
  devotionalProducts,
  getDevotionalProduct,
  type DevotionalProduct,
} from "@/data/devotionalProducts";
import { devotionalAssets } from "@/data/devotional";

export type DevotionalCategory = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

function extractCategoryAndDescription(row: any): { category: string; description: string } {
  let cat = row.category_id || row.category || "Deity Paintings";
  let desc = row.description || "";
  if (desc) {
    const match = desc.match(/<!--category:(.*?)-->/);
    if (match) {
      cat = match[1];
      desc = desc.replace(/<!--category:.*?-->\s*/, "");
    }
  }
  return { category: cat, description: desc };
}

function mapRowToDevotionalProduct(row: any): DevotionalProduct {
  const slug =
    row.slug ||
    (row.id.startsWith("prod-") ? row.id.replace("prod-", "") : row.id);
  const images = Array.isArray(row.images)
    ? row.images
    : typeof row.images === "string"
    ? [row.images]
    : [];

  const { category, description } = extractCategoryAndDescription(row);

  let frameModels: any[] = [];
  if (Array.isArray(row.frame_models)) {
    frameModels = row.frame_models;
  } else if (typeof row.description === "string" && row.description.includes("<!--frame_models:")) {
    const match = row.description.match(/<!--frame_models:(.*?)-->/);
    if (match) {
      try {
        frameModels = JSON.parse(match[1]);
      } catch {}
    }
  }

  let estimatedDeliveryDays = row.estimated_delivery_days || "5-7 business days";
  let deliveryFee = Number(row.delivery_fee || 0);
  let isReadyStock = Boolean(row.is_ready_stock);
  let deliveryMinDays = typeof row.delivery_min_days === "number" ? row.delivery_min_days : undefined;
  let deliveryMaxDays = typeof row.delivery_max_days === "number" ? row.delivery_max_days : undefined;

  if (typeof row.description === "string") {
    if (row.description.includes("<!--delivery_days:")) {
      const match = row.description.match(/<!--delivery_days:(.*?)-->/);
      if (match) estimatedDeliveryDays = match[1];
    }
    if (row.description.includes("<!--delivery_fee:")) {
      const match = row.description.match(/<!--delivery_fee:(.*?)-->/);
      if (match) deliveryFee = Number(match[1]) || 0;
    }
    if (row.description.includes("<!--ready_stock:true-->")) {
      isReadyStock = true;
    } else if (row.description.includes("<!--ready_stock:false-->")) {
      isReadyStock = false;
    }
    if (row.description.includes("<!--delivery_min_days:")) {
      const match = row.description.match(/<!--delivery_min_days:(\d+)-->/);
      if (match) deliveryMinDays = parseInt(match[1], 10);
    }
    if (row.description.includes("<!--delivery_max_days:")) {
      const match = row.description.match(/<!--delivery_max_days:(\d+)-->/);
      if (match) deliveryMaxDays = parseInt(match[1], 10);
    }
  }

  const stock = typeof row.stock === "number" ? row.stock : 10;
  const firstSize = Array.isArray(row.sizes) && row.sizes[0]
    ? (typeof row.sizes[0] === "object" ? row.sizes[0].label : String(row.sizes[0]))
    : "12 x 18 in / 22KT Gold Tanjore";

  return {
    id: row.id,
    slug,
    name: row.name,
    category,
    price: Number(row.price) || 1,
    originalPrice: row.original_price
      ? Number(row.original_price)
      : Math.round((Number(row.price) || 1) * 1.35),
    description:
      description ||
      `Authentic 22KT gold Tanjore devotional artwork: ${row.name}`,
    image: images[0] || devotionalAssets.deityMontage.src,
    imageAlt: row.name,
    badge: row.brand || category || "Tanjore Artwork",
    size: firstSize,
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    colors: Array.isArray(row.colors) ? row.colors : [],
    materials: Array.isArray(row.materials)
      ? row.materials
      : Array.isArray(row.colors)
      ? row.colors
      : [],
    frame_models: frameModels,
    estimated_delivery_days: estimatedDeliveryDays,
    delivery_fee: deliveryFee,
    is_ready_stock: isReadyStock,
    stock,
    delivery_min_days: deliveryMinDays,
    delivery_max_days: deliveryMaxDays,
  };
}

export async function getDevotionalProductAsync(
  slug: string
): Promise<DevotionalProduct | undefined> {
  // 1. Check in static array first
  const staticProduct = getDevotionalProduct(slug);

  // 2. Query Supabase for dynamic products
  try {
    const encoded = encodeURIComponent(slug);
    const { data } = await supabaseQuery<any[]>("products", {
      query: `or=(slug.eq.${encoded},id.eq.${encoded},id.eq.prod-${encoded})&limit=1`,
      useServiceRole: true,
    });

    if (data && data.length > 0) {
      return mapRowToDevotionalProduct(data[0]);
    }
  } catch (err) {
    console.warn("Error querying dynamic product from Supabase:", err);
  }

  return staticProduct;
}

export async function getDevotionalCategoriesAsync(): Promise<
  DevotionalCategory[]
> {
  const result: DevotionalCategory[] = [...devotionalCategories];
  const seenSlugs = new Set(result.map((c) => c.slug.toLowerCase()));

  try {
    const { data } = await supabaseQuery<any[]>("categories", {
      query: "order=display_order.asc",
      useServiceRole: true,
    });

    if (Array.isArray(data)) {
      for (const cat of data) {
        const catSlug = (cat.slug || "").toLowerCase();
        if (catSlug && !seenSlugs.has(catSlug)) {
          seenSlugs.add(catSlug);
          result.push({
            slug: cat.slug,
            name: cat.name,
            description:
              cat.description ||
              `Sacred devotional paintings and artwork for ${cat.name}.`,
            image: cat.image_url || devotionalAssets.deityMontage.src,
          });
        }
      }
    }
  } catch (err) {
    console.warn("Error querying dynamic categories from Supabase:", err);
  }

  return result;
}

function slugifyCategory(cat: string): string {
  return (cat || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isCategoryMatch(productCategory: string, selectedSlug: string): boolean {
  if (!selectedSlug || selectedSlug === "all") return true;

  const targetSlug = slugifyCategory(selectedSlug);
  const prodCat = (productCategory || "").toLowerCase().trim();
  const prodCatSlug = slugifyCategory(prodCat);

  // Exact match by name or by normalized slug
  if (prodCatSlug === targetSlug || prodCat === selectedSlug.toLowerCase().trim()) {
    return true;
  }

  // Standard preset category aliases (only for standard 4 categories)
  if (targetSlug === "deity-prints" && prodCatSlug.includes("deity")) return true;
  if (targetSlug === "temple-prints" && prodCatSlug.includes("temple")) return true;
  if (targetSlug === "sculpture-prints" && prodCatSlug.includes("sculpture")) return true;
  if (targetSlug === "premium-sets" && (prodCatSlug.includes("premium") || prodCatSlug.includes("set"))) return true;

  return false;
}

export async function getDevotionalProductsAsync(
  categorySlug?: string
): Promise<DevotionalProduct[]> {
  const productMap = new Map<string, DevotionalProduct>();

  // 1. Add static products
  for (const p of devotionalProducts) {
    productMap.set(p.id, p);
    productMap.set(p.slug, p);
  }

  // 2. Fetch dynamic products from Supabase
  try {
    const { data } = await supabaseQuery<any[]>("products", {
      query: "order=created_at.desc",
      useServiceRole: true,
    });

    if (Array.isArray(data)) {
      for (const row of data) {
        const mapped = mapRowToDevotionalProduct(row);
        productMap.set(mapped.id, mapped);
        productMap.set(mapped.slug, mapped);
      }
    }
  } catch (err) {
    console.warn("Error querying dynamic products from Supabase:", err);
  }

  const allProducts = Array.from(new Set(productMap.values()));

  if (!categorySlug || categorySlug === "all") {
    return allProducts;
  }

  // Ready Stock special category check
  if (categorySlug === "ready-stock") {
    return allProducts.filter(
      (product) => Boolean(product.is_ready_stock) && (product.stock ?? 10) > 0
    );
  }

  return allProducts.filter((product) =>
    isCategoryMatch(product.category, categorySlug)
  );
}
