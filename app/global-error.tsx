"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ background: "#0a0a0a", margin: 0, fontFamily: "sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <AlertTriangle size={32} color="rgba(239,68,68,0.7)" />
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#f5e6c8",
              margin: "0 0 8px",
            }}
          >
            Terjadi kesalahan
          </h1>
          <p style={{ fontSize: 14, color: "rgba(232,213,181,0.4)", maxWidth: 360, margin: "0 0 32px" }}>
            Maaf, ada yang tidak beres. Tim kami sudah diberitahu. Coba refresh halaman atau kembali ke beranda.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                background: "#c9a96e",
                color: "#0a0a0a",
                border: "none",
                borderRadius: 12,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Coba Lagi
            </button>
            <Link
              href="/"
              style={{
                color: "rgba(201,169,110,0.7)",
                border: "1px solid rgba(201,169,110,0.2)",
                borderRadius: 12,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Ke Beranda
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
