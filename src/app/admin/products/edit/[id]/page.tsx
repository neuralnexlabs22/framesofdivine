"use client";

import { useState, useEffect, useRef, FormEvent, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, X, Save, AlertCircle, Loader, Upload, Plus, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useProducts } from "@/context/ProductContext";
import { useCatalog } from "@/context/CatalogContext";
import { uploadAdminImage } from "@/lib/imageUpload";
import {
  PRODUCT_CATEGORIES,
  getBrandsForProductCategory,
  brandOptionKey,
} from "@/lib/catalogHelpers";
import AdminSelect, { AdminSelectOption } from "@/components/AdminSelect";

type VariantOption = {
  label: string;
  priceDelta: number;
};

const STANDARD_DEVOTIONAL_SIZES: VariantOption[] = [
  { label: "13 × 15 inches", priceDelta: 0 },
  { label: "15 × 18 inches", priceDelta: 500 },
  { label: "17 × 21 inches", priceDelta: 1200 },
  { label: "20 × 24 inches", priceDelta: 2200 },
  { label: "22 × 28 inches", priceDelta: 3400 },
];

const STANDARD_DEVOTIONAL_MATERIALS: VariantOption[] = [
  { label: "22 Carat Exclusive", priceDelta: 0 },
  { label: "24 Carat Exclusive", priceDelta: 2000 },
  { label: "Teak Wood Frame", priceDelta: 0 },
  { label: "Antique Gold Carved Frame", priceDelta: 1500 },
];

function parseVariant(item: any): VariantOption {
  if (!item) return { label: "", priceDelta: 0 };
  if (typeof item === "object" && item.label) {
    return {
      label: String(item.label).trim(),
      priceDelta: Number(item.priceDelta) || 0,
    };
  }
  const str = String(item).trim();
  const deltaMatch = str.match(/\(\s*\+\s*(?:₹|Rs\.?)?\s*(\d+)\s*\)/i);
  if (deltaMatch) {
    return {
      label: str.replace(/\(\s*\+\s*(?:₹|Rs\.?)?\s*\d+\s*\)/i, "").trim(),
      priceDelta: Number(deltaMatch[1]) || 0,
    };
  }
  return { label: str, priceDelta: 0 };
}

