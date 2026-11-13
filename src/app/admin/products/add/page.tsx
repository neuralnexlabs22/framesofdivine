"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadAdminImage, uploadAdminRemoteUrl } from "@/lib/imageUpload";
import { Category, Brand } from "@/types/catalog";
import { useCatalog } from "@/context/CatalogContext";
import { useProducts } from "@/context/ProductContext";
import { slugToProductCategory } from "@/lib/catalogHelpers";
import { brandOptionKey } from "@/lib/catalogHelpers";
import AdminSelect, { AdminSelectOption } from "@/components/AdminSelect";
import { ArrowLeft, Upload, X, Loader, AlertCircle, CheckCircle, Sparkles, Plus } from "lucide-react";
import Link from "next/link";

function convertGoogleDriveUrl(url: string): string {
  const trimmed = url.trim();
  
  // Pattern 1: drive.google.com/file/d/FILE_ID/...
  const fileDRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = trimmed.match(fileDRegex);
  if (match1 && match1[1]) {
    return `https://docs.google.com/uc?export=view&id=${match1[1]}`;
  }

  // Pattern 2: drive.google.com/open?id=FILE_ID or docs.google.com/open?id=FILE_ID
  const openIdRegex = /[drive|docs]\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = trimmed.match(openIdRegex);
  if (match2 && match2[1]) {
    return `https://docs.google.com/uc?export=view&id=${match2[1]}`;
  }

  // Pattern 3: docs.google.com/file/d/FILE_ID/...
  const docsDRegex = /docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match3 = trimmed.match(docsDRegex);
  if (match3 && match3[1]) {
    return `https://docs.google.com/uc?export=view&id=${match3[1]}`;
  }

  return trimmed;
}

