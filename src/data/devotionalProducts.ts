import { artworks, deities, devotionalAssets } from "@/data/devotional";

export type ProductOptionVariant = {
  label: string;
  priceDelta: number;
};

export type DevotionalProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  imageAlt: string;
  cropPosition?: string;
  badge: string;
  size: string;
  sizes?: Array<ProductOptionVariant | string>;
  colors?: Array<ProductOptionVariant | string>;
  materials?: Array<ProductOptionVariant | string>;
  frame_models?: Array<ProductOptionVariant | string>;
  frameModel?: string;
  estimated_delivery_days?: string;
  delivery_fee?: number;
  is_ready_stock?: boolean;
  stock?: number;
  delivery_min_days?: number;
  delivery_max_days?: number;
};

export const devotionalCategories = [
  {
    slug: "deity-prints",
    name: "Deity Paintings",
    description: "100% handcrafted 22KT gold leaves Tanjore paintings.",
    image: devotionalAssets.deityMontage.src,
  },
  {
    slug: "temple-prints",
    name: "Temple Paintings",
    description: "Sacred temple gopurams and sanctum architectural paintings.",
    image: devotionalAssets.temple.src,
  },
  {
    slug: "sculpture-prints",
    name: "Sculpture Paintings",
    description: "Yali pillars, bronze icons, and sacred deity paintings.",
    image: devotionalAssets.sculptures.src,
  },
  {
    slug: "premium-sets",
    name: "Premium Sets",
    description: "Curated devotional photo sets for pooja rooms and gifting.",
    image: devotionalAssets.hero.src,
  },
];

export const devotionalProducts: DevotionalProduct[] = [
  ...deities.slice(0, 8).map((deity, index) => ({
    id: deity.slug,
    slug: deity.slug,
    name: `${deity.name} Tanjore Painting`,
    category: "Deity Paintings",
    price: 899 + index * 50,
    originalPrice: 1299 + index * 75,
    description: deity.description,
    image: deity.image.src,
    imageAlt: deity.name,
    cropPosition: deity.cropPosition,
    badge: deity.sacredTitle || "Devotional",
    size: "12 x 18 in / Authentic 22KT Gold Leaf",
    is_ready_stock: index < 3, // Initial authentic ready stock
    stock: index < 3 ? 8 : 15,
  })),
  {
    id: "temple-heritage-gopuram",
    slug: "temple-heritage-gopuram",
    name: "Sacred Temple Gopuram Painting",
    category: "Temple Paintings",
    price: 1199,
    originalPrice: 1699,
    description: "A dramatic sacred temple architecture painting featuring gopuram forms, carved stone, and dawn light.",
    image: devotionalAssets.temple.src,
    imageAlt: devotionalAssets.temple.alt,
    badge: "Temple",
    size: "16 x 24 in / Authentic 22KT Gold Leaf",
    is_ready_stock: true,
    stock: 5,
  },
  {
    id: "sacred-yali-sculpture",
    slug: "sacred-yali-sculpture",
    name: "Sacred Yali Sculpture Painting",
    category: "Sculpture Paintings",
    price: 1299,
    originalPrice: 1799,
    description: "A gallery-style painting of yali pillars, Chola-inspired bronze icons, and sacred stone reliefs.",
    image: devotionalAssets.sculptures.src,
    imageAlt: devotionalAssets.sculptures.alt,
    badge: "Sculpture",
    size: "16 x 24 in / Authentic 22KT Gold Leaf",
    is_ready_stock: false,
    stock: 10,
  },
  ...artworks.map((artwork, index) => ({
    id: artwork.slug,
    slug: artwork.slug,
    name: `${artwork.title} Premium Artwork`,
    category: index === 2 ? "Temple Paintings" : "Premium Sets",
    price: 1499 + index * 200,
    originalPrice: 2199 + index * 250,
    description: artwork.description,
    image: artwork.image.src,
    imageAlt: artwork.title,
    badge: artwork.type,
    size: "Premium framed option available",
    is_ready_stock: index === 0,
    stock: index === 0 ? 4 : 10,
  })),
];

import { products as catalogProducts } from "@/data/products";

export function getDevotionalProduct(slug: string): DevotionalProduct | undefined {
  const existing = devotionalProducts.find((product) => product.slug === slug || product.id === slug);
  if (existing) return existing;

  const catalogItem = catalogProducts.find(
    (p) =>
      p.id === slug ||
      p.id === `prod-${slug}` ||
      p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === slug
  );
  if (catalogItem) {
    return {
      id: catalogItem.id,
      slug,
      name: catalogItem.name,
      category: catalogItem.category,
      price: catalogItem.price,
      originalPrice: catalogItem.originalPrice || Math.round(catalogItem.price * 1.35),
      description: catalogItem.description,
      image: catalogItem.images?.[0] || "/assets/devotional/deity-gallery-montage.png",
      imageAlt: catalogItem.name,
      badge: catalogItem.brand || catalogItem.category,
      size: catalogItem.sizes?.[0] || "12 x 18 in / Authentic Tanjore Painting",
      is_ready_stock: Boolean((catalogItem as any).is_ready_stock),
      stock: catalogItem.stock ?? 10,
    };
  }
  return undefined;
}

export function getProductsByCategory(categorySlug: string) {
  if (categorySlug === "ready-stock") {
    return devotionalProducts.filter((product) => Boolean(product.is_ready_stock) && (product.stock ?? 10) > 0);
  }
  const category = devotionalCategories.find((item) => item.slug === categorySlug);
  if (!category) return [];
  return devotionalProducts.filter((product) => product.category === category.name);
}
