/**
 * Delivery & Shipping Settings Module
 * Handles dynamic delivery date calculations in Asia/Kolkata timezone,
 * business-day exclusions, priority resolution, and database persistence.
 */

import { supabaseQuery } from "./supabaseDb";

export interface DeliverySettings {
  min_delivery_days: number;
  max_delivery_days: number;
  calculation_type: "calendar_days" | "business_days";
  is_active: boolean;
  non_delivery_days?: number[]; // 0 = Sunday, 1 = Monday, etc. Default: [0] (Sunday)
  product_overrides?: Record<string, { min_days: number; max_days: number }>;
  category_overrides?: Record<string, { min_days: number; max_days: number }>;
  updated_at?: string;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  min_delivery_days: 20,
  max_delivery_days: 25,
  calculation_type: "calendar_days",
  is_active: true,
  non_delivery_days: [0], // Sundays
  product_overrides: {},
  category_overrides: {},
};

export interface DeliveryEstimate {
  minDays: number;
  maxDays: number;
  calculationType: "calendar_days" | "business_days";
  minDate: string; // YYYY-MM-DD
  maxDate: string; // YYYY-MM-DD
  displayText: string; // e.g. "12 Dec – 17 Dec 2026"
  formattedMinDate: string; // "12 Dec 2026"
  formattedMaxDate: string; // "17 Dec 2026"
  isOverride: boolean;
  overrideSource?: "product" | "category" | "store_default";
}

/**
 * Returns current date in Asia/Kolkata timezone as a pure Date object (midnight local)
 */
export function getNowInKolkata(): Date {
  const now = new Date();
  const kolkataStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(kolkataStr);
}

/**
 * Adds business days (skipping specified non-delivery days, e.g. Sundays)
 */
function addBusinessDays(startDate: Date, daysToAdd: number, nonDeliveryDays: number[] = [0]): Date {
  const current = new Date(startDate);
  let added = 0;
  while (added < daysToAdd) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (!nonDeliveryDays.includes(dayOfWeek)) {
      added++;
    }
  }
  return current;
}

/**
 * Adds calendar days
 */
function addCalendarDays(startDate: Date, daysToAdd: number): Date {
  const current = new Date(startDate);
  current.setDate(current.getDate() + daysToAdd);
  return current;
}

function formatDateIST(d: Date): { day: number; month: string; year: number; full: string; iso: string } {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    day,
    month,
    year,
    full: `${day} ${month} ${year}`,
    iso: `${year}-${mm}-${dd}`,
  };
}

/**
 * Formats a clean date range string:
 * - Same month & year: "12 Dec – 17 Dec 2026"
 * - Different month, same year: "28 Nov – 05 Dec 2026"
 * - Different year: "28 Dec 2026 – 04 Jan 2027"
 */
export function formatDateRange(minD: Date, maxD: Date): { displayText: string; minStr: string; maxStr: string } {
  const minInfo = formatDateIST(minD);
  const maxInfo = formatDateIST(maxD);

  let displayText = "";
  if (minInfo.year === maxInfo.year) {
    if (minInfo.month === maxInfo.month) {
      displayText = `${minInfo.day} ${minInfo.month} – ${maxInfo.day} ${maxInfo.month} ${maxInfo.year}`;
    } else {
      displayText = `${minInfo.day} ${minInfo.month} – ${maxInfo.day} ${maxInfo.month} ${maxInfo.year}`;
    }
  } else {
    displayText = `${minInfo.full} – ${maxInfo.full}`;
  }

  return {
    displayText,
    minStr: minInfo.full,
    maxStr: maxInfo.full,
  };
}

/**
 * Calculates delivery date range based on min/max days and calculation type
 */
export function calculateDeliveryDates(
  minDays: number,
  maxDays: number,
  calculationType: "calendar_days" | "business_days" = "calendar_days",
  nonDeliveryDays: number[] = [0],
  baseDate?: Date
): DeliveryEstimate {
  const start = baseDate ? new Date(baseDate) : getNowInKolkata();

  const minD =
    calculationType === "business_days"
      ? addBusinessDays(start, minDays, nonDeliveryDays)
      : addCalendarDays(start, minDays);

  const maxD =
    calculationType === "business_days"
      ? addBusinessDays(start, maxDays, nonDeliveryDays)
      : addCalendarDays(start, maxDays);

  const { displayText, minStr, maxStr } = formatDateRange(minD, maxD);
  const minISO = formatDateIST(minD).iso;
  const maxISO = formatDateIST(maxD).iso;

  return {
    minDays,
    maxDays,
    calculationType,
    minDate: minISO,
    maxDate: maxISO,
    displayText,
    formattedMinDate: minStr,
    formattedMaxDate: maxStr,
    isOverride: false,
    overrideSource: "store_default",
  };
}