function convertGoogleDriveUrl(url: string): string {
  const trimmed = url.trim();
  const fileDRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = trimmed.match(fileDRegex);
  if (match1 && match1[1]) {
    return `https://docs.google.com/uc?export=view&id=${match1[1]}`;
  }
  const openIdRegex = /[drive|docs]\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = trimmed.match(openIdRegex);
  if (match2 && match2[1]) {
    return `https://docs.google.com/uc?export=view&id=${match2[1]}`;
  }
  return trimmed;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getProductById, updateProduct, deleteProduct, loaded: productsLoaded } = useProducts();
  const { categories: catalogCategories, brands: catalogBrands, loading: catalogLoading } = useCatalog();

  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState<string>("Deity Paintings");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([""]);

  // Variants with price differences
  const [sizes, setSizes] = useState<VariantOption[]>([]);
  const [sizeInput, setSizeInput] = useState("");
  const [sizeDeltaInput, setSizeDeltaInput] = useState("");

  const [materials, setMaterials] = useState<VariantOption[]>([]);
  const [materialInput, setMaterialInput] = useState("");
  const [materialDeltaInput, setMaterialDeltaInput] = useState("");

  const [isNew, setIsNew] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<boolean[]>([]);
  const [message, setMessage] = useState<null | { type: "error" | "success"; text: string }>(null);
  const initialLoadDone = useRef(false);

  // Combine static presets with all dynamic categories from Supabase
  const availableCategories = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addCat = (catName?: string) => {
      if (!catName) return;
      const clean = catName.trim();
      const lower = clean.toLowerCase();
      if (clean && !seen.has(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    };

    PRODUCT_CATEGORIES.forEach(addCat);
    catalogCategories.forEach((c) => addCat(c.name));
    if (category) addCat(category);

    return list;
  }, [catalogCategories, category]);

  useEffect(() => {
    if (!productsLoaded || catalogLoading) return;

    const product = getProductById(id);
    if (!product) {
      setNotFound(true);
      setLoaded(true);
      return;
    }

    setName(product.name);
    setBrand(product.brand);

    const available = getBrandsForProductCategory(
      product.category,
      catalogBrands
    );
    const isPredefined = available.some((b) => b.name === product.brand);
    if (!isPredefined && product.brand) {
      setIsCustomBrand(true);
      setCustomBrand(product.brand);
    } else {
      setIsCustomBrand(false);
      setCustomBrand("");
    }

    setPrice(String(product.price));
    setStock(String(product.stock ?? 10));
    setCategory(product.category);
    setDescription(product.description || "");
    setImages(product.images && product.images.length > 0 ? [...product.images] : [""]);

    // Parse existing sizes and materials
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      setSizes(product.sizes.map(parseVariant).filter((v) => Boolean(v.label)));
    } else {
      setSizes(STANDARD_DEVOTIONAL_SIZES);
    }

    const rawMaterials = (product as any).materials || product.colors;
    if (Array.isArray(rawMaterials) && rawMaterials.length > 0) {
      setMaterials(rawMaterials.map(parseVariant).filter((v) => Boolean(v.label)));
    } else {
      setMaterials(STANDARD_DEVOTIONAL_MATERIALS);
    }

    setIsNew(Boolean(product.isNew));
    setIsTrending(Boolean(product.isTrending));
    setLoaded(true);
    initialLoadDone.current = true;
  }, [id, getProductById, catalogBrands, productsLoaded, catalogLoading]);

  const brandsForCategory = getBrandsForProductCategory(
    category,
    catalogBrands
  );

  const addImageField = () => {
    if (images.length < 5) {
      setImages([...images, ""]);
    }
  };

  const updateImage = (index: number, value: string) => {
    const converted = convertGoogleDriveUrl(value);
    const updated = [...images];
    updated[index] = converted;
    setImages(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    const uploadingStates = new Array(5).fill(false);
    uploadingStates[index] = true;
    setUploadingImages(uploadingStates);

    try {
      const publicUrl = await uploadAdminImage(file);
      updateImage(index, publicUrl);
    } catch (error) {
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      const uploadingStates = new Array(5).fill(false);
      setUploadingImages(uploadingStates);
    }
  };

  const removeImage = (index: number) => {
    if (images.length > 1) {
      setImages(images.filter((_, i) => i !== index));
    }
  };

  // Add / Remove Sizes
  const handleAddSize = () => {
    const label = sizeInput.trim();
    if (!label) return;
    const delta = Number(sizeDeltaInput.trim().replace(/[^\d.]/g, "")) || 0;
    if (!sizes.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
      setSizes([...sizes, { label, priceDelta: delta }]);
    }
    setSizeInput("");
    setSizeDeltaInput("");
  };

  const handleRemoveSize = (label: string) => {
    setSizes(sizes.filter((s) => s.label !== label));
  };

  // Add / Remove Materials
  const handleAddMaterial = () => {
    const label = materialInput.trim();
    if (!label) return;
    const delta = Number(materialDeltaInput.trim().replace(/[^\d.]/g, "")) || 0;
    if (!materials.some((m) => m.label.toLowerCase() === label.toLowerCase())) {
      setMaterials([...materials, { label, priceDelta: delta }]);
    }
    setMaterialInput("");
    setMaterialDeltaInput("");
  };

  const handleRemoveMaterial = (label: string) => {
    setMaterials(materials.filter((m) => m.label !== label));
  };

  const normalizePrice = (value: string) => {
    const cleaned = value.trim().replace(/[^\d.]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteProduct(id);
      router.push("/admin/products");
    } catch (err: any) {
      alert(err?.message || "Failed to delete product");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const validImages = images.map((i) => i.trim()).filter(Boolean);
    const normalizedPrice = normalizePrice(price);

    if (!name.trim()) {
      setMessage({ type: "error", text: "Product name is required." });
      return;
    }

    if (!price.trim() || normalizedPrice <= 0) {
      setMessage({ type: "error", text: "Enter a valid price greater than 0." });
      return;
    }

    if (validImages.length === 0) {
      setMessage({ type: "error", text: "Add at least one product image before saving." });
      return;
    }

    const finalBrand = isCustomBrand ? customBrand.trim() : brand.trim();
    setSaving(true);
    try {
      await updateProduct(id, {
        name: name.trim(),
        brand: finalBrand || "Frames of Divine",
        price: normalizedPrice,
        stock: parseInt(stock) || 0,
        category,
        images: validImages,
        description: description.trim(),
        sizes,
        colors: materials,
        isNew,
        isTrending,
      });

      router.push("/admin/products");
    } catch (err: any) {
      console.error("Failed to update product:", err);
      setMessage({ type: "error", text: err?.message || "Failed to update product" });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <AlertCircle className="w-12 h-12 mb-4 text-zinc-700" />
        <p className="text-sm mb-4">Product not found</p>
        <Link
          href="/admin/products"
          className="text-[#c9a227] text-sm hover:underline"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  const basePriceNum = normalizePrice(price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-6 pb-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c9a227]">
              Frames of Divine
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-medium uppercase tracking-tight text-white mt-0.5">
              Edit Devotional Print
            </h1>
            <p className="text-zinc-400 text-xs mt-0.5">
              Update deity print details, category, custom size pricing, and framing
            </p>
          </div>
        </div>

        {/* Delete Artwork Trigger */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-all text-xs font-semibold"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Artwork</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-serif text-lg font-bold text-white">Delete Devotional Print?</h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">"{name}"</span>? This will permanently remove this artwork from the shop catalog and database.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-white/20 text-xs uppercase tracking-wider font-semibold text-zinc-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "error"
              ? "bg-red-500/10 border border-red-500/20 text-red-400"
              : "bg-[#c9a227]/10 border border-[#c9a227]/30 text-[#e8c75d]"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Print Title / Artwork Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Lord Shiva Nataraja Devotional Painting"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors"
          />
        </div>

        {/* Brand / Theme & Base Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Deity / Sacred Theme
            </label>
            <AdminSelect
              value={isCustomBrand ? "__custom__" : brand}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__custom__") {
                  setIsCustomBrand(true);
                } else {
                  setIsCustomBrand(false);
                  setBrand(val);
                }
              }}
            >
              {brandsForCategory.map((b) => (
                <AdminSelectOption key={brandOptionKey(b)} optionKey={brandOptionKey(b)} value={b.name}>
                  {b.name}
                </AdminSelectOption>
              ))}
              <AdminSelectOption optionKey="custom-brand" value="__custom__">
                Custom / Other Theme...
              </AdminSelectOption>
            </AdminSelect>
            {isCustomBrand && (
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Enter deity or sacred theme name"
                className="w-full mt-2 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none text-sm transition-colors"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Base Price (₹) *
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="e.g. 999"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Global Stock */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Global Stock *
          </label>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            min="0"
            step="1"
            placeholder="10"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors"
          />
        </div>

        {/* Category (DYNAMIC DROPDOWN INCLUDING CUSTOM CATEGORIES) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Category *
            </label>
            <span className="text-[10px] text-[#c9a227] uppercase tracking-wider font-semibold">
              {availableCategories.length} categories available
            </span>
          </div>
          <AdminSelect
            value={category}
            onChange={(e) => {
              const next = e.target.value;
              setCategory(next);
              if (initialLoadDone.current && !isCustomBrand) {
                const list = getBrandsForProductCategory(next, catalogBrands);
                if (list.length > 0) setBrand(list[0].name);
              }
            }}
          >
            {availableCategories.map((cat) => (
              <AdminSelectOption key={`cat-${cat}`} optionKey={`cat-${cat}`} value={cat}>
                {cat}
              </AdminSelectOption>
            ))}
          </AdminSelect>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Devotional print description, symbolism, blessings, framing craftsmanship..."
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Product Images */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Product Images (up to 5)
            </label>
            {images.length < 5 && (
              <button
                type="button"
                onClick={addImageField}
                className="flex items-center gap-1.5 text-xs text-[#c9a227] bg-[#c9a227]/10 px-3 py-1.5 rounded-lg hover:bg-[#c9a227]/20 transition-all font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Image Slot</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {images.map((img, index) => (
              <div key={index} className="p-4 bg-zinc-950 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                    {index === 0 ? "★ Primary Featured Image" : `Secondary Image #${index + 1}`}
                  </span>
                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {img && (
                  <div className="relative w-full h-40 bg-black/40 rounded-lg overflow-hidden border border-white/10">
                    <Image src={img} alt={`Preview ${index + 1}`} fill className="object-contain" unoptimized />
                  </div>
                )}

                <input
                  type="text"
                  value={img}
                  onChange={(e) => updateImage(index, e.target.value)}
                  placeholder="Paste direct image URL or upload below"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors text-sm"
                />

                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-white/20 rounded-lg px-3 py-2 cursor-pointer hover:border-[#c9a227] hover:bg-white/5 transition-all">
                  {uploadingImages[index] ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-[#c9a227]" />
                      <span className="text-xs text-zinc-400">Uploading to server...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-400">Upload Image File</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImageUpload(index, e.target.files[0]);
                      }
                    }}
                    disabled={uploadingImages[index]}
                    className="hidden"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: SIZES & CUSTOM PRICING */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-serif text-lg text-white font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c9a227]" />
                Dimensions / Sizes & Price Differences
              </h3>
              <p className="text-xs text-zinc-400">
                Set individual price additions for larger print dimensions (e.g. +₹500 for 15×18)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSizes(STANDARD_DEVOTIONAL_SIZES)}
              className="text-[11px] font-bold text-[#c9a227] bg-[#c9a227]/10 hover:bg-[#c9a227]/20 border border-[#c9a227]/30 px-3 py-1.5 rounded-lg transition-all w-fit"
            >
              + Load Standard Tanjore Sizes
            </button>
          </div>

          {/* Existing Sizes Chips */}
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-black/40 rounded-xl border border-white/5">
            {sizes.length === 0 ? (
              <span className="text-xs text-zinc-500 italic p-1">No custom sizes configured. Add one below.</span>
            ) : (
              sizes.map((s) => {
                const totalPrice = basePriceNum + s.priceDelta;
                return (
                  <span
                    key={s.label}
                    className="flex items-center gap-2 text-xs bg-black border border-[#c9a227]/40 text-white px-3 py-2 rounded-lg"
                  >
                    <span className="font-semibold">{s.label}</span>
                    <span className="text-[#e8c75d] font-bold">
                      {s.priceDelta > 0 ? `+₹${s.priceDelta.toLocaleString("en-IN")}` : "+₹0"}
                    </span>
                    <span className="text-zinc-500 text-[10px]">
                      (₹{totalPrice.toLocaleString("en-IN")})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSize(s.label)}
                      className="text-zinc-400 hover:text-red-400 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Add Size Form */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_auto] gap-2 pt-1">
            <input
              type="text"
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              placeholder="Dimension (e.g. 15 × 18 inches)"
              className="bg-black border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-600 focus:border-[#c9a227] text-xs transition-colors"
            />
            <input
              type="number"
              value={sizeDeltaInput}
              onChange={(e) => setSizeDeltaInput(e.target.value)}
              placeholder="Extra Price ₹ (e.g. 500)"
              className="bg-black border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-600 focus:border-[#c9a227] text-xs transition-colors"
            />
            <button
              type="button"
              onClick={handleAddSize}
              className="px-4 py-2.5 bg-[#c9a227] text-black font-bold uppercase tracking-wider text-xs rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Size
            </button>
          </div>
        </div>

        {/* SECTION: MATERIALS / FRAMING & CUSTOM PRICING */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-serif text-lg text-white font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c9a227]" />
                Materials, Gold & Framing Options
              </h3>
              <p className="text-xs text-zinc-400">
                Set price additions for 24KT Gold leaf, Teak framing, or premium finishes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaterials(STANDARD_DEVOTIONAL_MATERIALS)}
              className="text-[11px] font-bold text-[#c9a227] bg-[#c9a227]/10 hover:bg-[#c9a227]/20 border border-[#c9a227]/30 px-3 py-1.5 rounded-lg transition-all w-fit"
            >
              + Load Standard Gold & Framing
            </button>
          </div>

          {/* Existing Materials Chips */}
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-black/40 rounded-xl border border-white/5">
            {materials.length === 0 ? (
              <span className="text-xs text-zinc-500 italic p-1">No framing options configured. Add one below.</span>
            ) : (
              materials.map((m) => {
                const totalPrice = basePriceNum + m.priceDelta;
                return (
                  <span
                    key={m.label}
                    className="flex items-center gap-2 text-xs bg-black border border-[#c9a227]/40 text-white px-3 py-2 rounded-lg"
                  >
                    <span className="font-semibold">{m.label}</span>
                    <span className="text-[#e8c75d] font-bold">
                      {m.priceDelta > 0 ? `+₹${m.priceDelta.toLocaleString("en-IN")}` : "+₹0"}
                    </span>
                    <span className="text-zinc-500 text-[10px]">
                      (₹{totalPrice.toLocaleString("en-IN")})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(m.label)}
                      className="text-zinc-400 hover:text-red-400 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Add Material Form */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_auto] gap-2 pt-1">
            <input
              type="text"
              value={materialInput}
              onChange={(e) => setMaterialInput(e.target.value)}
              placeholder="Material / Finish (e.g. 24 Carat Exclusive)"
              className="bg-black border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-600 focus:border-[#c9a227] text-xs transition-colors"
            />
            <input
              type="number"
              value={materialDeltaInput}
              onChange={(e) => setMaterialDeltaInput(e.target.value)}
              placeholder="Extra Price ₹ (e.g. 2000)"
              className="bg-black border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-600 focus:border-[#c9a227] text-xs transition-colors"
            />
            <button
              type="button"
              onClick={handleAddMaterial}
              className="px-4 py-2.5 bg-[#c9a227] text-black font-bold uppercase tracking-wider text-xs rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Material
            </button>
          </div>
        </div>

        {/* Toggles: New Arrival & Trending */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer p-4 bg-zinc-950 border border-white/10 rounded-xl">
            <input
              type="checkbox"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="w-4 h-4 accent-[#c9a227]"
            />
            <span className="text-sm font-semibold text-white">Mark as New Sacred Arrival</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-4 bg-zinc-950 border border-white/10 rounded-xl">
            <input
              type="checkbox"
              checked={isTrending}
              onChange={(e) => setIsTrending(e.target.checked)}
              className="w-4 h-4 accent-[#c9a227]"
            />
            <span className="text-sm font-semibold text-white">Feature in Trending Sanctum Artwork</span>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
          <Link
            href="/admin/products"
            className="px-6 py-3.5 border border-white/20 rounded-xl text-xs uppercase tracking-wider font-semibold text-zinc-300 hover:bg-white/5 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 bg-[#c9a227] hover:bg-[#dfb532] text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-[#c9a227]/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-black" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>Update Artwork</span>
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
