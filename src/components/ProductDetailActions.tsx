"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, MessageSquare, Plus, Minus, Check, Sparkles, Sliders } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useContactInfo } from "@/context/ContactInfoContext";
import type { DevotionalProduct } from "@/data/devotionalProducts";
import type { CustomizationField, CustomizationOption } from "@/types/customization";

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

const defaultFrameModelOptions: OptionItem[] = [
  { label: "Classic Teak Wood Frame", priceDelta: 0 },
  { label: "Chettinad Mani Frame", priceDelta: 0 },
  { label: "Antique Gold Carved Frame", priceDelta: 500 },
  { label: "Traditional Rosewood Finish", priceDelta: 400 },
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
  const whatsappNumber = contactInfo?.whatsapp_number || "9047044916";

  // Dynamic Customizations State from Database
  const [dynamicFields, setDynamicFields] = useState<CustomizationField[] | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, CustomizationOption>>({});

  // Fallback Static Options
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

  const frameModelOptions: OptionItem[] = useMemo(() => {
    if (Array.isArray(product.frame_models) && product.frame_models.length > 0) {
      const parsed = product.frame_models
        .map(parseOptionItem)
        .filter((x): x is OptionItem => Boolean(x && x.label));
      if (parsed.length > 0) return parsed;
    }
    return defaultFrameModelOptions;
  }, [product.frame_models]);

  const [selectedMaterial, setSelectedMaterial] = useState<OptionItem>(
    () => materialOptions[0] || defaultMaterialOptions[0]
  );
  const [selectedSize, setSelectedSize] = useState<OptionItem>(
    () => sizeOptions[0] || defaultSizeOptions[0]
  );
  const [selectedFrameModel, setSelectedFrameModel] = useState<OptionItem>(
    () => frameModelOptions[0] || defaultFrameModelOptions[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Fetch dynamic customizations from database API
  useEffect(() => {
    let active = true;
    const fetchCustomizations = async () => {
      try {
        const query = new URLSearchParams({
          target: "product_page",
          category: product.category || "",
          product_id: product.id || "",
        });
        const res = await fetch(`/api/customizations?${query.toString()}`);
        const json = await res.json();
        if (active && json.fields && Array.isArray(json.fields) && json.fields.length > 0) {
          setDynamicFields(json.fields);

          // Initialize defaults for each dynamic field
          const initialMap: Record<string, CustomizationOption> = {};
          json.fields.forEach((field: CustomizationField) => {
            if (field.options && field.options.length > 0) {
              initialMap[field.id] = field.options[0];
            }
          });
          setSelectedCustomizations(initialMap);
        }
      } catch (err) {
        console.warn("Could not load dynamic customizations", err);
      }
    };

    fetchCustomizations();
    return () => {
      active = false;
    };
  }, [product.category, product.id]);

  // Pricing Calculation
  const activeMaterial =
    materialOptions.find((m) => m.label === selectedMaterial.label) ||
    materialOptions[0] ||
    defaultMaterialOptions[0];
  const activeSize =
    sizeOptions.find((s) => s.label === selectedSize.label) ||
    sizeOptions[0] ||
    defaultSizeOptions[0];
  const activeFrameModel =
    frameModelOptions.find((f) => f.label === selectedFrameModel.label) ||
    frameModelOptions[0] ||
    defaultFrameModelOptions[0];

  const hasDynamicFields = Boolean(dynamicFields && dynamicFields.length > 0);

  const dynamicDelta = useMemo(() => {
    if (!hasDynamicFields) return 0;
    return Object.values(selectedCustomizations).reduce(
      (sum, opt) => sum + (opt.priceDelta || 0),
      0
    );
  }, [hasDynamicFields, selectedCustomizations]);

  const fallbackDelta =
    (activeMaterial?.priceDelta || 0) +
    (activeSize?.priceDelta || 0) +
    (activeFrameModel?.priceDelta || 0);

  const totalDelta = hasDynamicFields ? dynamicDelta : fallbackDelta;
  const unitPrice = product.price + totalDelta;
  const originalPrice = product.originalPrice
    ? product.originalPrice + totalDelta
    : undefined;

  const handleAddToCart = () => {
    // Collect customization map
    const customMap: Record<string, string> = {};
    let chosenSize = activeSize.label;
    let chosenFrame = activeMaterial.label;
    let chosenModel = activeFrameModel.label;

    if (hasDynamicFields && dynamicFields) {
      dynamicFields.forEach((field) => {
        const selected = selectedCustomizations[field.id];
        if (selected) {
          customMap[field.label] = selected.label;
          const slug = field.slug.toLowerCase();
          if (slug.includes("dimension") || slug.includes("size")) {
            chosenSize = selected.label;
          } else if (slug.includes("frame-finish") || slug.includes("material")) {
            chosenFrame = selected.label;
          } else if (slug.includes("frame-model") || slug.includes("artwork")) {
            chosenModel = selected.label;
          }
        }
      });
    }

    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: unitPrice,
      originalPrice,
      image: product.image,
      size: chosenSize,
      frame: chosenFrame,
      frameModel: chosenModel,
      customizations: customMap,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWhatsAppOrder = () => {
    const rawDigits = whatsappNumber.replace(/\D/g, "");
    const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://framesofdivine.vercel.app";
    const productLink = `${baseUrl}/products/${product.slug || product.id}`;

    let optionsSummary = "";
    if (hasDynamicFields && dynamicFields) {
      optionsSummary = dynamicFields
        .map((f) => {
          const opt = selectedCustomizations[f.id];
          if (!opt) return null;
          const deltaStr = opt.priceDelta > 0 ? ` (+₹${opt.priceDelta.toLocaleString("en-IN")})` : "";
          return `• ${f.label}: ${opt.label}${deltaStr}`;
        })
        .filter(Boolean)
        .join("\n");
    } else {
      optionsSummary =
        `• Material / Framing: ${activeMaterial.label}${activeMaterial.priceDelta > 0 ? ` (+₹${activeMaterial.priceDelta.toLocaleString("en-IN")})` : ""}\n` +
        `• Size: ${activeSize.label}${activeSize.priceDelta > 0 ? ` (+₹${activeSize.priceDelta.toLocaleString("en-IN")})` : ""}\n` +
        `• Frame Model: ${activeFrameModel.label}${activeFrameModel.priceDelta > 0 ? ` (+₹${activeFrameModel.priceDelta.toLocaleString("en-IN")})` : ""}`;
    }

    const msg =
      `*ORDER INQUIRY — TANJORE PAINTINGS*\n\n` +
      `Product: *${product.name}*\n` +
      `Specifications:\n${optionsSummary}\n` +
      `Quantity: ${quantity}\n` +
      `Calculated Unit Price: ₹${unitPrice.toLocaleString("en-IN")}\n` +
      `Total Amount: ₹${(unitPrice * quantity).toLocaleString("en-IN")}\n\n` +
      `View Artwork Link: ${productLink}\n\n` +
      `Please confirm availability, framing finish, and dispatch timeline. Thank you!`;

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

      {/* DYNAMIC CUSTOMIZATION FIELDS (FROM DATABASE) */}
      {hasDynamicFields && dynamicFields ? (
        <div className="space-y-6 border-y border-black-deep/10 py-5">
          {dynamicFields.map((field) => {
            const currentSelected = selectedCustomizations[field.id] || field.options[0];
            return (
              <div key={field.id} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-grey-stone font-bold block">
                    {field.label} {field.required && <span className="text-amber-800">*</span>}
                  </span>
                  {currentSelected?.priceDelta > 0 && (
                    <span className="text-[11px] font-semibold text-[#a8661f]">
                      +{`₹${currentSelected.priceDelta.toLocaleString("en-IN")}`}
                    </span>
                  )}
                </div>

                {field.description && (
                  <p className="text-[11px] text-zinc-500">{field.description}</p>
                )}

                {/* Pills / Buttons Presentation */}
                {field.fieldType === "pills" && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt) => {
                      const isSelected = currentSelected?.id === opt.id || currentSelected?.label === opt.label;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelectedCustomizations((prev) => ({
                              ...prev,
                              [field.id]: opt,
                            }))
                          }
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
                )}

                {/* Dropdown Select Presentation */}
                {field.fieldType === "select" && (
                  <div className="w-full">
                    <select
                      value={currentSelected?.label || ""}
                      onChange={(e) => {
                        const opt = field.options.find((o) => o.label === e.target.value);
                        if (opt) {
                          setSelectedCustomizations((prev) => ({
                            ...prev,
                            [field.id]: opt,
                          }));
                        }
                      }}
                      className="w-full border border-black-deep/20 bg-white px-4 py-2.5 text-xs sm:text-sm text-black-deep outline-none focus:border-black-deep cursor-pointer"
                    >
                      {field.options.map((opt) => (
                        <option key={opt.id} value={opt.label}>
                          {opt.label} {opt.priceDelta > 0 ? `(+₹${opt.priceDelta.toLocaleString("en-IN")})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Radio Presentation */}
                {field.fieldType === "radio" && (
                  <div className="space-y-1.5">
                    {field.options.map((opt) => {
                      const isSelected = currentSelected?.id === opt.id || currentSelected?.label === opt.label;
                      return (
                        <label
                          key={opt.id}
                          onClick={() =>
                            setSelectedCustomizations((prev) => ({
                              ...prev,
                              [field.id]: opt,
                            }))
                          }
                          className={`flex items-center justify-between p-2.5 border rounded-sm cursor-pointer transition-colors ${
                            isSelected
                              ? "border-black-deep bg-black-deep/5 font-semibold text-black-deep"
                              : "border-black-deep/15 hover:border-black-deep/40 text-black-deep/80"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`custom_${field.id}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="accent-black"
                            />
                            <span className="text-xs">{opt.label}</span>
                          </div>
                          {opt.priceDelta > 0 && (
                            <span className="text-xs font-semibold text-amber-800">
                              +₹{opt.priceDelta.toLocaleString("en-IN")}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FALLBACK TRADITIONAL SELECTORS (Instant Render) */
        <div className="space-y-6">
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

          {/* Frame Model Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.25em] text-grey-stone font-bold block">
                Frame Model
              </span>
              {activeFrameModel.priceDelta > 0 && (
                <span className="text-[11px] font-semibold text-[#a8661f]">
                  +{`₹${activeFrameModel.priceDelta.toLocaleString("en-IN")}`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {frameModelOptions.map((opt) => {
                const isSelected = activeFrameModel.label === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedFrameModel(opt)}
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
        </div>
      )}

      {/* Quantity & Actions */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-grey-stone font-bold">
            Quantity
          </span>
          <div className="flex items-center border border-black-deep/20 bg-white">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="p-2.5 text-black-deep hover:bg-black-deep/5 disabled:opacity-30 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-4 text-sm font-semibold text-black-deep min-w-[2.5rem] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="p-2.5 text-black-deep hover:bg-black-deep/5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`inline-flex items-center justify-center gap-2.5 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
              added
                ? "bg-green-700 text-white"
                : "bg-black-deep text-white hover:bg-black-deep/90 shadow-md"
            }`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" /> Added to Cart
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppOrder}
            className="inline-flex items-center justify-center gap-2.5 border border-[#25D366] bg-[#25D366] px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white hover:brightness-105 transition-all shadow-md"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp Order
          </button>
        </div>
      </div>
    </div>
  );
}
