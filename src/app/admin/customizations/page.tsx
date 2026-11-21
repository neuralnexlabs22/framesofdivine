"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  MoveUp,
  MoveDown,
  Layers,
  Sparkles,
  Tag,
  DollarSign,
  Eye,
  EyeOff,
  X,
  RotateCcw,
  HelpCircle,
  Check,
} from "lucide-react";
import {
  CustomizationField,
  CustomizationOption,
  defaultCustomizationFields,
} from "@/types/customization";

export default function AdminCustomizationsPage() {
  const [fields, setFields] = useState<CustomizationField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [targetFilter, setTargetFilter] = useState<"all" | "product_page" | "custom_order">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "global" | "category" | "product">("all");

  // Modal State
  const [editingField, setEditingField] = useState<CustomizationField | null>(null);
  const [isNewField, setIsNewField] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // New Option State (per field inline)
  const [newOptionFieldId, setNewOptionFieldId] = useState<string | null>(null);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionDesc, setNewOptionDesc] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState<number>(0);

  // Preview State
  const [previewField, setPreviewField] = useState<CustomizationField | null>(null);
  const [previewSelectedOption, setPreviewSelectedOption] = useState<string>("");

  const loadCustomizations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customizations?include_inactive=true");
      const json = await res.json();
      if (json.fields && Array.isArray(json.fields)) {
        setFields(json.fields);
      } else {
        setFields(defaultCustomizationFields);
      }
    } catch (err) {
      console.error("Failed to load customizations:", err);
      setFields(defaultCustomizationFields);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomizations();
  }, []);

  const showNotification = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveAll = async (updatedFields?: CustomizationField[]) => {
    const payload = updatedFields || fields;
    setSaving(true);
    try {
      const res = await fetch("/api/customizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: payload }),
      });
      const json = await res.json();
      if (res.ok) {
        setFields(json.fields);
        showNotification("All customization fields & options saved live to store!", "success");
      } else {
        showNotification(json.error || "Failed to save customizations", "error");
      }
    } catch (err) {
      showNotification("Network error while saving. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Reset all customization options to the default devotional templates? Any custom additions will be replaced.")) return;
    setFields(defaultCustomizationFields);
    await handleSaveAll(defaultCustomizationFields);
  };

  // Field Reordering
  const moveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const updated = [...fields];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Update display orders
    const normalized = updated.map((f, i) => ({ ...f, displayOrder: i + 1 }));
    setFields(normalized);
    handleSaveAll(normalized);
  };

  // Toggle Field Active
  const toggleFieldActive = (fieldId: string) => {
    const updated = fields.map((f) =>
      f.id === fieldId ? { ...f, active: !f.active } : f
    );
    setFields(updated);
    handleSaveAll(updated);
  };

  // Delete Field
  const deleteField = (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this customization field and all its options?")) return;
    const updated = fields.filter((f) => f.id !== fieldId);
    setFields(updated);
    handleSaveAll(updated);
    showNotification("Customization field deleted", "success");
  };

  // Option Operations
  const toggleOptionActive = (fieldId: string, optionId: string) => {
    const updated = fields.map((f) => {
      if (f.id !== fieldId) return f;
      return {
        ...f,
        options: f.options.map((opt) =>
          opt.id === optionId ? { ...opt, active: !opt.active } : opt
        ),
      };
    });
    setFields(updated);
    handleSaveAll(updated);
  };

  const deleteOption = (fieldId: string, optionId: string) => {
    const updated = fields.map((f) => {
      if (f.id !== fieldId) return f;
      return {
        ...f,
        options: f.options.filter((opt) => opt.id !== optionId),
      };
    });
    setFields(updated);
    handleSaveAll(updated);
  };

  const moveOption = (fieldId: string, optionIndex: number, direction: "up" | "down") => {
    const updated = fields.map((f) => {
      if (f.id !== fieldId) return f;
      const targetIndex = direction === "up" ? optionIndex - 1 : optionIndex + 1;
      if (targetIndex < 0 || targetIndex >= f.options.length) return f;

      const opts = [...f.options];
      const [moved] = opts.splice(optionIndex, 1);
      opts.splice(targetIndex, 0, moved);
      return {
        ...f,
        options: opts.map((o, idx) => ({ ...o, displayOrder: idx + 1 })),
      };
    });
    setFields(updated);
    handleSaveAll(updated);
  };

  const handleAddOptionInline = (fieldId: string) => {
    if (!newOptionLabel.trim()) return;

    const newOpt: CustomizationOption = {
      id: `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      label: newOptionLabel.trim(),
      description: newOptionDesc.trim() || undefined,
      priceDelta: Number(newOptionPrice) || 0,
      active: true,
      displayOrder: 999,
    };

    const updated = fields.map((f) => {
      if (f.id !== fieldId) return f;
      const opts = [...f.options, newOpt].map((o, idx) => ({ ...o, displayOrder: idx + 1 }));
      return { ...f, options: opts };
    });

    setFields(updated);
    handleSaveAll(updated);

    // Reset inline inputs
    setNewOptionLabel("");
    setNewOptionDesc("");
    setNewOptionPrice(0);
    setNewOptionFieldId(null);
  };

  // Field Edit Modal Save
  const handleSaveFieldModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !editingField.label.trim()) return;

    const slug =
      editingField.slug.trim() ||
      editingField.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const fieldToSave: CustomizationField = {
      ...editingField,
      label: editingField.label.trim(),
      slug,
      updatedAt: new Date().toISOString(),
    };

    let updated: CustomizationField[];
    if (isNewField) {
      fieldToSave.id = `field-${Date.now().toString(36)}`;
      fieldToSave.displayOrder = fields.length + 1;
      fieldToSave.createdAt = new Date().toISOString();
      if (!fieldToSave.options) fieldToSave.options = [];
      updated = [...fields, fieldToSave];
    } else {
      updated = fields.map((f) => (f.id === fieldToSave.id ? fieldToSave : f));
    }

    setFields(updated);
    handleSaveAll(updated);
    setShowModal(false);
    setEditingField(null);
    showNotification(isNewField ? "New customization field created!" : "Customization field updated!", "success");
  };

  const openCreateModal = () => {
    setIsNewField(true);
    setEditingField({
      id: "",
      slug: "",
      label: "",
      description: "",
      fieldType: "pills",
      scope: "all",
      appliesTo: "both",
      required: false,
      active: true,
      displayOrder: fields.length + 1,
      options: [],
    });
    setShowModal(true);
  };

  const openEditModal = (field: CustomizationField) => {
    setIsNewField(false);
    setEditingField({ ...field });
    setShowModal(true);
  };

  // Filtering
  const filteredFields = fields.filter((f) => {
    const matchesSearch =
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.options.some((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTarget =
      targetFilter === "all" ||
      f.appliesTo === "both" ||
      f.appliesTo === targetFilter;

    const matchesScope =
      scopeFilter === "all" ||
      (scopeFilter === "global" && f.scope === "all") ||
      (scopeFilter === "category" && f.scope === "category") ||
      (scopeFilter === "product" && f.scope === "product");

    return matchesSearch && matchesTarget && matchesScope;
  });

  // Calculate Metrics
  const totalOptions = fields.reduce((acc, f) => acc + (f.options?.length || 0), 0);
  const activeFieldsCount = fields.filter((f) => f.active).length;
  const pricedOptionsCount = fields.reduce(
    (acc, f) => acc + (f.options?.filter((o) => o.priceDelta > 0).length || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c9a227]">
            Store Configuration
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-medium uppercase tracking-tight text-white mt-1">
            Customization Options Management
          </h1>
          <p className="text-zinc-400 mt-1 text-sm max-w-2xl">
            Dynamically configure dimensions, framing styles, gold materials, and custom fields. Changes update live across all product detail pages and custom order forms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="flex items-center gap-2 bg-[#c9a227] text-black font-bold uppercase tracking-wider text-xs px-5 py-3 rounded-xl hover:brightness-110 shadow-lg shadow-[#c9a227]/20 transition-all disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Saving Live..." : "Save Live"}
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-xs px-5 py-3 rounded-xl border border-white/10 transition-all"
          >
            <Plus className="w-4 h-4 text-[#c9a227]" />
            Add Custom Field
          </button>
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 text-zinc-400 hover:text-white border border-white/5 hover:border-white/20 text-xs px-3.5 py-3 rounded-xl transition-all"
            title="Reset to default devotional templates"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={loadCustomizations}
            disabled={loading}
            className="flex items-center gap-2 text-zinc-400 hover:text-white border border-white/5 hover:border-white/20 text-xs px-3.5 py-3 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Global Message Banner */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-semibold border ${
            message.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </motion.div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#070707] border border-[#c9a227]/20 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Total Fields
            </span>
            <Sliders className="w-4 h-4 text-[#c9a227]" />
          </div>
          <p className="text-3xl font-black text-white">{fields.length}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Configured field categories</span>
        </div>

        <div className="bg-[#070707] border border-white/5 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Active Fields
            </span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-black text-green-400">{activeFieldsCount}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Live on store</span>
        </div>

        <div className="bg-[#070707] border border-white/5 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Total Options
            </span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white">{totalOptions}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Selectable items across fields</span>
        </div>

        <div className="bg-[#070707] border border-white/5 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Price Adjustments
            </span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">{pricedOptionsCount}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Options with additional pricing</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search fields, slugs, or option labels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Target Filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as any)}
            className="bg-[#070707] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 focus:border-[#c9a227] focus:outline-none cursor-pointer"
          >
            <option value="all">Target: All Pages</option>
            <option value="product_page">Target: Product Pages Only</option>
            <option value="custom_order">Target: Custom Order Form Only</option>
          </select>

          {/* Scope Filter */}
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            className="bg-[#070707] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 focus:border-[#c9a227] focus:outline-none cursor-pointer"
          >
            <option value="all">Scope: All Scopes</option>
            <option value="global">Scope: Global (All)</option>
            <option value="category">Scope: Category-Specific</option>
            <option value="product">Scope: Product-Specific</option>
          </select>
        </div>
      </div>

      {/* Fields List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-500">
          <RefreshCw className="w-7 h-7 animate-spin text-[#c9a227]" />
        </div>
      ) : filteredFields.length === 0 ? (
        <div className="bg-[#070707] border border-white/5 rounded-2xl p-16 text-center text-zinc-500">
          <Sliders className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No customization fields found.</p>
          <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
            Try adjusting your search criteria or click &quot;Add Custom Field&quot; to create a new one.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFields.map((field, fieldIndex) => (
            <div
              key={field.id}
              className={`bg-[#070707] border rounded-2xl overflow-hidden transition-all ${
                field.active
                  ? "border-white/10 hover:border-[#c9a227]/40"
                  : "border-white/5 opacity-70"
              }`}
            >
              {/* Field Header */}
              <div className="p-5 md:p-6 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-zinc-500">#{field.displayOrder}</span>
                    <h3 className="font-serif text-xl font-bold text-white tracking-wide">
                      {field.label}
                    </h3>

                    {/* Scope Badge */}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {field.scope === "all" ? "Global (All Products)" : field.scope === "category" ? `Category: ${field.targetCategory}` : `Product: ${field.targetProductId}`}
                    </span>

                    {/* Applies To Badge */}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {field.appliesTo === "both" ? "Product & Custom Order" : field.appliesTo === "product_page" ? "Product Page Only" : "Custom Order Only"}
                    </span>

                    {/* Field Type Badge */}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-zinc-400">
                      Type: {field.fieldType}
                    </span>

                    {field.required && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        Required
                      </span>
                    )}

                    {!field.active && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                        Inactive
                      </span>
                    )}
                  </div>

                  {field.description && (
                    <p className="text-xs text-zinc-400">{field.description}</p>
                  )}
                  <p className="text-[11px] font-mono text-zinc-600">Slug: {field.slug}</p>
                </div>

                {/* Field Header Actions */}
                <div className="flex items-center gap-2">
                  {/* Move Up/Down */}
                  <div className="flex items-center border border-white/5 rounded-xl bg-black overflow-hidden">
                    <button
                      onClick={() => moveField(fieldIndex, "up")}
                      disabled={fieldIndex === 0}
                      className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move Field Up"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveField(fieldIndex, "down")}
                      disabled={fieldIndex === fields.length - 1}
                      className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors border-l border-white/5"
                      title="Move Field Down"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Toggle */}
                  <button
                    onClick={() => toggleFieldActive(field.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      field.active
                        ? "bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                        : "bg-zinc-800 text-zinc-400 border border-white/5 hover:text-white"
                    }`}
                  >
                    {field.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {field.active ? "Active" : "Inactive"}
                  </button>

                  {/* Preview Button */}
                  <button
                    onClick={() => {
                      setPreviewField(field);
                      setPreviewSelectedOption(field.options?.[0]?.label || "");
                    }}
                    className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
                    title="Live Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => openEditModal(field)}
                    className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
                    title="Edit Field Settings"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteField(field.id)}
                    className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/5 transition-all"
                    title="Delete Field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Options Table */}
              <div className="p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <span>Available Options ({field.options?.length || 0})</span>
                  </h4>
                  <button
                    onClick={() => setNewOptionFieldId(newOptionFieldId === field.id ? null : field.id)}
                    className="text-xs font-bold uppercase tracking-wider text-[#c9a227] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {newOptionFieldId === field.id ? "Cancel Add" : "Add Option"}
                  </button>
                </div>

                {/* Inline Add Option Form */}
                {newOptionFieldId === field.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-white/[0.02] border border-[#c9a227]/30 rounded-xl space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">
                          Option Label *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 18 x 24 in or Teak Wood Frame"
                          value={newOptionLabel}
                          onChange={(e) => setNewOptionLabel(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">
                          Short Description (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Traditional pooja mandap size"
                          value={newOptionDesc}
                          onChange={(e) => setNewOptionDesc(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">
                          Price Delta (₹)
                        </label>
                        <input
                          type="number"
                          placeholder="0 for base price, or +500"
                          value={newOptionPrice}
                          onChange={(e) => setNewOptionPrice(Number(e.target.value) || 0)}
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-[#c9a227] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setNewOptionFieldId(null)}
                        className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddOptionInline(field.id)}
                        className="px-4 py-1.5 bg-[#c9a227] text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:brightness-110"
                      >
                        Add to Field
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Options List Grid */}
                {(!field.options || field.options.length === 0) ? (
                  <p className="text-xs text-zinc-600 italic py-2">
                    No options created yet for this field. Click &quot;Add Option&quot; above to add choices.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {field.options.map((option, optIdx) => (
                      <div
                        key={option.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                          option.active
                            ? "bg-black/60 border-white/5 hover:border-white/10"
                            : "bg-black/30 border-white/5 opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-mono text-[10px] text-zinc-600 shrink-0">
                            #{optIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-white truncate">
                              {option.label}
                            </p>
                            {option.description && (
                              <p className="text-xs text-zinc-500 truncate">{option.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Price Delta Badge */}
                        <div className="shrink-0">
                          {option.priceDelta > 0 ? (
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                              +₹{option.priceDelta.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">
                              Base Price
                            </span>
                          )}
                        </div>

                        {/* Option Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Reorder Buttons */}
                          <button
                            onClick={() => moveOption(field.id, optIdx, "up")}
                            disabled={optIdx === 0}
                            className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"
                            title="Move Option Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveOption(field.id, optIdx, "down")}
                            disabled={optIdx === field.options.length - 1}
                            className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"
                            title="Move Option Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active */}
                          <button
                            onClick={() => toggleOptionActive(field.id, option.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              option.active ? "text-green-400 hover:bg-green-500/10" : "text-zinc-600 hover:text-white"
                            }`}
                            title={option.active ? "Deactivate Option" : "Activate Option"}
                          >
                            {option.active ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => deleteOption(field.id, option.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Field Modal */}
      <AnimatePresence>
        {showModal && editingField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#0a0a0a] border border-[#c9a227]/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#c9a227] font-bold">
                    {isNewField ? "New Customization Field" : "Edit Field Settings"}
                  </span>
                  <h3 className="text-xl font-serif font-bold text-white mt-0.5">
                    {editingField.label || "Custom Field Specification"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFieldModal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                      Field Label *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Desired Dimensions, Frame Model"
                      value={editingField.label}
                      onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#c9a227] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                      Field Slug / Key *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. dimensions, frame-model"
                      value={editingField.slug}
                      onChange={(e) => setEditingField({ ...editingField, slug: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-[#c9a227] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                    Customer Guidance / Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Choose standard sanctum proportions or custom wall sizing..."
                    value={editingField.description || ""}
                    onChange={(e) => setEditingField({ ...editingField, description: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#c9a227] focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                      Display Style
                    </label>
                    <select
                      value={editingField.fieldType}
                      onChange={(e) => setEditingField({ ...editingField, fieldType: e.target.value as any })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#c9a227] focus:outline-none cursor-pointer"
                    >
                      <option value="pills">Selectable Button Pills</option>
                      <option value="select">Dropdown Select Box</option>
                      <option value="radio">Radio Button Group</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                      Applies To
                    </label>
                    <select
                      value={editingField.appliesTo}
                      onChange={(e) => setEditingField({ ...editingField, appliesTo: e.target.value as any })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#c9a227] focus:outline-none cursor-pointer"
                    >
                      <option value="both">Both Product Pages & Custom Order</option>
                      <option value="product_page">Product Detail Pages Only</option>
                      <option value="custom_order">Custom Order Form Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                      Scope
                    </label>
                    <select
                      value={editingField.scope}
                      onChange={(e) => setEditingField({ ...editingField, scope: e.target.value as any })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#c9a227] focus:outline-none cursor-pointer"
                    >
                      <option value="all">Global (All Products & Orders)</option>
                      <option value="category">Category-Specific</option>
                      <option value="product">Product-Specific</option>
                    </select>
                  </div>

                  {editingField.scope === "category" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                        Target Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Deity Paintings, Temple Paintings"
                        value={editingField.targetCategory || ""}
                        onChange={(e) => setEditingField({ ...editingField, targetCategory: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#c9a227] focus:outline-none"
                      />
                    </div>
                  )}

                  {editingField.scope === "product" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                        Target Product ID or Slug
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. shiva-nataraja"
                        value={editingField.targetProductId || ""}
                        onChange={(e) => setEditingField({ ...editingField, targetProductId: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#c9a227] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingField.required}
                      onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                      className="rounded accent-[#c9a227]"
                    />
                    <span className="text-xs font-semibold text-zinc-300">Required Selection</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingField.active}
                      onChange={(e) => setEditingField({ ...editingField, active: e.target.checked })}
                      className="rounded accent-[#c9a227]"
                    />
                    <span className="text-xs font-semibold text-zinc-300">Active (Live on store)</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#c9a227] text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg shadow-[#c9a227]/20"
                  >
                    {isNewField ? "Create Field" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Preview Modal */}
      <AnimatePresence>
        {previewField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white border border-black/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-black"
            >
              <div className="flex items-center justify-between border-b border-black/10 pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#996515] font-bold">
                    Devotee Customer Preview
                  </span>
                  <h3 className="text-lg font-serif font-bold text-black mt-0.5">
                    {previewField.label}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewField(null)}
                  className="p-1.5 text-zinc-500 hover:text-black rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {previewField.description && (
                <p className="text-xs text-zinc-600">{previewField.description}</p>
              )}

              {/* Pills Preview */}
              {previewField.fieldType === "pills" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {previewField.options.map((opt) => {
                    const isSelected = previewSelectedOption === opt.label;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPreviewSelectedOption(opt.label)}
                        className={`px-3.5 py-2 text-xs border rounded-sm transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "border-black bg-black text-white font-semibold"
                            : "border-black/20 text-black hover:border-black/60 bg-white"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.priceDelta > 0 && (
                          <span className={isSelected ? "text-amber-300 text-[11px]" : "text-amber-700 text-[11px]"}>
                            (+₹{opt.priceDelta.toLocaleString("en-IN")})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Dropdown Select Preview */}
              {previewField.fieldType === "select" && (
                <div className="pt-2">
                  <select
                    value={previewSelectedOption}
                    onChange={(e) => setPreviewSelectedOption(e.target.value)}
                    className="w-full border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black cursor-pointer"
                  >
                    {previewField.options.map((opt) => (
                      <option key={opt.id} value={opt.label}>
                        {opt.label} {opt.priceDelta > 0 ? `(+₹${opt.priceDelta.toLocaleString("en-IN")})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Radio Group Preview */}
              {previewField.fieldType === "radio" && (
                <div className="space-y-2 pt-2">
                  {previewField.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer ${
                        previewSelectedOption === opt.label
                          ? "border-black bg-black/5"
                          : "border-black/10 hover:border-black/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="preview_radio"
                          checked={previewSelectedOption === opt.label}
                          onChange={() => setPreviewSelectedOption(opt.label)}
                          className="accent-black"
                        />
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </div>
                      {opt.priceDelta > 0 && (
                        <span className="text-xs font-bold text-amber-800">
                          +₹{opt.priceDelta.toLocaleString("en-IN")}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-black/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewField(null)}
                  className="px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black/80"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
