"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  Plus,
  Minus,
  Edit2,
  Sparkles,
} from "lucide-react";
import { useProducts, type Product } from "@/context/ProductContext";

export default function AdminInventoryPage() {
  const { products, updateProduct, loaded } = useProducts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready_stock" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingReadyId, setTogglingReadyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: "Out of Stock", color: "text-red-400 bg-red-950/40 border-red-800/40", icon: XCircle, status: "out_of_stock" };
    if (stock <= 5) return { label: "Low Stock Alert", color: "text-amber-400 bg-amber-950/40 border-amber-800/40", icon: AlertTriangle, status: "low_stock" };
    return { label: "In Stock", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40", icon: CheckCircle2, status: "in_stock" };
  };

  const filteredProducts = products.filter((p) => {
    const stock = editingStock[p.id] !== undefined ? editingStock[p.id] : (p.stock ?? 10);
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    const itemStatus = getStockStatus(stock).status;
    const isRS = Boolean(p.is_ready_stock ?? p.isReadyStock);

    let matchesFilter = true;
    if (statusFilter === "ready_stock") {
      matchesFilter = isRS && stock > 0;
    } else if (statusFilter !== "all") {
      matchesFilter = itemStatus === statusFilter;
    }

    return matchesSearch && matchesFilter;
  });

  const totalStock = products.reduce((acc, p) => acc + (p.stock ?? 10), 0);
  const lowStockCount = products.filter((p) => (p.stock ?? 10) > 0 && (p.stock ?? 10) <= 5).length;
  const outOfStockCount = products.filter((p) => (p.stock ?? 10) <= 0).length;
  const inStockCount = products.length - lowStockCount - outOfStockCount;
  const readyStockCount = products.filter((p) => Boolean(p.is_ready_stock ?? p.isReadyStock) && (p.stock ?? 10) > 0).length;

  const handleStockChange = (productId: string, val: number) => {
    setEditingStock((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  const handleSaveStock = async (product: Product) => {
    const newStock = editingStock[product.id];
    if (newStock === undefined) return;

    setSavingId(product.id);
    try {
      await updateProduct(product.id, { stock: newStock });
      setToastMessage(`✓ Updated stock for ${product.name}`);
      setTimeout(() => setToastMessage(null), 3000);
      setEditingStock((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    } catch (err: any) {
      alert(err?.message || "Failed to update stock");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleReadyStock = async (product: Product) => {
    const current = Boolean(product.is_ready_stock ?? product.isReadyStock);
    const nextVal = !current;
    setTogglingReadyId(product.id);
    try {
      await updateProduct(product.id, {
        is_ready_stock: nextVal,
        isReadyStock: nextVal,
      });
      setToastMessage(`✓ Set Ready Stock ${nextVal ? "ON" : "OFF"} for ${product.name}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to update ready stock");
    } finally {
      setTogglingReadyId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0a0a0a] border border-[#c9a227] text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#c9a227]" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c9a227]">
            Frames of Divine Inventory
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-medium uppercase tracking-tight text-white mt-1">
            Inventory & Ready Stock Control
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Live stock counts across {products.length} devotional prints and authentic Tanjore artworks.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total Stock Units</span>
          <p className="text-2xl font-serif font-bold text-white">{totalStock}</p>
          <span className="text-[11px] text-zinc-500">Across {products.length} prints</span>
        </div>
        <div className="bg-[#0a0a0a] border border-[#c9a227]/40 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-[#c9a227] font-bold">Ready Stock (Live)</span>
          <p className="text-2xl font-serif font-bold text-[#c9a227]">{readyStockCount}</p>
          <span className="text-[11px] text-zinc-400">Available immediately</span>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">In Stock</span>
          <p className="text-2xl font-serif font-bold text-emerald-400">{inStockCount}</p>
          <span className="text-[11px] text-zinc-500">&gt; 5 units</span>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Low Stock Alert</span>
          <p className="text-2xl font-serif font-bold text-amber-400">{lowStockCount}</p>
          <span className="text-[11px] text-zinc-500">1 – 5 units</span>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold">Out of Stock</span>
          <p className="text-2xl font-serif font-bold text-red-400">{outOfStockCount}</p>
          <span className="text-[11px] text-zinc-500">0 units</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by print title, category, deity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { id: "all", label: "All Items" },
              { id: "ready_stock", label: `⚡ Ready Stock (${readyStockCount})` },
              { id: "in_stock", label: "In Stock" },
              { id: "low_stock", label: "Low Stock" },
              { id: "out_of_stock", label: "Out of Stock" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === filter.id
                  ? "bg-[#c9a227] text-black shadow-md shadow-[#c9a227]/20"
                  : "bg-[#0a0a0a] text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-black/60 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/10">
              <tr>
                <th className="py-4 px-6">Artwork / Deity Print</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Base Price</th>
                <th className="py-4 px-6 text-center">Ready Stock</th>
                <th className="py-4 px-6 text-center">Available Stock</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
                    No artworks match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const currentStock = editingStock[product.id] !== undefined
                    ? editingStock[product.id]
                    : (product.stock ?? 10);
                  const isModified = editingStock[product.id] !== undefined && editingStock[product.id] !== (product.stock ?? 10);
                  const statusInfo = getStockStatus(currentStock);
                  const StatusIcon = statusInfo.icon;
                  const isRS = Boolean(product.is_ready_stock ?? product.isReadyStock);
                  const qualifiesReadyStock = isRS && currentStock > 0;

                  return (
                    <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-black border border-white/10 flex-shrink-0">
                            {product.images?.[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{product.name}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{product.brand || "Sacred Collection"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-400">
                        {product.category}
                      </td>
                      <td className="py-4 px-6 text-xs text-white font-serif">
                        ₹{product.price.toLocaleString("en-IN")}
                      </td>

                      {/* Ready Stock Toggle */}
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleReadyStock(product)}
                          disabled={togglingReadyId === product.id}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border inline-flex items-center gap-1.5 ${
                            qualifiesReadyStock
                              ? "bg-[#c9a227] text-black border-[#c9a227] shadow-sm hover:brightness-110"
                              : isRS && currentStock <= 0
                              ? "bg-amber-950/40 text-amber-300 border-amber-600/40"
                              : "bg-black border-white/10 text-zinc-500 hover:text-white"
                          }`}
                        >
                          {qualifiesReadyStock ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ON</span>
                            </>
                          ) : isRS && currentStock <= 0 ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>ON (0 Stock)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>OFF</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Stock Quantity Controls */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStockChange(product.id, currentStock - 1)}
                            className="w-7 h-7 rounded-lg bg-black border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentStock}
                            onChange={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0)}
                            className={`w-16 bg-black border rounded-lg px-2 py-1 text-center text-xs font-bold text-white focus:outline-none transition-colors ${
                              isModified ? "border-[#c9a227] text-[#c9a227]" : "border-white/15"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleStockChange(product.id, currentStock + 1)}
                            className="w-7 h-7 rounded-lg bg-black border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleSaveStock(product)}
                              disabled={savingId === product.id}
                              className="px-3 py-1.5 bg-[#c9a227] text-black text-[10px] font-bold uppercase rounded-lg hover:brightness-110 flex items-center gap-1 shadow-md shadow-[#c9a227]/20 transition-all"
                            >
                              <Save className="w-3 h-3" />
                              {savingId === product.id ? "Saving..." : "Save"}
                            </button>
                          )}
                          <Link
                            href={`/admin/products/edit/${product.id}`}
                            className="p-2 rounded-lg bg-black border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                            title="Edit full product details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
