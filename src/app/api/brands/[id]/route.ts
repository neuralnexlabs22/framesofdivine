import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updatePayload: any = {};
    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.slug !== undefined) updatePayload.slug = String(body.slug).trim();
    if (body.category_name !== undefined) updatePayload.category_name = String(body.category_name).trim();
    if (body.description !== undefined) updatePayload.description = String(body.description).trim();
    if (body.logo_url !== undefined) updatePayload.logo_url = body.logo_url;

    const { data, error } = await supabaseQuery<any[]>("brands", {
      method: "PATCH",
      query: `id=eq.${encodeURIComponent(id)}`,
      body: updatePayload,
      useServiceRole: true,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, brand: data?.[0] || updatePayload });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update brand" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseQuery("brands", {
      method: "DELETE",
      query: `id=eq.${encodeURIComponent(id)}`,
      useServiceRole: true,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete brand" }, { status: 500 });
  }
}
