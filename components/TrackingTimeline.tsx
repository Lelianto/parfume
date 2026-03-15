"use client";

import { MapPin, Clock, Check } from "lucide-react";
import type { TrackingResult } from "@/types/database";

export function TrackingTimeline({
  result,
  fetchedAt,
  cached,
}: {
  result: TrackingResult;
  fetchedAt: string;
  cached: boolean;
}) {
  const { summary, history } = result;
  // Show latest first
  const items = [...(history || [])].reverse();

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Status Pengiriman
          </p>
          <span className="text-[10px] text-gold-200/25">
            {cached ? "dari cache" : "baru diambil"} &middot;{" "}
            {new Date(fetchedAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-gold-100">
          {summary?.status || "Dalam proses"}
        </p>
        {summary?.desc && (
          <p className="mt-0.5 text-xs text-gold-200/50">{summary.desc}</p>
        )}
        {summary?.service && (
          <p className="mt-1 text-[11px] text-gold-200/30">
            Layanan: {summary.service}
          </p>
        )}
      </div>

      {/* Timeline */}
      {items.length > 0 && (
        <div className="space-y-0">
          {items.map((item, i) => {
            const isLatest = i === 0;

            return (
              <div key={i} className="flex gap-4">
                {/* Icon column */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                      isLatest
                        ? "border-gold-500/60 bg-gold-400/15 text-gold-400"
                        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    {isLatest ? (
                      <Clock size={12} />
                    ) : (
                      <Check size={12} strokeWidth={2.5} />
                    )}
                  </div>
                  {/* Connector line */}
                  {i < items.length - 1 && (
                    <div
                      className={`mt-1 w-px flex-1 ${
                        isLatest ? "bg-gold-500/20" : "bg-emerald-500/25"
                      }`}
                      style={{ minHeight: "24px" }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-5 ${i === items.length - 1 ? "pb-0" : ""}`}>
                  <p
                    className={`text-sm font-medium ${
                      isLatest ? "text-gold-100" : "text-gold-200/50"
                    }`}
                  >
                    {item.desc}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-gold-200/30">
                    {item.date && <span>{item.date}</span>}
                    {item.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={9} /> {item.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
