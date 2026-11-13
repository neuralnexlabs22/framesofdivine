import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";
import { products as defaultProducts } from "@/data/products";

function mapDbToProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand || "Frames of Divine",
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    category: row.category,
    images: Array.isArray(row.images) ? row.images : [],
    description: row.description || "",
    stock: row.stock ?? 10,
    colors: Array.isArray(row.colors) ? row.colors : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
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
          slug: p.id,
          brand: p.brand || "Frames of Divine",
          price: p.price,
          original_price: p.originalPrice || null,
          category: p.category,
          images: p.images || [],
          description: p.description || "",
          stock: p.stock ?? 15,
          colors: p.colors || ["Teak Wood Frame", "24 Carat Gold Leaf"],
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
      isNew = false,
      isTrending = false,
    } = body;

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

    const dbPayload = {
      id,
      name: name.trim(),
      slug,
      brand: brand.trim() || "Frames of Divine",
      price: numPrice,
      original_price: originalPrice ? Number(originalPrice) : null,
      category,
      images: Array.isArray(images) ? images : [],
      description: description.trim(),
      stock: Number(stock) || 10,
      colors: Array.isArray(colors) ? colors : [],
      sizes: Array.isArray(sizes) ? sizes : [],
      is_new: Boolean(isNew),
      is_trending: Boolean(isTrending),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseQuery<any[]>("products", {
      method: "POST",
      body: dbPayload,
      useServiceRole: true,
    });

    if (error) {
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