export default function AddProductPage() {
  const router = useRouter();
  const { categories, brands, loading: catalogLoading } = useCatalog();
  const { addProduct } = useProducts();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" as "success" | "error" });
  const [uploadingImages, setUploadingImages] = useState<boolean[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    shortDescription: "",
    fullDescription: "",
    sku: "",
    tags: "",
    categoryId: "",
    brandId: "",
    price: "",
    stockQuantity: "",
    stockStatus: "in_stock" as "in_stock" | "out_of_stock" | "low_stock",
    collectionType: "",
    featured: false,
    isTrending: false,
    isActive: true,
    colors: [] as string[],
    sizes: [] as string[],
    materials: [] as string[],
  });

  const [sizesList, setSizesList] = useState<Array<{ label: string; priceDelta: number }>>([
    { label: "13 × 15 inches", priceDelta: 0 },
    { label: "15 × 18 inches", priceDelta: 500 },
    { label: "17 × 21 inches", priceDelta: 1200 },
    { label: "20 × 24 inches", priceDelta: 2200 },
    { label: "22 × 28 inches", priceDelta: 3400 },
  ]);
  const [sizeInput, setSizeInput] = useState("");
  const [sizeDeltaInput, setSizeDeltaInput] = useState("");

  const [materialsList, setMaterialsList] = useState<Array<{ label: string; priceDelta: number }>>([
    { label: "22 Carat Exclusive", priceDelta: 0 },
    { label: "24 Carat Exclusive", priceDelta: 2000 },
    { label: "Teak Wood Frame", priceDelta: 0 },
  ]);
  const [materialInput, setMaterialInput] = useState("");
  const [materialDeltaInput, setMaterialDeltaInput] = useState("");

  const [colorInput, setColorInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(["", "", "", "", ""]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(["", "", "", "", ""]);

  useEffect(() => {
    if (!catalogLoading) setLoading(false);
  }, [catalogLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      };
      if (name === "categoryId") {
        next.brandId = "";
      }
      return next;
    });
  };

  const brandsForCategory = formData.categoryId
    ? brands.filter((b) => b.category_id === formData.categoryId)
    : brands;

  const handleImageUrlChange = (index: number, url: string) => {
    const converted = convertGoogleDriveUrl(url);
    const newUrls = [...imageUrls];
    newUrls[index] = converted;
    setImageUrls(newUrls);
    if (converted.startsWith("http") || converted.startsWith("/")) {
      const newPreviews = [...imagePreviews];
      newPreviews[index] = converted;
      setImagePreviews(newPreviews);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-[var(--accent-1)]", "bg-white/5");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-[var(--accent-1)]", "bg-white/5");
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-[var(--accent-1)]", "bg-white/5");
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        await handleImageUpload(index, file);
      } else {
        setMessage({ text: "Please drop an image file", type: "error" });
      }
      return;
    }

    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (url) {
      handleImageUrlChange(index, url);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please upload an image file", type: "error" });
      return;
    }

    const uploadingStates = new Array(5).fill(false);
    uploadingStates[index] = true;
    setUploadingImages(uploadingStates);

    try {
      const publicUrl = await uploadAdminImage(file);
      const newUrls = [...imageUrls];
      newUrls[index] = publicUrl;
      setImageUrls(newUrls);

      const newPreviews = [...imagePreviews];
      newPreviews[index] = publicUrl;
      setImagePreviews(newPreviews);

      setMessage({ text: "✓ Image uploaded successfully", type: "success" });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Unknown error";
      setMessage({ text: `Upload failed: ${errorText}`, type: "error" });
    } finally {
      const uploadingStates = new Array(5).fill(false);
      setUploadingImages(uploadingStates);
    }
  };

  const addTag = (input: string, setter: React.Dispatch<React.SetStateAction<string>>, field: "colors" | "sizes" | "materials") => {
    const val = input.trim();
    if (val && !formData[field].includes(val)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], val],
      }));
      setter("");
    }
  };

  const removeTag = (value: string, field: "colors" | "sizes" | "materials") => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== value),
    }));
  };

  const normalizePriceValue = (value: string) => {
    const cleaned = value.trim().replace(/[^\d.]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId || !formData.brandId || !formData.name) {
      setMessage({ text: "Please fill in all required fields", type: "error" });
      return;
    }

    const selectedCategory = categories.find((c) => c.id === formData.categoryId);
    const selectedBrand = brands.find((b) => b.id === formData.brandId);
    if (!selectedCategory || !selectedBrand) {
      setMessage({ text: "Please select a valid category and brand", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const validImages = imageUrls.filter((url) => url.trim() !== "");
      const price = normalizePriceValue(formData.price);

      await addProduct({
        name: formData.name.trim(),
        brand: selectedBrand.name,
        price,
        category: (selectedCategory.name || slugToProductCategory(selectedCategory.slug)) as any,
        images:
          validImages.length > 0
            ? validImages
            : ["/assets/devotional/deity-gallery-montage.png"],
        description:
          formData.fullDescription.trim() ||
          formData.shortDescription.trim() ||
          `${formData.name} — ${selectedBrand.name}`,
        sizes:
          sizesList.length > 0
            ? sizesList
            : ["12 x 18 in", "16 x 24 in"],
        colors:
          materialsList.length > 0
            ? materialsList
            : ["Teak Wood Frame", "Matte Gold Frame"],
        stock: parseInt(formData.stockQuantity) || 0,
        isNew: formData.featured,
        isTrending: formData.isTrending,
      });

      setMessage({ text: "✓ Product added successfully!", type: "success" });
      setTimeout(() => router.push("/admin/products"), 1500);
    } catch (error) {
      console.error("Error:", error);
      setMessage({ text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-[#c9a227]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
            Add Devotional Print
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Add a new deity photo, temple architecture print, or sacred sculpture artwork
          </p>
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
          message.type === "success"
            ? "bg-green-500/10 border-green-500 text-green-400"
            : "bg-red-500/10 border-red-500 text-red-400"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-serif font-bold text-white">Print Information</h3>
          
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Print Title / Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="e.g. Lord Shiva Nataraja Devotional Print"
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Devotional Category *
              </label>
              <AdminSelect
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                required
                placeholder={`Select Category (${categories.length} available)`}
              >
                {categories.map((cat) => (
                  <AdminSelectOption
                    key={cat.id}
                    optionKey={`cat-${cat.id}`}
                    value={cat.id}
                  >
                    {cat.name}
                  </AdminSelectOption>
                ))}
              </AdminSelect>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Deity / Theme / Temple *
              </label>
              <AdminSelect
                name="brandId"
                value={formData.brandId}
                onChange={handleInputChange}
                disabled={!formData.categoryId}
                required
                placeholder={
                  formData.categoryId
                    ? `Select Deity / Theme (${brandsForCategory.length} available)`
                    : "Select a category first"
                }
              >
                {brandsForCategory.map((brand) => (
                  <AdminSelectOption
                    key={brandOptionKey(brand)}
                    optionKey={brandOptionKey(brand)}
                    value={brand.id}
                  >
                    {brand.name}
                  </AdminSelectOption>
                ))}
              </AdminSelect>
              {!formData.categoryId && (
                <p className="text-xs font-semibold text-[#c9a227] mt-1">
                  Select a category first (Deity Prints, Temple Prints, etc.)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="e.g. FOD-DEITY-001"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                Collection Type
              </label>
              <input
                type="text"
                name="collectionType"
                value={formData.collectionType}
                onChange={handleInputChange}
                placeholder="e.g. Sacred Tanjore Sanctum"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Descriptions</h3>
          
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              Short Description
            </label>
            <input
              type="text"
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleInputChange}
              placeholder="Brief 1-line description"
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              Full Description
            </label>
            <textarea
              name="fullDescription"
              value={formData.fullDescription}
              onChange={handleInputChange}
              rows={4}
              placeholder="Detailed product description with features and benefits..."
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Pricing</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                Price (₹) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                placeholder="9999"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Inventory</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                Stock Quantity
              </label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleInputChange}
                min="0"
                placeholder="50"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                Stock Status
              </label>
              <AdminSelect
                name="stockStatus"
                value={formData.stockStatus}
                onChange={handleInputChange}
              >
                <AdminSelectOption optionKey="stock-in" value="in_stock">
                  In Stock
                </AdminSelectOption>
                <AdminSelectOption optionKey="stock-low" value="low_stock">
                  Low Stock
                </AdminSelectOption>
                <AdminSelectOption optionKey="stock-out" value="out_of_stock">
                  Out of Stock
                </AdminSelectOption>
              </AdminSelect>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Product Images</h3>
          <p className="text-xs text-zinc-400">Upload images or paste image URLs (up to 5)</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="text-xs text-zinc-500 font-medium">
                  {index === 0 ? "Main Image" : `Image ${index + 1}`}
                  {index < 2 && <span className="text-[var(--accent-1)] ml-1">*</span>}
                </div>

                {/* Preview */}
                {imagePreviews[index] && (
                  <div className="relative w-full h-32 bg-black border border-white/10 rounded-lg overflow-hidden">
                    <img
                      src={imagePreviews[index]}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newUrls = [...imageUrls];
                        newUrls[index] = "";
                        setImageUrls(newUrls);
                        const newPreviews = [...imagePreviews];
                        newPreviews[index] = "";
                        setImagePreviews(newPreviews);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* URL Input */}
                <input
                  type="text"
                  value={imageUrls[index]}
                  onChange={(e) => handleImageUrlChange(index, e.target.value)}
                  placeholder="Paste image URL or upload below"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const url = imageUrls[index];
                      if (!url) return setMessage({ text: "No URL to import", type: "error" });
                      try {
                        setUploadingImages((s) => {
                          const copy = [...s];
                          copy[index] = true;
                          return copy;
                        });
                        const publicUrl = await uploadAdminRemoteUrl(url);
                        const newUrls = [...imageUrls];
                        newUrls[index] = publicUrl;
                        setImageUrls(newUrls);
                        const newPreviews = [...imagePreviews];
                        newPreviews[index] = publicUrl;
                        setImagePreviews(newPreviews);
                        setMessage({ text: "✓ Image imported to storage", type: "success" });
                      } catch (err) {
                        setMessage({ text: `Import failed: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
                      } finally {
                        setUploadingImages((s) => {
                          const copy = [...s];
                          copy[index] = false;
                          return copy;
                        });
                      }
                    }}
                    className="px-3 py-2 bg-[#c9a227] rounded-lg text-black text-xs font-bold hover:brightness-110 transition-all shadow-sm"
                  >
                    Import URL
                  </button>
                  <span className="text-xs text-zinc-500 self-center">or upload below</span>
                </div>

                {/* Upload */}
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-white/20 rounded-lg px-3 py-2 cursor-pointer hover:border-[var(--accent-1)] hover:bg-white/5 transition-all"
                >
                  {uploadingImages[index] ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-[var(--accent-1)]" />
                      <span className="text-xs text-zinc-400">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-400">Upload Image</span>
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
              onClick={() =>
                setSizesList([
                  { label: "13 × 15 inches", priceDelta: 0 },
                  { label: "15 × 18 inches", priceDelta: 500 },
                  { label: "17 × 21 inches", priceDelta: 1200 },
                  { label: "20 × 24 inches", priceDelta: 2200 },
                  { label: "22 × 28 inches", priceDelta: 3400 },
                ])
              }
              className="text-[11px] font-bold text-[#c9a227] bg-[#c9a227]/10 hover:bg-[#c9a227]/20 border border-[#c9a227]/30 px-3 py-1.5 rounded-lg transition-all w-fit"
            >
              + Load Standard Tanjore Sizes
            </button>
          </div>

          {/* Existing Sizes Chips */}
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-black/40 rounded-xl border border-white/5">
            {sizesList.length === 0 ? (
              <span className="text-xs text-zinc-500 italic p-1">No custom sizes configured. Add one below.</span>
            ) : (
              sizesList.map((s) => (
                <span
                  key={s.label}
                  className="flex items-center gap-2 text-xs bg-black border border-[#c9a227]/40 text-white px-3 py-2 rounded-lg"
                >
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-[#e8c75d] font-bold">
                    {s.priceDelta > 0 ? `+₹${s.priceDelta.toLocaleString("en-IN")}` : "+₹0"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSizesList(sizesList.filter((item) => item.label !== s.label))}
                    className="text-zinc-400 hover:text-red-400 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
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
              onClick={() => {
                const label = sizeInput.trim();
                if (!label) return;
                const delta = Number(sizeDeltaInput.trim().replace(/[^\d.]/g, "")) || 0;
                if (!sizesList.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
                  setSizesList([...sizesList, { label, priceDelta: delta }]);
                }
                setSizeInput("");
                setSizeDeltaInput("");
              }}
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
              onClick={() =>
                setMaterialsList([
                  { label: "22 Carat Exclusive", priceDelta: 0 },
                  { label: "24 Carat Exclusive", priceDelta: 2000 },
                  { label: "Teak Wood Frame", priceDelta: 0 },
                  { label: "Antique Gold Carved Frame", priceDelta: 1500 },
                ])
              }
              className="text-[11px] font-bold text-[#c9a227] bg-[#c9a227]/10 hover:bg-[#c9a227]/20 border border-[#c9a227]/30 px-3 py-1.5 rounded-lg transition-all w-fit"
            >
              + Load Standard Gold & Framing
            </button>
          </div>

          {/* Existing Materials Chips */}
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-black/40 rounded-xl border border-white/5">
            {materialsList.length === 0 ? (
              <span className="text-xs text-zinc-500 italic p-1">No framing options configured. Add one below.</span>
            ) : (
              materialsList.map((m) => (
                <span
                  key={m.label}
                  className="flex items-center gap-2 text-xs bg-black border border-[#c9a227]/40 text-white px-3 py-2 rounded-lg"
                >
                  <span className="font-semibold">{m.label}</span>
                  <span className="text-[#e8c75d] font-bold">
                    {m.priceDelta > 0 ? `+₹${m.priceDelta.toLocaleString("en-IN")}` : "+₹0"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMaterialsList(materialsList.filter((item) => item.label !== m.label))}
                    className="text-zinc-400 hover:text-red-400 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
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
              onClick={() => {
                const label = materialInput.trim();
                if (!label) return;
                const delta = Number(materialDeltaInput.trim().replace(/[^\d.]/g, "")) || 0;
                if (!materialsList.some((m) => m.label.toLowerCase() === label.toLowerCase())) {
                  setMaterialsList([...materialsList, { label, priceDelta: delta }]);
                }
                setMaterialInput("");
                setMaterialDeltaInput("");
              }}
              className="px-4 py-2.5 bg-[#c9a227] text-black font-bold uppercase tracking-wider text-xs rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Material
            </button>
          </div>
        </div>

          {/* Paper & Medium */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Print Medium & Paper (e.g. 310 GSM Cotton Rag, Archival Canvas)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.materials.map((material) => (
                <span
                  key={material}
                  className="flex items-center gap-1.5 text-xs bg-zinc-800 text-zinc-300 border border-white/10 px-3 py-1.5 rounded-lg font-medium"
                >
                  {material}
                  <button
                    type="button"
                    onClick={() => removeTag(material, "materials")}
                    className="hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(materialInput, setMaterialInput, "materials");
                  }
                }}
                placeholder="Type material and press Enter (e.g. Leather, Steel)"
                className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--accent-1)] focus:outline-none transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => addTag(materialInput, setMaterialInput, "materials")}
                className="px-5 py-3 bg-[#c9a227] text-black rounded-lg font-bold hover:brightness-110 transition-all text-xs uppercase tracking-wider shadow-sm"
              >
                Add
              </button>
            </div>
          </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-white/20 accent-[var(--accent-1)]"
              />
              <span className="text-sm text-white font-medium">Mark as Featured</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <input
                type="checkbox"
                name="isTrending"
                checked={formData.isTrending}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-white/20 accent-[var(--accent-1)]"
              />
              <span className="text-sm text-white font-medium">Trending on Homepage</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-white/20 accent-[var(--accent-1)]"
              />
              <span className="text-sm text-white font-medium">Active / Published</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-[#c9a227] text-black font-black uppercase tracking-widest text-sm px-6 py-4 rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-[#c9a227]/20"
        >
          {saving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Add Product
            </>
          )}
        </button>
      </form>
    </div>
  );
}
