import { NextRequest, NextResponse } from "next/server";
import { supabaseQuery } from "@/lib/supabaseDb";
import { cookies } from "next/headers";
import { getAdminTokenFromCookies, verifyAdminSessionToken } from "@/lib/adminAuth";
import { CustomEnquiry } from "../route";

async function isAuthorizedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = getAdminTokenFromCookies(cookieStore);
  return verifyAdminSessionToken(token);
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await isAuthorizedAdmin();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await request.json();

    // Query site_settings
    let { data: rows } = await supabaseQuery<any[]>("site_settings", {
      query: `key=eq.custom_devotional_enquiries&select=*`,
      useServiceRole: true,
    });

    if (!rows || rows.length === 0) {
      const fallback = await supabaseQuery<any[]>("site_settings", {
        query: `setting_key=eq.custom_devotional_enquiries&select=*`,
        useServiceRole: true,
      });
      rows = fallback.data;
    }

    const currentList: CustomEnquiry[] =
      rows?.[0]?.value?.enquiries || rows?.[0]?.setting_value?.enquiries || [];

    const index = currentList.findIndex((e) => e.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    currentList[index] = {
      ...currentList[index],
      ...body,
      updated_at: new Date().toISOString(),
    };

    const hasKeyCol = rows?.[0]?.key !== undefined;
    const queryCol = hasKeyCol ? "key" : "setting_key";
    const valObj = { enquiries: currentList };

    await supabaseQuery("site_settings", {
      method: "PATCH",
      query: `${queryCol}=eq.custom_devotional_enquiries`,
      body: hasKeyCol
        ? { value: valObj, updated_at: new Date().toISOString() }
        : { setting_value: valObj, updated_at: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, enquiry: currentList[index] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await isAuthorizedAdmin();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    let { data: rows } = await supabaseQuery<any[]>("site_settings", {
      query: `key=eq.custom_devotional_enquiries&select=*`,
      useServiceRole: true,
    });

    if (!rows || rows.length === 0) {
      const fallback = await supabaseQuery<any[]>("site_settings", {
        query: `setting_key=eq.custom_devotional_enquiries&select=*`,
        useServiceRole: true,
      });
      rows = fallback.data;
    }

    const currentList: CustomEnquiry[] =
      rows?.[0]?.value?.enquiries || rows?.[0]?.setting_value?.enquiries || [];

    const filteredList = currentList.filter((e) => e.id !== id);

    const hasKeyCol = rows?.[0]?.key !== undefined;
    const queryCol = hasKeyCol ? "key" : "setting_key";
    const valObj = { enquiries: filteredList };

    await supabaseQuery("site_settings", {
      method: "PATCH",
      query: `${queryCol}=eq.custom_devotional_enquiries`,
      body: hasKeyCol
        ? { value: valObj, updated_at: new Date().toISOString() }
        : { setting_value: valObj, updated_at: new Date().toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
