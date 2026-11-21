import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";
import { products as defaultProducts } from "@/data/products";

function mapDbToProduct(row: any) {
  let cat = row.category_id || row.category || "Deity Paintings";
  let desc = row.description || "";
  if (desc) {
    const match = desc.match(/<!--category:(.*?)-->/);
    if (match) {
      cat = match[1];
      desc = desc.replace(/<!--category:.*?-->\s*/, "");
    }
  }

  let frameModels: any[] = [];
  if (Array.isArray(row.frame_models)) {
    frameModels = row.frame_models;
  } else if (desc.includes("<!--frame_models:")) {
    const match = desc.match(/<!--frame_models:(.*?)-->/);
    if (match) {
      try {
        frameModels = JSON.parse(match[1]);
      } catch {}
      desc = desc.replace(/<!--frame_models:.*?-->\s*/, "");
    }
  }

  let estDelivery = row.estimated_delivery_days;
  if (!estDelivery && desc.includes("<!--delivery_days:")) {
    const match = desc.match(/<!--delivery_days:(.*?)-->/);
    if (match) {
      estDelivery = match[1];
      desc = desc.replace(/<!--delivery_days:.*?-->\s*/, "");
    }
  }

  let delFee = row.delivery_fee;
  if ((delFee === undefined || delFee === null) && desc.includes("<!--delivery_fee:")) {
    const match = desc.match(/<!--delivery_fee:(.*?)-->/);
    if (match) {
      delFee = Number(match[1]) || 0;
      desc = desc.replace(/<!--delivery_fee:.*?-->\s*/, "");
    }
  }

  let isReadyStock = Boolean(row.is_ready_stock);
  if (desc.includes("<!--ready_stock:true-->")) {
    isReadyStock = true;
    desc = desc.replace(/<!--ready_stock:true-->\s*/, "");
  } else if (desc.includes("<!--ready_stock:false-->")) {
    isReadyStock = false;
    desc = desc.replace(/<!--ready_stock:false-->\s*/, "");
  }

  let delMinDays = typeof row.delivery_min_days === "number" ? row.delivery_min_days : undefined;
  let delMaxDays = typeof row.delivery_max_days === "number" ? row.delivery_max_days : undefined;
  if (desc.includes("<!--delivery_min_days:")) {
    const match = desc.match(/<!--delivery_min_days:(\d+)-->/);
    if (match) {
      delMinDays = parseInt(match[1], 10);
      desc = desc.replace(/<!--delivery_min_days:.*?-->\s*/, "");
    }
  }
  if (desc.includes("<!--delivery_max_days:")) {
    const match = desc.match(/<!--delivery_max_days:(\d+)-->/);
    if (match) {
      delMaxDays = parseInt(match[1], 10);
      desc = desc.replace(/<!--delivery_max_days:.*?-->\s*/, "");
    }
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand || "Frames of Divine",
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    category: cat,
    images: Array.isArray(row.images) ? row.images : [],
    description: desc,
    stock: row.stock ?? 10,
    colors: Array.isArray(row.colors) ? row.colors : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    frame_models: frameModels,
    frameModels,
    frame_model: row.frame_model || (frameModels[0]?.label || undefined),
    estimated_delivery_days: estDelivery || "5-7 business days",
    estimatedDeliveryDays: estDelivery || "5-7 business days",
    delivery_fee: Number(delFee || 0),
    deliveryFee: Number(delFee || 0),
    is_ready_stock: isReadyStock,
    isReadyStock,
    delivery_min_days: delMinDays,
    delivery_max_days: delMaxDays,
    deliveryMinDays: delMinDays,
    deliveryMaxDays: delMaxDays,
    isNew: Boolean(row.is_new),
    isTrending: Boolean(row.is_trending),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = "order=created_at.desc";
    if (category && category !== "All") {
      query += `&category=eq.${encodeURIComponent(category)}`;
    }

    const { data: dbRows, error } = await supabaseQuery<any[]>("products", {
      query,
      useServiceRole: true,
    });

    if (error) {
      console.warn("Supabase products query fallback:", error);
      return NextResponse.json({ products: defaultProducts });
    }

    // If Supabase table is completely empty, automatically seed with default products
    if (!dbRows || dbRows.length === 0) {
      console.log("Supabase products table empty. Seeding initial catalog...");
      for (const p of defaultProducts) {
        const seedPayload = {
          id: p.id,
          name: p.name,
          slug: (p as any).slug || p.id,
          brand: p.brand || "Frames of Divine",
          price: p.price,
          original_price: p.originalPrice || Math.round(p.price * 1.35),
          category: p.category,
          images: p.images || [],
          description: p.description || "",
          stock: p.stock ?? 10,
          colors: p.colors || [],
          sizes: p.sizes || ["15 x 18 in", "17 x 21 in", "20 x 24 in"],
          is_new: Boolean(p.isNew),
          is_trending: Boolean(p.isTrending),
        };
        await supabaseQuery("products", {
          method: "POST",
          body: seedPayload,
          useServiceRole: true,
        });
      }

      // Re-fetch seeded rows
      const { data: seededRows } = await supabaseQuery<any[]>("products", {
        query: "order=created_at.desc",
        useServiceRole: true,
      });

      if (seededRows && seededRows.length > 0) {
        return NextResponse.json({ products: seededRows.map(mapDbToProduct) });
      }

      return NextResponse.json({ products: defaultProducts });
    }

    return NextResponse.json({ products: dbRows.map(mapDbToProduct) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      brand = "Frames of Divine",
      price,
      originalPrice,
      category,
      images = [],
      description = "",
      stock = 10,
      colors = [],
      sizes = [],
      frame_models = [],
      frameModels = [],
      estimated_delivery_days,
      estimatedDeliveryDays,
      delivery_fee,
      deliveryFee,
      is_ready_stock,
      isReadyStock,
      delivery_min_days,
      delivery_max_days,
      deliveryMinDays,
      deliveryMaxDays,
      isNew = false,
      isTrending = false,
    } = body;

    const effectiveDeliveryDays = estimated_delivery_days || estimatedDeliveryDays || "5-7 business days";
    const effectiveDeliveryFee = Number(delivery_fee ?? deliveryFee ?? 0);
    const effectiveFrameModels = frame_models.length > 0 ? frame_models : frameModels;
    const effectiveReadyStock = Boolean(is_ready_stock ?? isReadyStock ?? false);
    const effectiveMinDays = delivery_min_days !== undefined ? Number(delivery_min_days) : deliveryMinDays !== undefined ? Number(deliveryMinDays) : undefined;
    const effectiveMaxDays = delivery_max_days !== undefined ? Number(delivery_max_days) : deliveryMaxDays !== undefined ? Number(deliveryMaxDays) : undefined;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    const id = body.id || `god-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const slug =
      body.slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Prepare tags for fallback
    let tags = "";
    tags += `<!--ready_stock:${effectiveReadyStock ? "true" : "false"}-->\n`;
    if (effectiveMinDays !== undefined) tags += `<!--delivery_min_days:${effectiveMinDays}-->\n`;
    if (effectiveMaxDays !== undefined) tags += `<!--delivery_max_days:${effectiveMaxDays}-->\n`;

    const dbPayload: any = {
      id,
      name: name.trim(),
      slug,
      brand: brand.trim() || "Frames of Divine",
      price: numPrice,
      original_price: originalPrice ? Number(originalPrice) : null,
      category,
      images: Array.isArray(images) ? images : [],
      description: `${tags}${description.trim()}`,
      stock: Number(stock) || 10,
      colors: Array.isArray(colors) ? colors : [],
      sizes: Array.isArray(sizes) ? sizes : [],
      frame_models: Array.isArray(effectiveFrameModels) ? effectiveFrameModels : [],
      frame_model: effectiveFrameModels[0]?.label || undefined,
      estimated_delivery_days: effectiveDeliveryDays,
      delivery_fee: effectiveDeliveryFee,
      is_ready_stock: effectiveReadyStock,
      is_new: Boolean(isNew),
      is_trending: Boolean(isTrending),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabaseQuery<any[]>("products", {
      method: "POST",
      body: dbPayload,
      useServiceRole: true,
    });

    if (
      error &&
      typeof error === "string" &&
      (error.includes("frame_models") ||
        error.includes("frame_model") ||
        error.includes("estimated_delivery_days") ||
        error.includes("delivery_fee") ||
        error.includes("is_ready_stock") ||
        error.includes("delivery_min_days") ||
        error.includes("delivery_max_days"))
    ) {
      console.warn("Columns not yet added in Supabase. Falling back to embedded description tags...");
      const fallbackPayload = { ...dbPayload };
      delete fallbackPayload.frame_models;
      delete fallbackPayload.frame_model;
      delete fallbackPayload.estimated_delivery_days;
      delete fallbackPayload.delivery_fee;
      delete fallbackPayload.is_ready_stock;
      delete fallbackPayload.delivery_min_days;
      delete fallbackPayload.delivery_max_days;

      let extraTags = tags;
      if (effectiveFrameModels && effectiveFrameModels.length > 0) {
        extraTags += `<!--frame_models:${JSON.stringify(effectiveFrameModels)}-->\n`;
      }
      if (effectiveDeliveryDays) {
        extraTags += `<!--delivery_days:${effectiveDeliveryDays}-->\n`;
      }
      if (effectiveDeliveryFee !== undefined) {
        extraTags += `<!--delivery_fee:${effectiveDeliveryFee}-->\n`;
      }
      fallbackPayload.description = `${extraTags}${description.trim()}`;
      const retryRes = await supabaseQuery<any[]>("products", {
        method: "POST",
        body: fallbackPayload,
        useServiceRole: true,
      });
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      if (typeof error === "string" && error.includes("products_category_check")) {
        console.warn("Retrying insert with Deity Paintings category fallback and embedded category tag...");
        const retryPayload = {
          ...dbPayload,
          category: "Deity Paintings",
          description: `<!--category:${category}-->\n${dbPayload.description || ""}`,
        };
        const retryRes = await supabaseQuery<any[]>("products", {
          method: "POST",
          body: retryPayload,
          useServiceRole: true,
        });
        if (!retryRes.error) {
          const created = retryRes.data?.[0] ? mapDbToProduct(retryRes.data[0]) : mapDbToProduct(retryPayload);
          return NextResponse.json({ success: true, product: created }, { status: 201 });
        }
      }
      console.error("Supabase insert product error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    const created = data?.[0] ? mapDbToProduct(data[0]) : mapDbToProduct(dbPayload);
    return NextResponse.json({ success: true, product: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