/**
 * Resolves delivery estimate for a given product or category according to priority:
 * 1. Product-specific estimate
 * 2. Category-specific estimate
 * 3. Default store estimate
 */
export function resolveDeliveryEstimate(
  product?: {
    id?: string;
    slug?: string;
    category?: string;
    delivery_min_days?: number;
    delivery_max_days?: number;
    estimated_delivery_days?: string;
    is_ready_stock?: boolean;
  },
  settings: DeliverySettings = DEFAULT_DELIVERY_SETTINGS
): DeliveryEstimate {
  const activeSettings = settings || DEFAULT_DELIVERY_SETTINGS;
  const calcType = activeSettings.calculation_type || "calendar_days";
  const nonDeliveryDays = activeSettings.non_delivery_days || [0];

  let minDays = activeSettings.min_delivery_days ?? 20;
  let maxDays = activeSettings.max_delivery_days ?? 25;
  let isOverride = false;
  let overrideSource: "product" | "category" | "store_default" = "store_default";

  // 1. Check Product-Specific Override
  if (product) {
    if (
      product.delivery_min_days !== undefined &&
      product.delivery_max_days !== undefined &&
      product.delivery_min_days > 0 &&
      product.delivery_max_days >= product.delivery_min_days
    ) {
      minDays = product.delivery_min_days;
      maxDays = product.delivery_max_days;
      isOverride = true;
      overrideSource = "product";
    } else {
      const prodKey = product.id || product.slug || "";
      if (prodKey && activeSettings.product_overrides?.[prodKey]) {
        const ov = activeSettings.product_overrides[prodKey];
        if (ov.min_days && ov.max_days && ov.max_days >= ov.min_days) {
          minDays = ov.min_days;
          maxDays = ov.max_days;
          isOverride = true;
          overrideSource = "product";
        }
      }
    }
  }

  // 2. Check Category-Specific Override if no product override
  if (!isOverride && product?.category && activeSettings.category_overrides) {
    const catName = product.category.toLowerCase().trim();
    for (const [key, ov] of Object.entries(activeSettings.category_overrides)) {
      if (
        (key.toLowerCase().trim() === catName || key.toLowerCase().includes(catName) || catName.includes(key.toLowerCase())) &&
        ov.min_days &&
        ov.max_days &&
        ov.max_days >= ov.min_days
      ) {
        minDays = ov.min_days;
        maxDays = ov.max_days;
        isOverride = true;
        overrideSource = "category";
        break;
      }
    }
  }

  const estimate = calculateDeliveryDates(minDays, maxDays, calcType, nonDeliveryDays);
  estimate.isOverride = isOverride;
  estimate.overrideSource = overrideSource;
  return estimate;
}

/**
 * Loads delivery settings persistently from Supabase site_settings table
 */
export async function getDeliverySettingsAsync(): Promise<DeliverySettings> {
  try {
    const { data } = await supabaseQuery<any[]>("site_settings", {
      query: "key=eq.delivery_settings&limit=1",
      useServiceRole: true,
    });

    if (data && data[0]?.value) {
      const val = data[0].value;
      return {
        min_delivery_days: typeof val.min_delivery_days === "number" ? val.min_delivery_days : 20,
        max_delivery_days: typeof val.max_delivery_days === "number" ? val.max_delivery_days : 25,
        calculation_type: val.calculation_type === "business_days" ? "business_days" : "calendar_days",
        is_active: val.is_active !== false,
        non_delivery_days: Array.isArray(val.non_delivery_days) ? val.non_delivery_days : [0],
        product_overrides: typeof val.product_overrides === "object" && val.product_overrides !== null ? val.product_overrides : {},
        category_overrides: typeof val.category_overrides === "object" && val.category_overrides !== null ? val.category_overrides : {},
        updated_at: data[0].updated_at || val.updated_at,
      };
    }
  } catch (err) {
    console.warn("Could not load delivery settings from Supabase, using defaults:", err);
  }

  return DEFAULT_DELIVERY_SETTINGS;
}

/**
 * Saves delivery settings persistently to Supabase site_settings table
 */
export async function saveDeliverySettingsAsync(settings: Partial<DeliverySettings>): Promise<DeliverySettings> {
  const current = await getDeliverySettingsAsync();
  const updated: DeliverySettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
  };

  // Validate
  if (updated.min_delivery_days < 0) updated.min_delivery_days = 0;
  if (updated.max_delivery_days < updated.min_delivery_days) {
    updated.max_delivery_days = updated.min_delivery_days;
  }

  await supabaseQuery("site_settings", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      key: "delivery_settings",
      value: updated,
      updated_at: updated.updated_at,
    },
    useServiceRole: true,
  });

  return updated;
}
