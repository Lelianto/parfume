import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const alt = "Split Parfum di Wangiverse";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: split } = await supabase
    .from("splits")
    .select("*, perfume:perfumes(*), variants:split_variants(*)")
    .eq("id", id)
    .single();

  const perfume = split?.perfume;
  const variants = split?.variants ?? [];
  const minPrice = variants.length > 0
    ? Math.min(...variants.map((v: { price: number }) => v.price))
    : split?.price_per_slot ?? 0;
  const totalSold = variants.reduce((s: number, v: { sold: number }) => s + v.sold, 0);
  const totalStock = variants.reduce((s: number, v: { stock: number }) => s + v.stock, 0);
  const progress = totalStock > 0 ? Math.round((totalSold / totalStock) * 100) : 0;
  const slotsLeft = totalStock - totalSold;

  const brand = perfume?.brand ?? "Parfum";
  const name = perfume?.name ?? "Split";
  const concentration = perfume?.concentration ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Left: bottle photo */}
        <div
          style={{
            width: 420,
            height: "100%",
            position: "relative",
            flexShrink: 0,
            display: "flex",
          }}
        >
          {split?.bottle_photo_url ? (
            <img
              src={split.bottle_photo_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8 2 5 6 5 10c0 5 7 12 7 12s7-7 7-12c0-4-3-8-7-8z" fill="#c9a96e" opacity="0.3"/>
              </svg>
            </div>
          )}
          {/* Gradient overlay kanan */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, transparent 60%, #0a0a0a 100%)",
            }}
          />
          {/* Gradient overlay bawah */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, #0a0a0a 0%, transparent 40%)",
            }}
          />
        </div>

        {/* Right: info */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px 56px 48px 32px",
          }}
        >
          {/* Wangiverse wordmark */}
          <div style={{ fontSize: 13, color: "rgba(201,169,110,0.45)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
            wangiverse
          </div>

          {/* Brand */}
          <div style={{ fontSize: 16, color: "rgba(201,169,110,0.6)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
            {brand}
          </div>

          {/* Perfume name */}
          <div style={{ fontSize: 46, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.1, marginBottom: 12, fontFamily: "Georgia, serif" }}>
            {name.length > 28 ? name.slice(0, 28) + "…" : name}
          </div>

          {/* Concentration badge */}
          {concentration && (
            <div
              style={{
                display: "inline-flex",
                padding: "5px 14px",
                borderRadius: 99,
                background: "rgba(201,169,110,0.1)",
                border: "1px solid rgba(201,169,110,0.25)",
                color: "#c9a96e",
                fontSize: 13,
                marginBottom: 32,
                width: "fit-content",
              }}
            >
              {concentration}
            </div>
          )}

          {/* Price */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, color: "rgba(232,213,181,0.35)", marginBottom: 4 }}>
              Mulai dari
            </div>
            <div style={{ fontSize: 38, fontWeight: 700, color: "#c9a96e", fontFamily: "Georgia, serif" }}>
              {formatRupiah(minPrice)}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: "rgba(232,213,181,0.4)" }}>
                {slotsLeft > 0 ? `${slotsLeft} slot tersisa` : "Slot habis"}
              </div>
              <div style={{ fontSize: 13, color: "rgba(201,169,110,0.6)" }}>
                {progress}% terisi
              </div>
            </div>
            <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
              <div
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  height: "100%",
                  background: "linear-gradient(to right, #a07d3a, #c9a96e)",
                  borderRadius: 99,
                }}
              />
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", gap: 8, marginTop: 32 }}>
            {split?.bottle_photo_url && (
              <div style={{ fontSize: 12, color: "rgba(74,222,128,0.7)", padding: "4px 12px", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6 }}>
                ✓ Foto Botol
              </div>
            )}
            {split?.batch_code_photo_url && (
              <div style={{ fontSize: 12, color: "rgba(74,222,128,0.7)", padding: "4px 12px", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6 }}>
                ✓ Batch Code
              </div>
            )}
            {split?.decant_video_url && (
              <div style={{ fontSize: 12, color: "rgba(74,222,128,0.7)", padding: "4px 12px", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6 }}>
                ✓ Video Decant
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
