import { NextRequest, NextResponse } from "next/server";
import { triggerOrderPaidWhatsAppNotification } from "@/lib/whatsappNotification";
import { cookies } from "next/headers";
import { getAdminTokenFromCookies, verifyAdminSessionToken } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = getAdminTokenFromCookies(cookieStore);
    if (!token || !(await verifyAdminSessionToken(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const orderId = body.order_id;
    if (!orderId) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    const result = await triggerOrderPaidWhatsAppNotification(orderId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}
