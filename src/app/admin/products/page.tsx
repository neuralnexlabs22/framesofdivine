"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Edit2, Trash2, Plus, Package, CheckCircle2, XCircle, Sparkles, AlertTriangle } from "lucide-react";
import { useProducts, type Product } from "@/context/ProductContext";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const categories = [
  "All",
  "Deity Paintings",
  "Temple Paintings",
  "Sculpture Paintings",
  "Premium Sets",
] as const;

export default function AdminProductsPage() {
  const { products, deleteProduct, updateProduct } = useProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [stockAvailability, setStockAvailability] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [readyStockOnly, setReadyStockOnly] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const readyStockCount = useMemo(() => {
    return products.filter((p) => Boolean(p.is_ready_stock ?? p.isReadyStock) && (p.stock ?? 10) > 0).length;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const isRS = Boolean(p.is_ready_stock ?? p.isReadyStock);
      const stockQty = p.stock ?? 10;

      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = category === "All" || p.category === category;
      const matchesReadyStock = !readyStockOnly || (isRS && stockQty > 0);

      let matchesStockAvailability = true;
      if (stockAvailability === "in_stock") {
        matchesStockAvailability = stockQty > 0;
      } else if (stockAvailability === "out_of_stock") {
        matchesStockAvailability = stockQty <= 0;
      }

      return matchesSearch && matchesCategory && matchesReadyStock && matchesStockAvailability;
    });
  }, [products, search, category, readyStockOnly, stockAvailability]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      alert(error?.message || "Failed to delete product");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleReadyStock = async (product: Product) => {
    const current = Boolean(product.is_ready_stock ?? product.isReadyStock);
    const nextState = !current;
    setTogglingId(product.id);
    try {
      await updateProduct(product.id, {
        is_ready_stock: nextState,
        isReadyStock: nextState,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to update Ready Stock status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c9a227]">
            Artworks Catalog & Fulfillment
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-medium uppercase tracking-tight text-white mt-1">
            Devotional Prints & Artworks
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            {products.length} total paintings · <span className="text-[#c9a227] font-semibold">{readyStockCount} in Ready Stock</span>
          </p>
        </div>
        <Link
          href="/admin/products/add"
          className="flex items-center justify-center gap-2 bg-[#c9a227] text-black font-black uppercase tracking-widest text-xs px-5 py-3 rounded-xl hover:brightness-110 transition-all shadow-md shadow-[#c9a227]/20"
        >
          <Plus className="w-4 h-4" />
          Add Print
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by painting title, deity, theme, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors"
            />
          </div>

          {/* Stock Availability Dropdown */}
          <select
            value={stockAvailability}
            onChange={(e) => setStockAvailability(e.target.value as any)}
            className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs uppercase tracking-wider font-bold text-zinc-300 focus:border-[#c9a227] focus:outline-none"
          >
            <option value="all">All Inventory</option>
            <option value="in_stock">In Stock (&gt; 0)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>

        {/* Category & Ready Stock Pills */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Dedicated Ready Stock Toggle Filter */}
          <button
            type="button"
            onClick={() => setReadyStockOnly(!readyStockOnly)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              readyStockOnly
                ? "bg-[#c9a227] text-black shadow-md shadow-[#c9a227]/30 ring-2 ring-[#c9a227]"
                : "bg-[#070707] border border-[#c9a227]/40 text-[#c9a227] hover:bg-[#c9a227]/10"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${readyStockOnly ? "bg-black" : "bg-[#c9a227]"}`} />
            ⚡ Ready Stock Only ({readyStockCount})
          </button>

          <span className="text-zinc-600">|</span>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                category === cat && !readyStockOnly
                  ? "bg-white text-black shadow-md"
                  : "bg-[#070707] border border-white/5 text-zinc-400 hover:text-white hover:border-[#c9a227]/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count & Reset */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <p>
          Showing <span className="font-bold text-white">{filtered.length}</span> paintings
          {readyStockOnly && <span className="text-[#c9a227]"> (Filtered: Ready Stock Only)</span>}
        </p>
        {(search || category !== "All" || readyStockOnly || stockAvailability !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("All");
              setReadyStockOnly(false);
              setStockAvailability("all");
            }}
            className="text-[11px] underline uppercase tracking-wider text-[#c9a227]"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Products Grid / Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-[#070707] border border-white/5 rounded-2xl">
          <Package className="w-12 h-12 mb-4 text-zinc-700" />
          <p className="text-sm font-semibold">No devotional paintings found matching your filters</p>
          <button
            onClick={() => {
              setSearch("");
              setCategory("All");
              setReadyStockOnly(false);
              setStockAvailability("all");
            }}
            className="mt-4 px-4 py-2 bg-white/5 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/10"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto bg-[#070707] border border-white/5 rounded-2xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-4 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Devotional Painting
                  </th>
                  <th className="text-left px-5 py-4 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Category
                  </th>
                  <th className="text-center px-5 py-4 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Available Stock
                  </th>
                  <th className="text-center px-5 py-4 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Ready Stock (ON / OFF)
                  </th>
                  <th className="text-right px-5 py-4 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Price
                  </th>
                  <th className="text-left px-5 py-4 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Delivery Estimate
                  </th>
                  <th className="text-right px-5 py-4 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product, i) => {
                  const isRS = Boolean(product.is_ready_stock ?? product.isReadyStock);
                  const stockQty = product.stock ?? 10;
                  const qualifiesReadyStock = isRS && stockQty > 0;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        i < filtered.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-zinc-900 overflow-hidden flex-shrink-0 relative border border-white/5">
                            {product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate max-w-[220px]">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                              {product.brand}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs bg-[#c9a227]/10 text-[#c9a227] border border-[#c9a227]/20 px-2.5 py-1 rounded-lg">
                          {product.category}
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            stockQty <= 0
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : stockQty <= 5
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-green-500/10 text-green-400 border border-green-500/20"
                          }`}
                        >
                          {stockQty <= 0 ? "0 (Out)" : `${stockQty} units`}
                        </span>
                      </td>

                      {/* Ready Stock Toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleReadyStock(product)}
                          disabled={togglingId === product.id}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border inline-flex items-center gap-1.5 ${
                            qualifiesReadyStock
                              ? "bg-[#c9a227] text-black border-[#c9a227] shadow-sm hover:brightness-110"
                              : isRS && stockQty <= 0
                              ? "bg-amber-950/40 text-amber-300 border-amber-600/40"
                              : "bg-black border-white/10 text-zinc-500 hover:text-white hover:border-white/30"
                          }`}
                          title={
                            isRS && stockQty <= 0
                              ? "Marked as Ready Stock, but currently Out of Stock (stock = 0)"
                              : isRS
                              ? "Click to turn OFF Ready Stock"
                              : "Click to turn ON Ready Stock"
                          }
                        >
                          {qualifiesReadyStock ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ON (Live)</span>
                            </>
                          ) : isRS && stockQty <= 0 ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>ON (0 Stock)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>OFF</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-sm text-right font-semibold text-white">
                        {currency.format(product.price)}
                      </td>

                      {/* Delivery Window */}
                      <td className="px-5 py-4 text-sm text-left">
                        <div className="text-xs font-semibold text-zinc-200">
                          {product.delivery_min_days && product.delivery_max_days
                            ? `${product.delivery_min_days}–${product.delivery_max_days} days (Custom)`
                            : "20–25 days (Store Default)"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/edit/${product.id}`}
                            className="p-2 rounded-lg text-zinc-400 hover:text-[#c9a227] hover:bg-[#c9a227]/10 transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          {deleteConfirm === product.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 rounded text-xs font-bold bg-white/5 text-zinc-400 hover:bg-white/10"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(product.id)}
                              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((product) => {
              const isRS = Boolean(product.is_ready_stock ?? product.isReadyStock);
              const stockQty = product.stock ?? 10;
              const qualifiesReadyStock = isRS && stockQty > 0;

              return (
                <div
                  key={product.id}
                  className="bg-[#070707] border border-white/5 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-zinc-900 overflow-hidden flex-shrink-0">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-zinc-300 font-medium mt-0.5">
                        {product.category}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-bold text-[#c9a227]">
                          {currency.format(product.price)}
                        </span>
                        <span className="text-xs text-zinc-400">
                          Stock: {stockQty}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ready Stock Mobile Row */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs font-semibold text-zinc-300">
                      Ready Stock:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleReadyStock(product)}
                      disabled={togglingId === product.id}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                        qualifiesReadyStock
                          ? "bg-[#c9a227] text-black"
                          : isRS && stockQty <= 0
                          ? "bg-amber-900/40 text-amber-300"
                          : "bg-white/10 text-zinc-400"
                      }`}
                    >
                      {qualifiesReadyStock ? "ON (Live)" : isRS && stockQty <= 0 ? "ON (0 Stock)" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <Link
                      href={`/admin/products/edit/${product.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </Link>
                    {deleteConfirm === product.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 bg-white/5 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
