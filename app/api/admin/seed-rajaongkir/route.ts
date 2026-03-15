import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { fetchProvinces, searchDestination } from "@/lib/rajaongkir";

/**
 * Seed RajaOngkir destination cache.
 * Strategy: fetch all provinces, then search destinations per province name.
 * This populates the cache so city-ID lookups work without live API calls.
 */
export async function POST() {
  const supabase = await createClient();

  // Admin check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const provinces = await fetchProvinces();
    let totalDestinations = 0;
    const errors: string[] = [];

    // For each province, search by province name to get destinations
    for (const prov of provinces) {
      try {
        // Search with a broad term — province name — to get cities in that province
        // RajaOngkir search API returns max results per call
        const destinations = await searchDestination(prov.name, 500);

        if (destinations.length > 0) {
          const rows = destinations.map((d) => ({
            id: d.id,
            province_name: d.province_name,
            city_name: d.city_name,
            district_name: d.district_name,
            subdistrict_name: d.subdistrict_name,
            zip_code: d.zip_code,
            label: d.label,
            fetched_at: new Date().toISOString(),
          }));

          const { error } = await supabase
            .from("rajaongkir_cities")
            .upsert(rows, { onConflict: "id" });

          if (error) {
            errors.push(`${prov.name}: ${error.message}`);
          } else {
            totalDestinations += rows.length;
          }
        }
      } catch (err) {
        errors.push(`${prov.name}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      provinces: provinces.length,
      destinations: totalDestinations,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[seed-rajaongkir] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 }
    );
  }
}
