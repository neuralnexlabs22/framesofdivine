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

function mapRowToDevotionalProduct(row: any): DevotionalProduct {
  const slug =
    row.slug ||
    (row.id.startsWith("prod-") ? row.id.replace("prod-", "") : row.id);
  const images = Array.isArray(row.images)
    ? row.images
    : typeof row.images === "string"
    ? [row.images]
    : [];

  return {
    id: row.id,
    slug,
    name: row.name,
    category: row.category || "Deity Paintings",
    price: Number(row.price) || 1,
    originalPrice: row.original_price
      ? Number(row.original_price)
      : Math.round((Number(row.price) || 1) * 1.35),
    description:
      row.description ||
      `Authentic 22KT gold Tanjore devotional artwork: ${row.name}`,
    image: images[0] || devotionalAssets.deityMontage.src,
    imageAlt: row.name,
    badge: row.brand || row.category || "Tanjore Artwork",
    size:
      (Array.isArray(row.sizes) && row.sizes[0]) ||
      "12 x 18 in / 22KT Gold Tanjore",
  };
}

export async function getDevotionalProductAsync(
  slug: string
): Promise<DevotionalProduct | undefined> {
  // 1. Check in static array first
  const staticProduct = getDevotionalProduct(slug);
  if (staticProduct) return staticProduct;

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

  return undefined;
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

  const cleanCat = categorySlug.toLowerCase().trim();
  return allProducts.filter((product) => {
    const cat = product.category.toLowerCase();
    return (
      cat.includes(cleanCat) ||
      cat.replace(/\s+/g, "-") === cleanCat ||
      (cleanCat === "deity-prints" && cat.includes("deity")) ||
      (cleanCat === "temple-prints" && cat.includes("temple")) ||
      (cleanCat === "sculpture-prints" && cat.includes("sculpture")) ||
      (cleanCat === "premium-sets" && cat.includes("set"))
    );
  });
}
