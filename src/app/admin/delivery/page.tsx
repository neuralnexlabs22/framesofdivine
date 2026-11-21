"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Calendar,
  Save,
  Loader,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  Info,
} from "lucide-react";
import { useCatalog } from "@/context/CatalogContext";
import { useProducts } from "@/context/ProductContext";
import {
  calculateDeliveryDates,
  type DeliverySettings,
  DEFAULT_DELIVERY_SETTINGS,
} from "@/lib/deliverySettings";

export default function AdminDeliverySettingsPage() {
  const { categories } = useCatalog();
  const { products } = useProducts();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });

  // Settings State
  const [minDays, setMinDays] = useState(20);
  const [maxDays, setMaxDays] = useState(25);
  const [calcType, setCalcType] = useState<"calendar_days" | "business_days">("calendar_days");
  const [isActive, setIsActive] = useState(true);
  const [excludeSundays, setExcludeSundays] = useState(true);

  // Overrides State
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, { min_days: number; max_days: number }>
  >({});
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatMin, setNewCatMin] = useState("20");
  const [newCatMax, setNewCatMax] = useState("25");

  const [productOverrides, setProductOverrides] = useState<
    Record<string, { min_days: number; max_days: number }>
  >({});
  const [newProdId, setNewProdId] = useState("");
  const [newProdMin, setNewProdMin] = useState("5");
  const [newProdMax, setNewProdMax] = useState("7");

  // Load current settings from backend
  useEffect(() => {
    fetch("/api/delivery-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const s: DeliverySettings = data.settings;
          setMinDays(s.min_delivery_days ?? 20);
          setMaxDays(s.max_delivery_days ?? 25);
          setCalcType(s.calculation_type || "calendar_days");
          setIsActive(s.is_active !== false);
          setExcludeSundays(Array.isArray(s.non_delivery_days) ? s.non_delivery_days.includes(0) : true);
          setCategoryOverrides(s.category_overrides || {});
          setProductOverrides(s.product_overrides || {});
        }
      })
      .catch((err) => {
        console.error("Failed to load delivery settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Live calculation preview
  const livePreview = useMemo(() => {
    const nonDays = excludeSundays ? [0] : [];
    return calculateDeliveryDates(minDays, maxDays, calcType, nonDays);
  }, [minDays, maxDays, calcType, excludeSundays]);

  const handleSave = async () => {
    if (minDays < 0 || maxDays < 0) {
      setMessage({ text: "Delivery days cannot be negative", type: "error" });
      return;
    }
    if (minDays > maxDays) {
      setMessage({ text: "Minimum delivery days cannot exceed maximum delivery days", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const payload: Partial<DeliverySettings> = {
        min_delivery_days: minDays,
        max_delivery_days: maxDays,
        calculation_type: calcType,
        is_active: isActive,
        non_delivery_days: excludeSundays ? [0] : [],
        category_overrides: categoryOverrides,
        product_overrides: productOverrides,
      };

      const res = await fetch("/api/delivery-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save delivery settings");
      }

      setMessage({ text: "Delivery settings saved successfully!", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategoryOverride = () => {
    if (!newCatSlug) return;
    const min = parseInt(newCatMin, 10);
    const max = parseInt(newCatMax, 10);
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
      alert("Please enter valid minimum and maximum days (min <= max).");
      return;
    }
    setCategoryOverrides((prev) => ({
      ...prev,
      [newCatSlug]: { min_days: min, max_days: max },
    }));
    setNewCatSlug("");
  };

  const handleRemoveCategoryOverride = (key: string) => {
    setCategoryOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddProductOverride = () => {
    if (!newProdId) return;
    const min = parseInt(newProdMin, 10);
    const max = parseInt(newProdMax, 10);
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
      alert("Please enter valid minimum and maximum days (min <= max).");
      return;
    }
    setProductOverrides((prev) => ({
      ...prev,
      [newProdId]: { min_days: min, max_days: max },
    }));
    setNewProdId("");
  };

  const handleRemoveProductOverride = (id: string) => {
    setProductOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-[#c9a227]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-5xl"
    >
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c9a227]">
            Fulfillment & Logistics
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-medium uppercase tracking-tight text-white mt-1">
            Delivery & Shipping Settings
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Configure dynamic calendar-date delivery ranges, business day rules, and product overrides.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#c9a227] text-black font-black uppercase tracking-widest text-xs px-6 py-3.5 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-[#c9a227]/20"
        >
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? "Saving..." : "Save Delivery Settings"}</span>
        </button>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold ${
            message.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Live Date Preview Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#17130a] via-[#120f0a] to-[#0c0a06] border border-[#c9a227]/40 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 rounded-full bg-[#c9a227]/10 filter blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#c9a227]/20 border border-[#c9a227]/40 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] text-[#c9a227]">
              <Clock className="w-3.5 h-3.5" />
              Live Customer Preview (Asia/Kolkata Timezone)
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight">
              &quot;Estimated Delivery: {livePreview.displayText}&quot;
            </h2>
            <p className="text-xs text-zinc-300">
              Customers viewing your store today see this actual calendar date window ({minDays}–{maxDays} {calcType === "business_days" ? "business" : "calendar"} days from today).
            </p>
          </div>
          <div className="bg-black/60 border border-white/10 p-4 rounded-2xl shrink-0 text-right">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block">
              Calculation Type
            </span>
            <span className="text-sm font-bold text-[#c9a227] capitalize">
              {calcType.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Store Default Configuration */}
      <div className="rounded-3xl bg-[#0a0a0a] border border-white/10 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c9a227]/15 border border-[#c9a227]/30 flex items-center justify-center text-[#c9a227]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg uppercase tracking-wider text-white">
                Store Default Delivery Duration
              </h2>
              <p className="text-xs text-zinc-400">
                Applied to all devotional artworks unless an individual product or category override is active.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Active:
            </span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 accent-[#c9a227] cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
              Minimum Delivery Days *
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={minDays}
              onChange={(e) => setMinDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#c9a227] focus:outline-none"
            />
            <p className="text-[11px] text-zinc-500">
              Default requirement: 20 days.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
              Maximum Delivery Days *
            </label>
            <input
              type="number"
              min={minDays}
              max={365}
              value={maxDays}
              onChange={(e) => setMaxDays(Math.max(minDays, parseInt(e.target.value, 10) || 0))}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#c9a227] focus:outline-none"
            />
            <p className="text-[11px] text-zinc-500">
              Default requirement: 25 days.
            </p>
          </div>
        </div>

        {/* Calculation Mode */}
        <div className="space-y-3 pt-2">
          <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block">
            Calculation Method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                calcType === "calendar_days"
                  ? "bg-[#c9a227]/15 border-[#c9a227] text-white"
                  : "bg-black border-white/10 text-zinc-400 hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="calcType"
                checked={calcType === "calendar_days"}
                onChange={() => setCalcType("calendar_days")}
                className="mt-1 accent-[#c9a227]"
              />
              <div>
                <p className="font-bold text-sm text-white">Calendar Days (Standard)</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Consecutive calendar days including weekends.
                </p>
              </div>
            </label>

            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                calcType === "business_days"
                  ? "bg-[#c9a227]/15 border-[#c9a227] text-white"
                  : "bg-black border-white/10 text-zinc-400 hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="calcType"
                checked={calcType === "business_days"}
                onChange={() => setCalcType("business_days")}
                className="mt-1 accent-[#c9a227]"
              />
              <div>
                <p className="font-bold text-sm text-white">Business Working Days</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Excludes Sundays and non-dispatch days from the count.
                </p>
              </div>
            </label>
          </div>
        </div>

        {calcType === "business_days" && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeSundays}
                onChange={(e) => setExcludeSundays(e.target.checked)}
                className="w-4 h-4 accent-[#c9a227]"
              />
              <span className="text-xs text-white font-semibold">
                Exclude Sundays as Non-Delivery / Sanctum Holiday
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Category-Specific Overrides */}
      <div className="rounded-3xl bg-[#0a0a0a] border border-white/10 p-6 md:p-8 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h2 className="font-serif text-lg uppercase tracking-wider text-white">
            Category-Specific Delivery Overrides
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Specify unique delivery ranges for particular devotional categories (e.g. Temple Paintings or Premium Sets).
          </p>
        </div>

        {/* Existing Category Overrides */}
        {Object.keys(categoryOverrides).length > 0 ? (
          <div className="space-y-2 divide-y divide-white/5">
            {Object.entries(categoryOverrides).map(([catKey, ov]) => (
              <div key={catKey} className="pt-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-white capitalize">{catKey}</span>
                  <p className="text-xs text-[#c9a227] font-medium">
                    {ov.min_days} – {ov.max_days} days
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCategoryOverride(catKey)}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No category overrides set. All categories follow store default.</p>
        )}

        {/* Add Category Override Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 items-end">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
              Select Category
            </label>
            <select
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#c9a227] focus:outline-none"
            >
              <option value="">-- Choose Category --</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
              Min Days
            </label>
            <input
              type="number"
              value={newCatMin}
              onChange={(e) => setNewCatMin(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#c9a227] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                Max Days
              </label>
              <input
                type="number"
                value={newCatMax}
                onChange={(e) => setNewCatMax(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#c9a227] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCategoryOverride}
              className="bg-[#c9a227] text-black p-2.5 rounded-xl font-bold hover:brightness-110 shrink-0 self-end"
              title="Add Override"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product-Specific Overrides */}
      <div className="rounded-3xl bg-[#0a0a0a] border border-white/10 p-6 md:p-8 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h2 className="font-serif text-lg uppercase tracking-wider text-white">
            Product-Specific Delivery Overrides
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure express or extended delivery for individual paintings (e.g. 5–7 days for ready stock or 25–35 days for custom commissioned pieces).
          </p>
        </div>

        {Object.keys(productOverrides).length > 0 ? (
          <div className="space-y-2 divide-y divide-white/5">
            {Object.entries(productOverrides).map(([prodId, ov]) => {
              const prod = products.find((p) => p.id === prodId || p.slug === prodId);
              return (
                <div key={prodId} className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-white">
                      {prod ? prod.name : prodId}
                    </span>
                    <p className="text-xs text-[#c9a227] font-medium">
                      {ov.min_days} – {ov.max_days} days
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveProductOverride(prodId)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No product overrides set. You can also set overrides directly on each product&apos;s Edit page.</p>
        )}

        {/* Add Product Override Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 items-end">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
              Select Product
            </label>
            <select
              value={newProdId}
              onChange={(e) => setNewProdId(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#c9a227] focus:outline-none"
            >
              <option value="">-- Choose Painting --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
              Min Days
            </label>
            <input
              type="number"
              value={newProdMin}
              onChange={(e) => setNewProdMin(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#c9a227] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                Max Days
              </label>
              <input
                type="number"
                value={newProdMax}
                onChange={(e) => setNewProdMax(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#c9a227] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddProductOverride}
              className="bg-[#c9a227] text-black p-2.5 rounded-xl font-bold hover:brightness-110 shrink-0 self-end"
              title="Add Override"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
