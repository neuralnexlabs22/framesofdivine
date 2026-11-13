import { supabaseQuery } from "@/lib/supabaseDb";

export interface WhatsAppNotificationResult {
  success: boolean;
  orderId: string;
  provider: "meta_cloud_api" | "twilio" | "custom_gateway" | "simulated";
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Normalizes an Indian or international phone number to E.164 format without '+'
 * e.g., "8122228386" -> "918122228386", "+91 81222 28386" -> "918122228386"
 */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Formats a comprehensive, authoritative order notification message
 * based entirely on trusted server-side order and payment records.
 */
export function formatOrderWhatsAppMessage(order: any, paymentDetails?: any): {
  messageText: string;
  firstImageUrl: string | null;
} {
  // Parse order items and shipping details from trusted server fields
  let shippingData: any = {};
  if (typeof order.shipping_address === "string") {
    try {
      shippingData = JSON.parse(order.shipping_address);
    } catch {
      shippingData = {};
    }
  } else if (order.shipping_address && typeof order.shipping_address === "object") {
    shippingData = order.shipping_address;
  }

  // Extract items from order.items or shippingData.items
  let items: any[] = [];
  if (Array.isArray(order.items) && order.items.length > 0) {
    items = order.items;
  } else if (Array.isArray(shippingData.items) && shippingData.items.length > 0) {
    items = shippingData.items;
  }

  // Customer information
  const customerName =
    order.customer_name || shippingData.customer_name || "Devotee Customer";
  const customerPhone =
    order.customer_phone || shippingData.customer_phone || "Not provided";
  const customerEmail =
    order.customer_email || shippingData.customer_email || null;
  const deliveryAddress =
    shippingData.address || order.shipping_address_raw || "Self Pickup / Pending Confirmation";

  // Financial details
  const subtotal = Number(order.subtotal ?? shippingData.subtotal ?? order.total_amount ?? 0);
  const discountAmount = Number(order.discount_amount ?? shippingData.discount_amount ?? 0);
  const couponCode = shippingData.coupon_code || null;
  const finalAmount = Number(order.total_amount ?? shippingData.final_amount ?? subtotal - discountAmount);
  const paymentRef =
    order.razorpay_payment_id ||
    paymentDetails?.razorpay_payment_id ||
    paymentDetails?.id ||
    "Verified Gateway Payment";
  const razorpayOrderId =
    order.razorpay_order_id ||
    paymentDetails?.razorpay_order_id ||
    paymentDetails?.order_id ||
    "N/A";

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  let firstImageUrl: string | null = null;

  // Build items section
  let itemsListText = "";
  if (items.length > 0) {
    items.forEach((item, index) => {
      const itemName = item.name || item.title || "Devotional Tanjore Painting";
      const qty = item.quantity || 1;
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const itemTotal = Number(item.totalPrice || unitPrice * qty);

      const optionsArr = [];
      if (item.size) optionsArr.push(`Size: ${item.size}`);
      if (item.frame) optionsArr.push(`Frame: ${item.frame}`);
      if (item.material) optionsArr.push(`Material: ${item.material}`);
      const optionsStr = optionsArr.length > 0 ? `\n   ↳ _${optionsArr.join(" | ")}_` : "";

      if (!firstImageUrl && item.image && typeof item.image === "string" && item.image.startsWith("http")) {
        firstImageUrl = item.image;
      }

      itemsListText += `${index + 1}. *${itemName}*${optionsStr}\n   ↳ *Qty:* ${qty} × ₹${unitPrice.toLocaleString("en-IN")} = *₹${itemTotal.toLocaleString("en-IN")}*\n`;
    });
  } else {
    itemsListText = "1. *Devotional Artwork Set* — 1 unit\n";
  }

  // Compose complete message
  const lines: string[] = [
    `🕉️ *NEW PAID ORDER RECEIVED — FRAMES OF DIVINE* 🕉️`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 *Order ID:* \`${order.id}\``,
    `💳 *Payment Status:* Verified & Captured (Online)`,
    `🆔 *Razorpay Order ID:* \`${razorpayOrderId}\``,
    `🏷️ *Razorpay Payment Ref:* \`${paymentRef}\``,
    `📅 *Order Time:* ${orderDate} IST`,
    ``,
    `👤 *CUSTOMER DETAILS:*`,
    `• *Name:* ${customerName}`,
    `• *Mobile:* ${customerPhone}`,
    customerEmail ? `• *Email:* ${customerEmail}` : null,
    ``,
    `📍 *DELIVERY ADDRESS:*`,
    `${deliveryAddress}`,
    ``,
    `🖼️ *ORDERED ITEMS (${items.length || 1}):*`,
    itemsListText.trimEnd(),
    ``,
    `💰 *PAYMENT & BILLING SUMMARY:*`,
    `• *Item Subtotal:* ₹${subtotal.toLocaleString("en-IN")}`,
    discountAmount > 0
      ? `• *Coupon Discount:* -₹${discountAmount.toLocaleString("en-IN")} ${couponCode ? `(\`${couponCode}\`)` : ""}`
      : `• *Discount Applied:* None`,
    `• *Packaging & Shipping:* FREE (Insured Art Wooden Crate)`,
    `• *Taxes & GST:* Included in price`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✨ *TOTAL AMOUNT PAID: ₹${finalAmount.toLocaleString("en-IN")}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚡ *Fulfillment Action:* Open Admin Dashboard to review order details and begin framing & sanctum dispatch.`,
  ].filter(Boolean) as string[];

  return {
    messageText: lines.join("\n"),
    firstImageUrl,
  };
}

/**
 * Sends order notification to Admin's WhatsApp via:
 * 1. Meta WhatsApp Business Cloud API (Official Graph API)
 * 2. Twilio API for WhatsApp
 * 3. Custom Gateway / Webhook
 * 4. Simulated / Log Mode (with database persistence)
 */
export async function triggerOrderPaidWhatsAppNotification(
  orderId: string,
  paymentDetails?: any
): Promise<WhatsAppNotificationResult> {
  try {
    // 1. Fetch complete trusted server-side order record from Supabase
    const { data: orders, error: dbError } = await supabaseQuery<any[]>("orders", {
      query: `id=eq.${encodeURIComponent(orderId)}&limit=1`,
      useServiceRole: true,
    });

    if (dbError || !orders || orders.length === 0) {
      console.warn(`[WhatsApp Notification] Order not found in database: ${orderId}`);
      return {
        success: false,
        orderId,
        provider: "simulated",
        error: "Order not found in database",
      };
    }

    const order = orders[0];

    // 2. Deduplication check: Avoid sending duplicate WhatsApp notifications
    let shippingObj: any = {};
    if (typeof order.shipping_address === "string") {
      try {
        shippingObj = JSON.parse(order.shipping_address);
      } catch {
        shippingObj = {};
      }
    } else if (order.shipping_address && typeof order.shipping_address === "object") {
      shippingObj = order.shipping_address;
    }

    if (order.whatsapp_notified_at || shippingObj.whatsapp_notification_sent) {
      console.log(`[WhatsApp Notification] Notification already dispatched for order ${orderId}. Skipping.`);
      return {
        success: true,
        orderId,
        provider: "simulated",
        skipped: true,
        reason: "Already notified",
      };
    }

    // 3. Format message from verified server records
    const { messageText, firstImageUrl } = formatOrderWhatsAppMessage(order, paymentDetails);

    // Target recipient: Admin hotline number
    const targetPhoneRaw =
      process.env.ADMIN_WHATSAPP_NUMBER ||
      process.env.WHATSAPP_ADMIN_PHONE ||
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      "8122228386";
    const recipientPhone = normalizePhoneNumber(targetPhoneRaw);

    let provider: WhatsAppNotificationResult["provider"] = "simulated";
    let messageId: string | undefined;

    // 4. Try Provider 1: Meta WhatsApp Business Cloud API
    const metaToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_BUSINESS_TOKEN;
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (metaToken && metaPhoneId) {
      provider = "meta_cloud_api";
      const metaUrl = `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`;

      let metaPayload: any;
      if (firstImageUrl) {
        metaPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "image",
          image: {
            link: firstImageUrl,
            caption: messageText,
          },
        };
      } else {
        metaPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "text",
          text: {
            preview_url: false,
            body: messageText,
          },
        };
      }

      const metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      });

      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        console.error("[WhatsApp Cloud API Error]:", metaData);
        throw new Error(metaData.error?.message || "Meta WhatsApp Cloud API failed");
      }
      messageId = metaData.messages?.[0]?.id;
      console.log(`[WhatsApp Cloud API] Notification successfully sent to +${recipientPhone}. Message ID: ${messageId}`);
    }
    // 5. Try Provider 2: Twilio WhatsApp API
    else if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_NUMBER
    ) {
      provider = "twilio";
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")
        ? process.env.TWILIO_WHATSAPP_NUMBER
        : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
      const toNumber = `whatsapp:+${recipientPhone}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append("From", fromNumber);
      formData.append("To", toNumber);
      formData.append("Body", messageText);
      if (firstImageUrl) {
        formData.append("MediaUrl", firstImageUrl);
      }

      const twilioRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const twilioData = await twilioRes.json();
      if (!twilioRes.ok) {
        console.error("[Twilio WhatsApp Error]:", twilioData);
        throw new Error(twilioData.message || "Twilio WhatsApp dispatch failed");
      }
      messageId = twilioData.sid;
      console.log(`[Twilio WhatsApp] Notification successfully sent to +${recipientPhone}. SID: ${messageId}`);
    }
    // 6. Try Provider 3: Custom WhatsApp Gateway / Webhook (e.g. Wati, AiSensy, UltraMsg)
    else if (process.env.WHATSAPP_GATEWAY_URL) {
      provider = "custom_gateway";
      const gatewayRes = await fetch(process.env.WHATSAPP_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.WHATSAPP_GATEWAY_TOKEN
            ? { Authorization: `Bearer ${process.env.WHATSAPP_GATEWAY_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          to: recipientPhone,
          message: messageText,
          image_url: firstImageUrl,
          order_id: orderId,
        }),
      });
      const gatewayData = await gatewayRes.json();
      messageId = gatewayData.id || gatewayData.message_id || "gateway_ok";
      console.log(`[Custom WhatsApp Gateway] Dispatched to +${recipientPhone}.`);
    }
    // 7. Fallback: Log mode (Pending credentials)
    else {
      provider = "simulated";
      messageId = `sim_${Date.now()}`;
      console.log(`\n======================================================`);
      console.log(`[WhatsApp Order Alert (Pending Provider Credentials)]`);
      console.log(`To: +${recipientPhone} (Admin Hotline)`);
      if (firstImageUrl) console.log(`Attached Artwork Image: ${firstImageUrl}`);
      console.log(`------------------------------------------------------`);
      console.log(messageText);
      console.log(`======================================================\n`);
    }

    // 8. Update Order in Supabase with Notification Timestamp & Status
    shippingObj.whatsapp_notification_sent = true;
    shippingObj.whatsapp_notified_at = new Date().toISOString();
    shippingObj.whatsapp_provider = provider;
    shippingObj.whatsapp_message_id = messageId;

    await supabaseQuery("orders", {
      method: "PATCH",
      query: `id=eq.${encodeURIComponent(orderId)}`,
      body: {
        shipping_address: JSON.stringify(shippingObj),
        updated_at: new Date().toISOString(),
      },
      useServiceRole: true,
    });

    return {
      success: true,
      orderId,
      provider,
      messageId,
    };
  } catch (err: any) {
    console.error(`[WhatsApp Notification Error] Failed to send alert for order ${orderId}:`, err);
    return {
      success: false,
      orderId,
      provider: "simulated",
      error: err?.message || "Notification dispatch failed",
    };
  }
}

