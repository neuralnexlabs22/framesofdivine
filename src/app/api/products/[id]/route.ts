import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const encoded = encodeURIComponent(id);
    const { data, error } = await supabaseQuery<any[]>("products", {
      query: `or=(id.eq.${encoded},slug.eq.${encoded})&limit=1`,
      useServiceRole: true,
    });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: data[0] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.slug !== undefined) updatePayload.slug = String(body.slug).trim();
    if (body.brand !== undefined) updatePayload.brand = String(body.brand).trim();
    if (body.price !== undefined) updatePayload.price = Number(body.price);
    if (body.originalPrice !== undefined)
      updatePayload.original_price = body.originalPrice ? Number(body.originalPrice) : null;
    if (body.category !== undefined) {
      updatePayload.category = body.category;
    }
    if (body.images !== undefined) updatePayload.images = body.images;
    if (body.description !== undefined) updatePayload.description = String(body.description).trim();
    if (body.stock !== undefined) updatePayload.stock = Number(body.stock);
    if (body.colors !== undefined) updatePayload.colors = body.colors;
    if (body.sizes !== undefined) updatePayload.sizes = body.sizes;
    if (body.frame_models !== undefined || body.frameModels !== undefined) {
      updatePayload.frame_models = body.frame_models || body.frameModels;
    }
    if (body.frame_model !== undefined || body.frameModel !== undefined) {
      updatePayload.frame_model = body.frame_model || body.frameModel;
    }
    if (body.estimated_delivery_days !== undefined || body.estimatedDeliveryDays !== undefined) {
      updatePayload.estimated_delivery_days = body.estimated_delivery_days || body.estimatedDeliveryDays;
    }
    if (body.delivery_fee !== undefined || body.deliveryFee !== undefined) {
      updatePayload.delivery_fee = Number(body.delivery_fee ?? body.deliveryFee ?? 0);
    }
    if (body.isNew !== undefined) updatePayload.is_new = Boolean(body.isNew);
    if (body.isTrending !== undefined) updatePayload.is_trending = Boolean(body.isTrending);

    let { data, error } = await supabaseQuery<any[]>("products", {
      method: "PATCH",
      query: `id=eq.${encodeURIComponent(id)}`,
      body: updatePayload,
      useServiceRole: true,
    });

    if (
      error &&
      typeof error === "string" &&
      (error.includes("frame_models") ||
        error.includes("frame_model") ||
        error.includes("estimated_delivery_days") ||
        error.includes("delivery_fee"))
    ) {
      console.warn("Columns not yet added in Supabase. Falling back to embedded description tag...");
      const fallbackPayload = { ...updatePayload };
      const models = fallbackPayload.frame_models;
      const estDays = fallbackPayload.estimated_delivery_days;
      const delFee = fallbackPayload.delivery_fee;
      delete fallbackPayload.frame_models;
      delete fallbackPayload.frame_model;
      delete fallbackPayload.estimated_delivery_days;
      delete fallbackPayload.delivery_fee;
      let tags = "";
      if (models) {
        tags += `<!--frame_models:${JSON.stringify(models)}-->\n`;
      }
      if (estDays) {
        tags += `<!--delivery_days:${estDays}-->\n`;
      }
      if (delFee !== undefined) {
        tags += `<!--delivery_fee:${delFee}-->\n`;
      }
      if (tags) {
        fallbackPayload.description = `${tags}${fallbackPayload.description || ""}`;
      }
      const retryRes = await supabaseQuery<any[]>("products", {
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(id)}`,
        body: fallbackPayload,
        useServiceRole: true,
      });
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error && typeof error === "string" && error.includes("products_category_check")) {
      console.warn("Retrying patch with fallback category and embedded category tag due to check constraint...");
      const retryPayload = {
        ...updatePayload,
        category: "Deity Paintings",
        description: `<!--category:${body.category}-->\n${updatePayload.description || ""}`,
      };
      const retryRes = await supabaseQuery<any[]>("products", {
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(id)}`,
        body: retryPayload,
        useServiceRole: true,
      });
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data?.[0] || updatePayload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseQuery("products", {
      method: "DELETE",
      query: `id=eq.${encodeURIComponent(id)}`,
      useServiceRole: true,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}

