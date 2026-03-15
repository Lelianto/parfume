"use client";

import { Check, Clock, Circle } from "lucide-react";
import type { OrderStatus } from "@/types/database";

const STEPS: { status: OrderStatus[]; label: string; desc: string }[] = [
  {
    status: ["pending_payment"],
    label: "Menunggu Pembayaran",
    desc: "Upload bukti transfer sebelum batas waktu",
  },
  {
    status: ["paid"],
    label: "Verifikasi Pembayaran",
    desc: "Admin sedang memverifikasi pembayaran kamu",
  },
  {
    status: ["confirmed"],
    label: "Pembayaran Dikonfirmasi",
    desc: "Pembayaran diterima, menunggu proses",
  },
  {
    status: ["decanting"],
    label: "Sedang Disiapkan",
    desc: "Seller sedang menyiapkan pesanan kamu",
  },
  {
    status: ["shipped"],
    label: "Dalam Pengiriman",
    desc: "Paket sedang dalam perjalanan menuju kamu",
  },
  {
    status: ["completed"],
    label: "Pesanan Selesai",
    desc: "Pesanan telah diterima, terima kasih!",
  },
];

const STATUS_ORDER: OrderStatus[] = [
  "pending_payment",
  "paid",
  "confirmed",
  "decanting",
  "shipped",
  "completed",
];

function getStepIndex(status: OrderStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") return null;

  const currentIndex = getStepIndex(status);

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={i} className="flex gap-4">
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    : isActive
                    ? "border-gold-500/60 bg-gold-400/15 text-gold-400"
                    : "border-gold-900/20 bg-surface-300/50 text-gold-800/30"
                }`}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : isActive ? (
                  <Clock size={14} />
                ) : (
                  <Circle size={10} />
                )}
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`mt-1 w-px flex-1 ${
                    isDone ? "bg-emerald-500/25" : "bg-gold-900/15"
                  }`}
                  style={{ minHeight: "28px" }}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${i === STEPS.length - 1 ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-medium ${
                  isDone
                    ? "text-gold-200/50"
                    : isActive
                    ? "text-gold-100"
                    : "text-gold-200/25"
                }`}
              >
                {step.label}
              </p>
              {isActive && (
                <p className="mt-0.5 text-xs text-gold-200/40">{step.desc}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
