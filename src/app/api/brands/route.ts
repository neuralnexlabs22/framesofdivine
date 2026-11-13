import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";

export async function GET() {
  try {
    const { data, error } = await supabaseQuery<any[]>("brands", {
      query: "order=created_at.asc",
      useServiceRole: true,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ brands: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load brands" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, category_name = "Deity Paintings", description = "", logo_url = "" } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const brandSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    const id = body.id || `b-${brandSlug}`;
    const payload = {
      id,
      name: name.trim(),
      slug: brandSlug,
      category_name: category_name.trim(),
      description: description.trim(),
      logo_url: logo_url || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseQuery<any[]>("brands", {
      method: "POST",
      body: payload,
      useServiceRole: true,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, brand: data?.[0] || payload }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to add brand" }, { status: 500 });
  }
}
