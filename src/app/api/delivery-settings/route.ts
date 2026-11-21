import { NextRequest, NextResponse } from "next/server";
import {
  getDeliverySettingsAsync,
  saveDeliverySettingsAsync,
  calculateDeliveryDates,
  DEFAULT_DELIVERY_SETTINGS,
} from "@/lib/deliverySettings";

export async function GET() {
  try {
    const settings = await getDeliverySettingsAsync();
    const currentEstimate = calculateDeliveryDates(
      settings.min_delivery_days,
      settings.max_delivery_days,
      settings.calculation_type,
      settings.non_delivery_days
    );

    return NextResponse.json({
      settings,
      currentEstimate,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load delivery settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const minDays = Number(body.min_delivery_days);
    const maxDays = Number(body.max_delivery_days);

    if (isNaN(minDays) || minDays < 0) {
      return NextResponse.json(
        { error: "Minimum delivery days must be a non-negative number" },
        { status: 400 }
      );
    }

    if (isNaN(maxDays) || maxDays < minDays) {
      return NextResponse.json(
        { error: "Maximum delivery days cannot be less than minimum delivery days" },
        { status: 400 }
      );
    }

    if (maxDays > 365) {
      return NextResponse.json(
        { error: "Maximum delivery days cannot exceed 365 days" },
        { status: 400 }
      );
    }

    const saved = await saveDeliverySettingsAsync({
      min_delivery_days: minDays,
      max_delivery_days: maxDays,
      calculation_type: body.calculation_type === "business_days" ? "business_days" : "calendar_days",
      is_active: body.is_active !== false,
      non_delivery_days: Array.isArray(body.non_delivery_days) ? body.non_delivery_days : [0],
      product_overrides: typeof body.product_overrides === "object" ? body.product_overrides : {},
      category_overrides: typeof body.category_overrides === "object" ? body.category_overrides : {},
    });

    const currentEstimate = calculateDeliveryDates(
      saved.min_delivery_days,
      saved.max_delivery_days,
      saved.calculation_type,
      saved.non_delivery_days
    );

    return NextResponse.json({
      success: true,
      settings: saved,
      currentEstimate,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update delivery settings" },
      { status: 500 }
    );
  }
}
