/**
 * RajaOngkir v2 API utility (via Komerce)
 * Base: https://rajaongkir.komerce.id/api/v1
 *
 * Key differences from legacy:
 * - Destination uses subdistrict-level IDs (kelurahan), not city-level
 * - Cost calculation accepts colon-separated couriers in 1 request
 * - Cost uses application/x-www-form-urlencoded
 * - Response format: { meta, data } (not nested rajaongkir.results)
 */

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

function getApiKey(): string {
  const key = process.env.RAJAONGKIR_API_KEY;
  if (!key) throw new Error("RAJAONGKIR_API_KEY not configured");
  return key;
}

// ── Province list ──

export interface RajaOngkirProvince {
  id: number;
  name: string;
}

export async function fetchProvinces(): Promise<RajaOngkirProvince[]> {
  const res = await fetch(`${BASE_URL}/destination/province`, {
    headers: { key: getApiKey() },
  });
  if (!res.ok) throw new Error(`RajaOngkir province error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// ── Domestic destination search (subdistrict-level) ──

export interface RajaOngkirDestination {
  id: number;
  label: string;
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name: string;
  zip_code: string;
}

/**
 * Search domestic destinations by keyword.
 * Returns subdistrict-level results with IDs usable for cost calculation.
 */
export async function searchDestination(
  search: string,
  limit = 10
): Promise<RajaOngkirDestination[]> {
  const params = new URLSearchParams({
    search,
    limit: String(limit),
    offset: "0",
  });
  const res = await fetch(
    `${BASE_URL}/destination/domestic-destination?${params}`,
    { headers: { key: getApiKey() } }
  );
  if (!res.ok) throw new Error(`RajaOngkir destination error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// ── Shipping cost calculation ──

export interface ShippingCostItem {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

/**
 * Calculate domestic shipping cost.
 * Accepts colon-separated couriers for multi-courier in 1 request.
 * Example: courier = "jne:sicepat:jnt:anteraja:pos"
 */
export async function calculateCost(
  origin: number,
  destination: number,
  weight: number,
  courier: string
): Promise<ShippingCostItem[]> {
  const body = new URLSearchParams({
    origin: String(origin),
    destination: String(destination),
    weight: String(weight),
    courier,
  });

  const res = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
    method: "POST",
    headers: {
      key: getApiKey(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    console.error(
      `[rajaongkir] cost error:`,
      res.status,
      await res.text().catch(() => "")
    );
    return [];
  }

  const json = await res.json();
  return json.data ?? [];
}

// ── Waybill / Tracking ──

export interface TrackingResultData {
  summary: {
    awb: string;
    courier: string;
    service: string;
    status: string;
    date: string;
    desc: string;
    amount: string;
    weight: string;
  };
  detail: {
    origin: string;
    destination: string;
    shipper: string;
    receiver: string;
  };
  history: Array<{
    date: string;
    desc: string;
    location: string;
  }>;
}

/**
 * Track waybill via RajaOngkir v2 API.
 * Returns normalized result matching our TrackingResult interface.
 */
export async function trackWaybill(
  awb: string,
  courier: string
): Promise<TrackingResultData | null> {
  const params = new URLSearchParams({ awb, courier });
  const res = await fetch(`${BASE_URL}/track/waybill?${params}`, {
    method: "POST",
    headers: { key: getApiKey() },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[rajaongkir] waybill error:`, res.status, body);
    // 404 = invalid AWB, not a server error
    return null;
  }

  const json = await res.json();
  if (json.meta?.code !== 200) return null;

  const data = json.data;
  if (!data) return null;

  // Normalize to our TrackingResult format
  // The v2 API format may vary — handle both possible structures
  const summary = data.summary ?? data;
  const details = data.details ?? data.detail ?? {};
  const manifest = data.manifest ?? data.history ?? [];

  return {
    summary: {
      awb: summary.waybill_number ?? summary.awb ?? awb,
      courier: summary.courier_code ?? summary.courier ?? courier,
      service: summary.service_code ?? summary.service ?? "",
      status: summary.status ?? "IN TRANSIT",
      date: summary.waybill_date ?? summary.date ?? "",
      desc: summary.description ?? summary.desc ?? "",
      amount: String(summary.amount ?? "0"),
      weight: String(summary.weight ?? "0"),
    },
    detail: {
      origin: details.origin ?? "",
      destination: details.destination ?? "",
      shipper: details.shipper_name ?? details.shipper ?? "",
      receiver: details.receiver_name ?? details.receiver ?? "",
    },
    history: manifest.map(
      (m: Record<string, string | undefined>) => ({
        date: `${m.manifest_date ?? m.date ?? ""} ${m.manifest_time ?? ""}`.trim(),
        desc: m.manifest_description ?? m.desc ?? m.description ?? "",
        location: m.city_name ?? m.location ?? "",
      })
    ),
  };
}

// ── Destination ID lookup ──

/**
 * Find RajaOngkir destination ID by searching with city/district/village name.
 * Uses the domestic-destination search API, not a cache table.
 * Falls back to city-level match if village-level not found.
 */
export async function findDestinationId(
  village: string,
  district: string,
  city: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<number | null> {
  // First try: search cache table if supabase provided
  if (supabase && village && city) {
    const searchTerm = village.toUpperCase();
    const cityTerm = city.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").toUpperCase();

    const { data: cached } = await supabase
      .from("rajaongkir_cities")
      .select("id")
      .ilike("subdistrict_name", searchTerm)
      .ilike("city_name", `%${cityTerm}%`)
      .limit(1)
      .maybeSingle();

    if (cached) return cached.id;
  }

  // Fallback: live search via API
  const searchTerm = village || district || city;
  if (!searchTerm) return null;

  try {
    const results = await searchDestination(searchTerm, 10);

    // Try to match by village + city
    if (village && city) {
      const cityNorm = city.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").toUpperCase();
      const villageNorm = village.toUpperCase();
      const match = results.find(
        (r) =>
          r.subdistrict_name.toUpperCase() === villageNorm &&
          r.city_name.toUpperCase().includes(cityNorm)
      );
      if (match) return match.id;
    }

    // Try to match by district + city
    if (district && city) {
      const cityNorm = city.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").toUpperCase();
      const districtNorm = district.toUpperCase();
      const match = results.find(
        (r) =>
          r.district_name.toUpperCase() === districtNorm &&
          r.city_name.toUpperCase().includes(cityNorm)
      );
      if (match) return match.id;
    }

    // Last resort: return first result
    if (results.length > 0) return results[0].id;
  } catch (err) {
    console.error("[rajaongkir] findDestinationId error:", err);
  }

  return null;
}
