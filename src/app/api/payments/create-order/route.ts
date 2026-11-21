import { NextRequest, NextResponse } from "next/server";
import {
  getRazorpayClient,
  getRazorpayCredentials,
  calculateAuthoritativeTotal,
} from "@/lib/razorpay";
import { supabaseQuery } from "@/lib/supabaseDb";
import { getDeliverySettingsAsync, calculateDeliveryDates } from "@/lib/deliverySettings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items,
      customer_name,
      customer_phone,
      customer_email,
      shipping_address,
      coupon_code,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!customer_name || !customer_phone || !shipping_address) {
      return NextResponse.json(
        { error: "Customer name, phone, and delivery address are required" },
        { status: 400 }
      );
    }

    // 1. Authoritative Server-Side Price & Coupon Recalculation
    const pricing = await calculateAuthoritativeTotal(items, coupon_code);
    if (!pricing.valid) {
      return NextResponse.json({ error: pricing.error || "Invalid order items" }, { status: 400 });
    }

    // 2. Authoritative Delivery Estimate Snapshot
    const deliverySettings = await getDeliverySettingsAsync();
    const deliveryEstimate = calculateDeliveryDates(
      deliverySettings.min_delivery_days,
      deliverySettings.max_delivery_days,
      deliverySettings.calculation_type,
      deliverySettings.non_delivery_days
    );

    const internalOrderId = `GOD-${Date.now().toString(36).toUpperCase()}`;

    // 3. Initialize Razorpay Client (strictly on backend)
    const razorpay = getRazorpayClient();
    const { keyId } = getRazorpayCredentials();

    // 4. Create Razorpay Order with authoritative amount in paise
    const razorpayOrder = await razorpay.orders.create({
      amount: pricing.amountInPaise,
      currency: "INR",
      receipt: internalOrderId,
      notes: {
        internal_order_id: internalOrderId,
        customer_name: String(customer_name).slice(0, 40),
        customer_phone: String(customer_phone).slice(0, 20),
        item_count: pricing.verifiedItems.length,
        delivery_estimate: deliveryEstimate.displayText,
      },
    });

    if (!razorpayOrder || !razorpayOrder.id) {
      throw new Error("Failed to generate order from Razorpay gateway");
    }

    // 5. Save internal order in Supabase with payment_status = 'pending' and delivery snapshot
    const orderPayload = {
      id: internalOrderId,
      total_amount: pricing.finalAmount,
      subtotal: pricing.subtotal,
      discount_amount: pricing.discountAmount,
      currency: "INR",
      status: "pending",
      payment_status: "pending",
      payment_method: "razorpay",
      fulfillment_status: "pending",
      razorpay_order_id: razorpayOrder.id,
      customer_name: String(customer_name).trim(),
      customer_phone: String(customer_phone).trim(),
      customer_email: customer_email ? String(customer_email).trim() : null,
      shipping_address: JSON.stringify({
        customer_name: String(customer_name).trim(),
        customer_phone: String(customer_phone).trim(),
        customer_email: customer_email ? String(customer_email).trim() : null,
        address: String(shipping_address).trim(),
        payment_method: "razorpay",
        items: pricing.verifiedItems,
        subtotal: pricing.subtotal,
        discount_amount: pricing.discountAmount,
        final_amount: pricing.finalAmount,
        coupon_code: pricing.coupon?.code || null,
        razorpay_order_id: razorpayOrder.id,
        estimated_delivery: {
          min_days: deliveryEstimate.minDays,
          max_days: deliveryEstimate.maxDays,
          min_date: deliveryEstimate.minDate,
          max_date: deliveryEstimate.maxDate,
          text: deliveryEstimate.displayText,
          calculation_type: deliveryEstimate.calculationType,
          created_at: new Date().toISOString(),
        },
      }),
    };

    const { error: dbError } = await supabaseQuery("orders", {
      method: "POST",
      body: orderPayload,
      useServiceRole: true,
    });

    if (dbError) {
      console.warn("Could not insert order in Supabase directly:", dbError);
    }

    return NextResponse.json({
      success: true,
      orderId: internalOrderId,
      razorpayOrderId: razorpayOrder.id,
      amount: pricing.amountInPaise,
      currency: "INR",
      keyId,
      deliveryEstimate,
    });
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to initialize payment gateway" },
      { status: 500 }
    );
  }
}
