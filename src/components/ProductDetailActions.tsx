"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, MessageSquare, Plus, Minus, Check, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useContactInfo } from "@/context/ContactInfoContext";
import type { DevotionalProduct, ProductOptionVariant } from "@/data/devotionalProducts";

type OptionItem = {
  label: string;
  priceDelta: number;
};

const defaultMaterialOptions: OptionItem[] = [
  { label: "22 Carat Exclusive", priceDelta: 0 },
  { label: "24 Carat Exclusive", priceDelta: 2000 },
];

const defaultSizeOptions: OptionItem[] = [
  { label: "13 × 15 inches", priceDelta: 0 },
  { label: "15 × 18 inches", priceDelta: 500 },
  { label: "17 × 21 inches", priceDelta: 1200 },
  { label: "20 × 24 inches", priceDelta: 2200 },
  { label: "22 × 28 inches", priceDelta: 3400 },
];

function parseOptionItem(item: any): OptionItem | null {
  if (!item) return null;
  if (typeof item === "object" && item.label) {
    return {
      label: String(item.label).trim(),
      priceDelta: Number(item.priceDelta) || 0,
    };
  }
  const str = String(item).trim();
  if (!str) return null;

  // Check if string contains price delta like "15 × 18 inches (+500)" or "15 × 18 inches (+₹500)"
  const deltaMatch = str.match(/\(\s*\+\s*(?:₹|Rs\.?)?\s*(\d+)\s*\)/i);
  if (deltaMatch) {
    const cleanLabel = str.replace(/\(\s*\+\s*(?:₹|Rs\.?)?\s*\d+\s*\)/i, "").trim();
    return {
      label: cleanLabel,
      priceDelta: Number(deltaMatch[1]) || 0,
    };
  }

  return { label: str, priceDelta: 0 };
}

