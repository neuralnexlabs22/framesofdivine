"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import DevotionalProductCard from "@/components/DevotionalProductCard";
import type { DevotionalProduct } from "@/data/devotionalProducts";
import { useProducts } from "@/context/ProductContext";
import { useCatalog } from "@/context/CatalogContext";

interface ShopProductGridProps {
  initialProducts: DevotionalProduct[];
  categories: { slug: string; name: string }[];
}

export default function ShopProductGrid({ initialProducts, categories }: ShopProductGridProps) {
  const { products: liveProducts, loaded } = useProducts();
  const { categories: catalogCategories } = useCatalog();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");

  // Merge server categories with live catalog categories
  const combinedCategories = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.slug.toLowerCase(), c.name));
    if (catalogCategories && catalogCategories.length > 0) {
      catalogCategories.forEach((c) => {
        if (c.is_active !== false) {
          map.set(c.slug.toLowerCase(), c.name);
        }
      });
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [categories, catalogCategories]);

  // Merge initial products with live Supabase products
  const effectiveProducts: DevotionalProduct[] = useMemo(() => {
    const map = new Map<string, DevotionalProduct>();

    // 1. Initial/static products
    (initialProducts || []).forEach((p) => {
      map.set(p.slug, p);
      map.set(p.id, p);
    });

    // 2. Live Supabase products
    if (loaded && liveProducts.length > 0) {
      liveProducts.forEach((p) => {
        const slug = p.slug || (p.id.startsWith("prod-") ? p.id.replace("prod-", "") : p.id);
        const mapped: DevotionalProduct = {
          id: p.id,
          slug,
          name: p.name,
          category: p.category,
          price: p.price,
          originalPrice: p.originalPrice || Math.round(p.price * 1.35),
          description: p.description,
          image: p.images?.[0] || "/assets/devotional/deity-gallery-montage.png",
          imageAlt: p.name,
          badge: p.brand || p.category,
          size:
            Array.isArray(p.sizes) && p.sizes[0]
              ? typeof p.sizes[0] === "object" && p.sizes[0] !== null
                ? (p.sizes[0] as any).label || "12 x 18 in / 22KT Gold Tanjore"
                : String(p.sizes[0])
              : "12 x 18 in / 22KT Gold Tanjore",
        };
        map.set(slug, mapped);
        map.set(p.id, mapped);
      });
    }

    return Array.from(new Set(map.values()));
  }, [liveProducts, loaded, initialProducts]);

  const filteredAndSorted = useMemo(() => {
    return effectiveProducts
      .filter((product) => {
        const targetCat = selectedCategory.toLowerCase();
        const prodCat = product.category.toLowerCase();
        const matchesCategory =
          selectedCategory === "all" ||
          prodCat.includes(targetCat) ||
          prodCat.replace(/\s+/g, "-") === targetCat ||
          (product.badge && product.badge.toLowerCase().includes(targetCat)) ||
          (targetCat === "deity-prints" && prodCat.includes("deity")) ||
          (targetCat === "temple-prints" && prodCat.includes("temple")) ||
          (targetCat === "sculpture-prints" && prodCat.includes("sculpture")) ||
          (targetCat === "premium-sets" && prodCat.includes("set"));

        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          (product.badge && product.badge.toLowerCase().includes(query));

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0; // featured/original order
      });
  }, [effectiveProducts, search, selectedCategory, sortBy]);

  return (
    <div className="space-y-8">
      {/* Search, Filter Pills & Sorting Controls */}
      <div className="flex flex-col gap-4 border-b border-black-deep/10 pb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-stone" />
            <input
              type="text"
              placeholder="Search deities, temples, or themes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white-pure border border-black-deep/20 py-2.5 pl-10 pr-4 text-xs text-black-deep placeholder-grey-stone focus:border-black-deep focus:outline-none transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-grey-stone" />
            <label htmlFor="sort-select" className="text-xs text-grey-stone uppercase tracking-wider font-semibold">
              Sort:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white-pure border border-black-deep/20 py-2.5 px-3 text-xs text-black-deep font-semibold focus:border-black-deep focus:outline-none transition-colors cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Deity Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
              selectedCategory === "all"
                ? "bg-black-deep text-white border-black-deep shadow-sm"
                : "bg-white-pure text-black-deep border-black-deep/20 hover:border-black-deep/40"
            }`}
          >
            All Paintings ({effectiveProducts.length})
          </button>
          {combinedCategories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
                selectedCategory === cat.slug
                  ? "bg-black-deep text-white border-black-deep shadow-sm"
                  : "bg-white-pure text-black-deep border-black-deep/20 hover:border-black-deep/40"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-grey-stone">
        <p>
          Showing <span className="font-bold text-black-deep">{filteredAndSorted.length}</span> sacred devotional paintings
        </p>
        {(search || selectedCategory !== "all" || sortBy !== "featured") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setSortBy("featured");
            }}
            className="text-[11px] underline uppercase tracking-wider text-black-deep"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Product Cards Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="py-20 text-center border border-black-deep/10 bg-white-pure p-8">
          <Sparkles className="mx-auto h-8 w-8 text-[#c9a227] mb-3" />
          <h3 className="font-serif text-xl uppercase text-black-deep">No devotional paintings found</h3>
          <p className="mt-2 text-xs text-black-charcoal/70 max-w-md mx-auto">
            Try adjusting your search query or selecting a different category above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {filteredAndSorted.map((product) => (
            <DevotionalProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
