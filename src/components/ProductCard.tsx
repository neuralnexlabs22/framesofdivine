"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import Image from "next/image";

interface ProductCardProps {
  product: {
    id: string;
    slug?: string;
    name: string;
    brand?: string;
    price: number;
    originalPrice?: number;
    images: string[];
    category: string;
    isNew?: boolean;
    size?: string;
  };
}

function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const discountPercentage =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <div
      className="group flex flex-col h-full border border-black-deep/15 bg-white-pure overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-black-deep/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-[#120f0c]">
        {product.isNew && (
          <span className="absolute top-3 left-3 z-10 bg-white-pure text-black-deep text-[9px] font-semibold uppercase tracking-[0.15em] px-2.5 py-1 shadow-sm">
            NEW
          </span>
        )}
        <Link href={`/products/${product.slug || product.id}`} className="relative block w-full h-full p-2">
          <Image
            src={product.images[0] || "/assets/devotional/deity-gallery-montage.png"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain transition-transform duration-[1200ms] ease-cinematic group-hover:scale-105"
            loading="lazy"
          />
        </Link>
        <div
          className={`absolute bottom-3 right-3 flex gap-1.5 transition-opacity duration-300 z-10 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsWishlisted(!isWishlisted);
            }}
            className="h-8 w-8 inline-flex items-center justify-center bg-white-pure text-black-deep shadow-sm border border-black-deep/10"
            aria-label="Wishlist"
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-current text-red-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4 text-black-deep transition-cinematic group-hover:bg-[#1a1108] group-hover:text-[#f4f0e8]">
        <div className="flex items-center justify-between gap-2 h-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-grey-stone group-hover:text-white-ivory/60 truncate font-medium">
            {product.category || product.brand || "Devotional Artwork"}
          </p>
          {product.size && (
            <span className="shrink-0 text-[9px] font-semibold text-black-deep bg-black-deep/5 group-hover:text-white-ivory/70 group-hover:bg-white-pure/10 px-2 py-0.5 rounded-sm">
              {product.size.split(" / ")[0]}
            </span>
          )}
        </div>

        <Link href={`/products/${product.slug || product.id}`}>
          <h3 className="mt-2 text-base sm:text-lg font-serif leading-snug line-clamp-2 h-[2.75rem] flex items-start overflow-hidden text-ellipsis">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1 text-xs text-grey-stone/80 line-clamp-1 h-4">
          {product.size || "Authentic Tanjore Painting"}
        </p>

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

        <div className="mt-auto pt-4">
          <Link
            href={`/products/${product.slug || product.id}`}
            className="w-full inline-flex h-9 items-center justify-center gap-1.5 bg-black-deep px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white group-hover:bg-white-pure group-hover:text-black-deep transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>View Details</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
