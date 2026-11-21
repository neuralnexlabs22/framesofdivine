import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";
import { cookies } from "next/headers";
import { getAdminTokenFromCookies, verifyAdminSessionToken } from "@/lib/adminAuth";
import {
  CustomizationField,
  defaultCustomizationFields,
} from "@/types/customization";

async function isAuthorizedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = getAdminTokenFromCookies(cookieStore);
  return verifyAdminSessionToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("target"); // "product_page" | "custom_order"
    const category = searchParams.get("category");
    const productId = searchParams.get("product_id");
    const includeInactive = searchParams.get("include_inactive") === "true";

    // Read from Supabase site_settings
    let { data: rows } = await supabaseQuery<any[]>("site_settings", {
      query: `key=eq.product_customizations&select=*`,
      useServiceRole: true,
    });

    if (!rows || rows.length === 0) {
      const fallback = await supabaseQuery<any[]>("site_settings", {
        query: `setting_key=eq.product_customizations&select=*`,
        useServiceRole: true,
      });
      rows = fallback.data;
    }

    let allFields: CustomizationField[] =
      rows?.[0]?.value?.fields || rows?.[0]?.setting_value?.fields || [];

    // If empty in DB, initialize with default devotional customization templates
    if (allFields.length === 0) {
      allFields = defaultCustomizationFields;

      // Asynchronously store defaults in background
      void (async () => {
        try {
          const timestamp = new Date().toISOString();
          const hasKeyCol = rows?.[0]?.key !== undefined;
          const queryCol = hasKeyCol ? "key" : "setting_key";
          const valObj = { fields: defaultCustomizationFields };

          await supabaseQuery("site_settings", {
            method: "POST",
            body: hasKeyCol
              ? { key: "product_customizations", value: valObj, updated_at: timestamp }
              : { setting_key: "product_customizations", setting_value: valObj, updated_at: timestamp },
          });
        } catch {}
      })();
    }

    // Filter fields based on query parameters
    let filtered = [...allFields];

    if (!includeInactive) {
      filtered = filtered.filter((f) => f.active !== false);
      filtered = filtered.map((f) => ({
        ...f,
        options: (f.options || []).filter((opt) => opt.active !== false),
      }));
    }

    if (target) {
      filtered = filtered.filter(
        (f) => f.appliesTo === "both" || f.appliesTo === target
      );
    }

    if (category || productId) {
      filtered = filtered.filter((f) => {
        if (f.scope === "all") return true;
        if (f.scope === "category" && category) {
          return (
            !f.targetCategory ||
            f.targetCategory === "all" ||
            f.targetCategory.toLowerCase() === category.toLowerCase()
          );
        }
        if (f.scope === "product" && productId) {
          return !f.targetProductId || f.targetProductId === productId;
        }
        return false;
      });
    }

    // Sort by display order
    filtered.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    return NextResponse.json({ success: true, fields: filtered });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load customization fields" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthed = await isAuthorizedAdmin();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fields } = body;

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: "fields must be an array" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    // Check existing row
    let { data: rows } = await supabaseQuery<any[]>("site_settings", {
      query: `key=eq.product_customizations&select=*`,
      useServiceRole: true,
    });

    if (!rows || rows.length === 0) {
      const fallback = await supabaseQuery<any[]>("site_settings", {
        query: `setting_key=eq.product_customizations&select=*`,
        useServiceRole: true,
      });
      rows = fallback.data;
    }

    const hasKeyCol = rows?.[0]?.key !== undefined;
    const queryCol = hasKeyCol ? "key" : "setting_key";
    const valObj = { fields };

    if (rows && rows.length > 0) {
      await supabaseQuery("site_settings", {
        method: "PATCH",
        query: `${queryCol}=eq.product_customizations`,
        body: hasKeyCol
          ? { value: valObj, updated_at: timestamp }
          : { setting_value: valObj, updated_at: timestamp },
      });
    } else {
      await supabaseQuery("site_settings", {
        method: "POST",
        body: hasKeyCol
          ? { key: "product_customizations", value: valObj, updated_at: timestamp }
          : { setting_key: "product_customizations", setting_value: valObj, updated_at: timestamp },
      });
    }

    return NextResponse.json({ success: true, fields });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