export default function ProductDetailActions({ product }: { product: DevotionalProduct }) {
  const { addItem, openCart } = useCart();
  const { contactInfo } = useContactInfo();
  const whatsappNumber = contactInfo?.whatsapp_number || "8122228386";

  const sizeOptions: OptionItem[] = useMemo(() => {
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      const parsed = product.sizes
        .map(parseOptionItem)
        .filter((x): x is OptionItem => Boolean(x && x.label));
      if (parsed.length > 0) return parsed;
    }
    return defaultSizeOptions;
  }, [product.sizes]);

  const materialOptions: OptionItem[] = useMemo(() => {
    const list = product.materials && product.materials.length > 0
      ? product.materials
      : product.colors && product.colors.length > 0
      ? product.colors
      : [];
    if (Array.isArray(list) && list.length > 0) {
      const parsed = list
        .map(parseOptionItem)
        .filter((x): x is OptionItem => Boolean(x && x.label));
      if (parsed.length > 0) return parsed;
    }
    return defaultMaterialOptions;
  }, [product.materials, product.colors]);

  const [selectedMaterial, setSelectedMaterial] = useState<OptionItem>(
    () => materialOptions[0] || defaultMaterialOptions[0]
  );
  const [selectedSize, setSelectedSize] = useState<OptionItem>(
    () => sizeOptions[0] || defaultSizeOptions[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Sync if options change
  const activeMaterial = materialOptions.find((m) => m.label === selectedMaterial.label) || materialOptions[0] || defaultMaterialOptions[0];
  const activeSize = sizeOptions.find((s) => s.label === selectedSize.label) || sizeOptions[0] || defaultSizeOptions[0];

  const unitPrice = product.price + (activeMaterial?.priceDelta || 0) + (activeSize?.priceDelta || 0);
  const originalPrice = product.originalPrice
    ? product.originalPrice + (activeMaterial?.priceDelta || 0) + (activeSize?.priceDelta || 0)
    : undefined;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: unitPrice,
      originalPrice,
      image: product.image,
      size: activeSize.label,
      frame: activeMaterial.label,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWhatsAppOrder = () => {
    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, "");
    const msg = `*🕉️ ORDER INQUIRY — TANJORE PAINTINGS*\n\n` +
      `Product: *${product.name}*\n` +
      `Material / Framing: ${activeMaterial.label}${activeMaterial.priceDelta > 0 ? ` (+₹${activeMaterial.priceDelta.toLocaleString("en-IN")})` : ""}\n` +
      `Size: ${activeSize.label}${activeSize.priceDelta > 0 ? ` (+₹${activeSize.priceDelta.toLocaleString("en-IN")})` : ""}\n` +
      `Quantity: ${quantity}\n` +
      `Calculated Unit Price: ₹${unitPrice.toLocaleString("en-IN")}\n` +
      `Total Amount: ₹${(unitPrice * quantity).toLocaleString("en-IN")}\n\n` +
      `Please confirm availability, framing finish, and dispatch timeline. Thank you! 🙏`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Price Display */}
      <div className="flex items-end gap-3 pt-2">
        <span className="font-serif text-4xl text-black-deep">
          ₹{unitPrice.toLocaleString("en-IN")}
        </span>
        {originalPrice && (
          <span className="pb-1 text-sm text-grey-stone line-through">
            ₹{originalPrice.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      {/* Material / Framing Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.25em] text-grey-stone font-bold block">
            Material / Framing
          </span>
          {activeMaterial.priceDelta > 0 && (
            <span className="text-[11px] font-semibold text-[#a8661f]">
              +{`₹${activeMaterial.priceDelta.toLocaleString("en-IN")}`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {materialOptions.map((opt) => {
            const isSelected = activeMaterial.label === opt.label;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSelectedMaterial(opt)}
                className={`px-3.5 py-2 text-xs md:text-sm border rounded-sm transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "border-black-deep bg-black-deep !text-white font-semibold shadow-sm"
                    : "border-black-deep/20 text-black-deep hover:border-black-deep/60 bg-white"
                }`}
              >
                <span>{opt.label}</span>
                {opt.priceDelta > 0 && (
                  <span className={isSelected ? "text-[#e8c75d] text-[11px] font-medium" : "text-amber-800 text-[11px] font-medium"}>
                    (+₹{opt.priceDelta.toLocaleString("en-IN")})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.25em] text-grey-stone font-bold block">
            Dimension / Size
          </span>
          {activeSize.priceDelta > 0 && (
            <span className="text-[11px] font-semibold text-[#a8661f]">
              +{`₹${activeSize.priceDelta.toLocaleString("en-IN")}`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((opt) => {
            const isSelected = activeSize.label === opt.label;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSelectedSize(opt)}
                className={`px-3.5 py-2 text-xs md:text-sm border rounded-sm transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "border-black-deep bg-black-deep !text-white font-semibold shadow-sm"
                    : "border-black-deep/20 text-black-deep hover:border-black-deep/60 bg-white"
                }`}
              >
                <span>{opt.label}</span>
                {opt.priceDelta > 0 && (
                  <span className={isSelected ? "text-[#e8c75d] text-[11px] font-medium" : "text-amber-800 text-[11px] font-medium"}>
                    (+₹{opt.priceDelta.toLocaleString("en-IN")})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity Counter */}
      <div className="flex items-center gap-4 pt-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-grey-stone font-bold">Quantity</span>
        <div className="flex items-center border border-black-deep/20 bg-white-pure rounded-sm">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 py-2 text-black-deep hover:bg-black-deep/5 transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-5 text-sm font-bold text-black-deep">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="px-4 py-2 text-black-deep hover:bg-black-deep/5 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid gap-3 pt-2">
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex items-center justify-center gap-3 border border-black-deep px-6 py-4 text-sm font-semibold text-black-deep transition-cinematic hover:bg-black-deep hover:text-white"
        >
          {added ? (
            <><Check className="h-4 w-4 text-[#c9a227]" /> Added To Cart!</>
          ) : (
            <><ShoppingBag className="h-4 w-4" /> Add to cart</>
          )}
        </button>

        <button
          type="button"
          onClick={() => { handleAddToCart(); openCart(); }}
          className="inline-flex items-center justify-center gap-3 bg-[#c47a2b] px-6 py-4 text-sm font-semibold text-white transition-cinematic hover:bg-[#a8661f]"
        >
          Buy it now
        </button>

        <button
          type="button"
          onClick={handleWhatsAppOrder}
          className="inline-flex items-center justify-center gap-3 bg-[#25D366] px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-cinematic hover:bg-[#1ebe5b]"
        >
          <MessageSquare className="h-4 w-4" /> Order on WhatsApp
        </button>
      </div>

      {/* Custom size helper link */}
      <div className="pt-2 flex items-center justify-between text-xs text-black-charcoal/70 border-t border-black-deep/10">
        <span>Need custom sanctum wall sizing?</span>
        <Link
          href="/custom-order"
          className="text-[11px] uppercase font-bold text-black-deep hover:underline flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#c9a227]" /> Custom Commission →
        </Link>
      </div>
    </div>
  );
}
