import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";

export async function GET() {
  try {
    const { data, error } = await supabaseQuery<any[]>("categories", {
      query: "order=display_order.asc",
      useServiceRole: true,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ categories: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, description = "", display_order = 0, image_url = "" } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const id = body.id || `cat-${slug}`;
    const payload = {
      id,
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      display_order: Number(display_order) || 0,
      image_url: image_url || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseQuery<any[]>("categories", {
      method: "POST",
      body: payload,
      useServiceRole: true,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data?.[0] || payload }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to add category" }, { status: 500 });
  }
}

