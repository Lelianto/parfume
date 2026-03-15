import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wangiverse - Split Parfum Premium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            border: "1.5px solid rgba(201,169,110,0.4)",
            background: "rgba(201,169,110,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8 2 5 6 5 10c0 5 7 12 7 12s7-7 7-12c0-4-3-8-7-8z" fill="#c9a96e" opacity="0.9"/>
            <circle cx="12" cy="10" r="3" fill="#0a0a0a"/>
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ fontSize: 18, color: "rgba(201,169,110,0.5)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 20 }}>
          wangiverse
        </div>

        {/* Headline */}
        <div style={{ fontSize: 58, fontWeight: 700, color: "#f5e6c8", textAlign: "center", lineHeight: 1.15, maxWidth: 800 }}>
          Wangi Mewah,
        </div>
        <div style={{ fontSize: 58, fontWeight: 700, color: "#c9a96e", textAlign: "center", lineHeight: 1.15, marginBottom: 24 }}>
          Harga Bersahabat
        </div>

        {/* Subtext */}
        <div style={{ fontSize: 22, color: "rgba(232,213,181,0.45)", textAlign: "center", maxWidth: 580, fontFamily: "sans-serif", fontWeight: 400 }}>
          Platform split parfum premium original. Patungan bareng, hemat budget.
        </div>

        {/* Bottom pills */}
        <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
          {["100% Autentik", "Parfum Original", "Pengiriman Aman"].map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 20px",
                borderRadius: 99,
                border: "1px solid rgba(201,169,110,0.2)",
                background: "rgba(201,169,110,0.05)",
                color: "rgba(201,169,110,0.6)",
                fontSize: 14,
                fontFamily: "sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
