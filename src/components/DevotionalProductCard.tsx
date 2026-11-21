"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, HelpCircle, Scale, ShoppingBag, Zap } from "lucide-react";
import type { DevotionalProduct } from "@/data/devotionalProducts";
import { useCart } from "@/context/CartContext";

function getSafeSize(val: any): string {
  if (!val) return "12 x 18 in";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && val.label) return String(val.label);
  return String(val);
}

export default function DevotionalProductCard({ product }: { product: DevotionalProduct }) {
  const { addItem, openCart } = useCart();

  const sizeString = getSafeSize(product.size);
  const sizeShort = sizeString.split(" / ")[0] || sizeString;

  const discountPercentage =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      size: sizeShort,
      frame: "22KT Gold Tanjore Painting",
      quantity: 1,
    });
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      size: sizeShort,
      frame: "22KT Gold Tanjore Painting",
      quantity: 1,
    });
    openCart();
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col h-full border border-black-deep/15 bg-white-pure overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-black-deep/30"
    >
      {/* Standardized Fixed 4:5 Image Container */}
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-[#120f0c]">
        {product.cropPosition ? (
          <div
            className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-[1200ms] ease-cinematic group-hover:scale-105"
            role="img"
            aria-label={product.imageAlt}
            style={{
              backgroundImage: `url(${product.image})`,
              backgroundPosition: product.cropPosition,
              backgroundSize: "400% 300%",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <Image
              src={product.image}
              alt={product.imageAlt || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain transition-transform duration-[1200ms] ease-cinematic group-hover:scale-105"
            />
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <div className="absolute left-3 top-3 bg-white-pure px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-black-deep shadow-sm pointer-events-none z-10 max-w-[80%] truncate">
            {product.badge}
          </div>
        )}

        {/* Hover Action Icons */}
        <div className="absolute bottom-3 right-3 flex translate-y-3 flex-col gap-1.5 opacity-0 transition-cinematic group-hover:translate-y-0 group-hover:opacity-100 z-10">
          <span className="inline-flex h-8 w-8 items-center justify-center bg-white-pure text-black-deep shadow-sm">
            <Heart className="h-3.5 w-3.5" />
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center bg-white-pure text-black-deep shadow-sm">
            <Scale className="h-3.5 w-3.5" />
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center bg-white-pure text-black-deep shadow-sm">
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* Standardized Content Container */}
      <div className="flex flex-col flex-1 p-4 text-black-deep transition-cinematic group-hover:bg-[#1a1108] group-hover:text-[#f4f0e8]">
        {/* Row 1: Category & Dimensions Tag */}
        <div className="flex items-center justify-between gap-2 h-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-grey-stone group-hover:text-white-ivory/60 truncate font-medium">
            {product.category || "Tanjore Artwork"}
          </p>
          <span className="shrink-0 text-[9px] font-semibold text-black-deep bg-black-deep/5 group-hover:text-white-ivory/70 group-hover:bg-white-pure/10 px-2 py-0.5 rounded-sm">
            {sizeShort}
          </span>
        </div>

        {/* Row 2: Standardized Title Area */}
        <h3 className="mt-2 text-base sm:text-lg font-serif leading-snug line-clamp-2 h-[2.75rem] flex items-start overflow-hidden text-ellipsis">
          {product.name}
        </h3>

        {/* Row 3: Product Dimensions Description */}
        <p className="mt-1 text-xs text-grey-stone/80 line-clamp-1 h-4">
          {sizeString || "Authentic 22KT Gold Tanjore Painting"}
        </p>

        {/* Row 4: Pricing & Discount */}
        <div className="mt-3 flex items-baseline justify-between gap-2 h-6">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm sm:text-base">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {product.originalPrice && product.originalPrice > product.price ? (
              <span className="text-xs text-grey-stone line-through">
                ₹{product.originalPrice.toLocaleString("en-IN")}
              </span>
            ) : null}
          </div>
          {discountPercentage ? (
            <span className="text-[10px] font-bold text-green-700 bg-green-500/10 group-hover:bg-green-500/20 group-hover:text-green-400 px-1.5 py-0.5 rounded">
              {discountPercentage}% OFF
            </span>
          ) : null}
        </div>

        {/* Row 5: Action Buttons (Cart & Buy) Pinned to Bottom */}
        <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex h-9 items-center justify-center gap-1.5 border border-current px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] hover:bg-white-pure hover:text-black-deep transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            <span>Cart</span>
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            className="inline-flex h-9 items-center justify-center gap-1.5 bg-black-deep px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white group-hover:bg-white-pure group-hover:text-black-deep transition-colors"
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>Buy</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
