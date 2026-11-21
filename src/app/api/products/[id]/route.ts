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
    if (body.is_ready_stock !== undefined || body.isReadyStock !== undefined) {
      updatePayload.is_ready_stock = Boolean(body.is_ready_stock ?? body.isReadyStock);
    }
    if (body.delivery_min_days !== undefined || body.deliveryMinDays !== undefined) {
      updatePayload.delivery_min_days = Number(body.delivery_min_days ?? body.deliveryMinDays);
    }
    if (body.delivery_max_days !== undefined || body.deliveryMaxDays !== undefined) {
      updatePayload.delivery_max_days = Number(body.delivery_max_days ?? body.deliveryMaxDays);
    }
    if (body.isNew !== undefined) updatePayload.is_new = Boolean(body.isNew);
    if (body.isTrending !== undefined) updatePayload.is_trending = Boolean(body.isTrending);

    // If description is provided or tags need to be updated, also manage embedded tags in description
    if (
      body.is_ready_stock !== undefined ||
      body.isReadyStock !== undefined ||
      body.delivery_min_days !== undefined ||
      body.delivery_max_days !== undefined
    ) {
      const isRS = Boolean(body.is_ready_stock ?? body.isReadyStock);
      const minD = body.delivery_min_days ?? body.deliveryMinDays;
      const maxD = body.delivery_max_days ?? body.deliveryMaxDays;

      let desc = updatePayload.description || "";
      // If description wasn't in updatePayload, fetch current product description
      if (!desc) {
        const { data: currData } = await supabaseQuery<any[]>("products", {
          query: `id=eq.${encodeURIComponent(id)}&select=description`,
          useServiceRole: true,
        });
        desc = currData?.[0]?.description || "";
      }

      // Clean existing tags
      desc = desc.replace(/<!--ready_stock:.*?-->\s*/g, "");
      desc = desc.replace(/<!--delivery_min_days:.*?-->\s*/g, "");
      desc = desc.replace(/<!--delivery_max_days:.*?-->\s*/g, "");

      let tags = `<!--ready_stock:${isRS ? "true" : "false"}-->\n`;
      if (minD !== undefined) tags += `<!--delivery_min_days:${minD}-->\n`;
      if (maxD !== undefined) tags += `<!--delivery_max_days:${maxD}-->\n`;

      updatePayload.description = `${tags}${desc.trim()}`;
    }

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
        error.includes("delivery_fee") ||
        error.includes("is_ready_stock") ||
        error.includes("delivery_min_days") ||
        error.includes("delivery_max_days"))
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
      delete fallbackPayload.is_ready_stock;
      delete fallbackPayload.delivery_min_days;
      delete fallbackPayload.delivery_max_days;

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
        description: `<!--category:${updatePayload.category}-->\n${updatePayload.description || ""}`,
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
