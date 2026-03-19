"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  Check,
  Package,
  Truck,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { TrackingResult } from "@/types/database";

// ─── Shipping Step Indicator (Shopee-style) ───
function detectShippingPhase(history: TrackingResult["history"], status: string): number {
  // 0 = picked up, 1 = in transit, 2 = arrived at dest city, 3 = out for delivery, 4 = delivered
  const statusLower = status.toLowerCase();
  if (statusLower.includes("delivered") || statusLower.includes("terkirim") || statusLower.includes("diterima")) return 4;

  const allDescs = (history || []).map((h) => h.desc.toLowerCase()).join(" ");

  if (allDescs.includes("antar") || allDescs.includes("delivery") || allDescs.includes("kurir")) return 3;
  if (allDescs.includes("tiba di") || allDescs.includes("received at") || allDescs.includes("kota tujuan")) return 2;
  if (history && history.length > 1) return 1;
  return 0;
}

const SHIPPING_STEPS = [
  { icon: Package, label: "Diambil" },
  { icon: Truck, label: "Dalam Perjalanan" },
  { icon: MapPin, label: "Tiba di Kota" },
  { icon: Truck, label: "Sedang Diantar" },
  { icon: Home, label: "Terkirim" },
];

function ShippingStepIndicator({ phase }: { phase: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      {SHIPPING_STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i <= phase;
        const isCurrent = i === phase;

        return (
          <div key={i} className="flex flex-1 flex-col items-center relative">
            {/* Connector line (before icon) */}
            {i > 0 && (
              <div
                className={`absolute top-3.5 right-1/2 left-0 h-0.5 -translate-x-0 ${
                  i <= phase ? "bg-emerald-500" : "bg-gold-800/20"
                }`}
                style={{ width: "calc(50%)", left: "0" }}
              />
            )}
            {/* Connector line (after icon) */}
            {i < SHIPPING_STEPS.length - 1 && (
              <div
                className={`absolute top-3.5 left-1/2 h-0.5 ${
                  i < phase ? "bg-emerald-500" : "bg-gold-800/20"
                }`}
                style={{ width: "50%" }}
              />
            )}

            {/* Icon circle */}
            <div
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                isCurrent
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : isActive
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                  : "border-gold-800/25 bg-surface-300 text-gold-200/25"
              }`}
            >
              {isActive && i < phase ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                <Icon size={12} />
              )}
            </div>

            {/* Label */}
            <p
              className={`mt-1.5 text-center text-[9px] font-medium leading-tight ${
                isCurrent
                  ? "text-emerald-400"
                  : isActive
                  ? "text-gold-200/50"
                  : "text-gold-200/20"
              }`}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main TrackingTimeline ───
export function TrackingTimeline({
  result,
  fetchedAt,
  cached,
}: {
  result: TrackingResult;
  fetchedAt: string;
  cached: boolean;
}) {
  const { summary, detail, history } = result;
  const items = [...(history || [])].reverse();
  const [expanded, setExpanded] = useState(false);
  const phase = detectShippingPhase(history, summary?.status || "");

  // Show max 3 items when collapsed
  const visibleItems = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <div className="space-y-4">
      {/* ── Step Indicator ── */}
      <ShippingStepIndicator phase={phase} />

      {/* ── Current Status Card ── */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300">
              {summary?.status || "Dalam proses pengiriman"}
            </p>
            {summary?.desc && (
              <p className="mt-0.5 text-xs text-gold-200/50">{summary.desc}</p>
            )}
          </div>
          <span className="ml-2 flex-shrink-0 text-[10px] text-gold-200/25">
            {cached ? "cache" : "live"} &middot;{" "}
            {new Date(fetchedAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Route info */}
        {(detail?.origin || detail?.destination) && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gold-200/35">
            {detail.origin && <span>{detail.origin}</span>}
            {detail.origin && detail.destination && <span>→</span>}
            {detail.destination && <span>{detail.destination}</span>}
          </div>
        )}

        {/* Service info */}
        {summary?.service && (
          <p className="mt-1 text-[10px] text-gold-200/25">
            {summary.courier?.toUpperCase()} {summary.service}
            {summary.weight && ` · ${summary.weight}`}
          </p>
        )}
      </div>

      {/* ── Latest update highlight ── */}
      {items.length > 0 && (
        <div className="rounded-xl border border-gold-900/15 bg-surface-200/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} className="text-gold-400" />
            <p className="text-xs font-semibold text-gold-200/50">
              Riwayat Pengiriman
            </p>
          </div>

          {/* Timeline items */}
          <div className="space-y-0">
            {visibleItems.map((item, i) => {
              const isLatest = i === 0;

              return (
                <div key={i} className="flex gap-3">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                        isLatest
                          ? "bg-emerald-500 text-white"
                          : "border border-gold-800/25 bg-surface-300 text-gold-200/30"
                      }`}
                    >
                      {isLatest ? (
                        <Truck size={10} />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </div>
                    {i < visibleItems.length - 1 && (
                      <div className="w-px flex-1 bg-gold-800/15" style={{ minHeight: "20px" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-4 ${i === visibleItems.length - 1 ? "pb-0" : ""}`}>
                    <p
                      className={`text-[13px] leading-snug ${
                        isLatest ? "font-medium text-gold-100" : "text-gold-200/45"
                      }`}
                    >
                      {item.desc}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-gold-200/25">
                      {item.date && <span>{item.date}</span>}
                      {item.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin size={8} /> {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more / less */}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-gold-400/5 py-2 text-xs font-medium text-gold-400/70 transition-colors hover:bg-gold-400/10"
            >
              {expanded ? (
                <>
                  <ChevronUp size={14} /> Sembunyikan
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Lihat {items.length - 3} riwayat lainnya
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
