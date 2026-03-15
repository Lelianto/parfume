import { createClient } from "@/lib/supabase/server";
import { SearchFilter } from "@/components/SearchFilter";
import { SplitGrid } from "@/components/SplitGrid";
import { Droplets, Shield, Users, Truck } from "lucide-react";
import type { Split } from "@/types/database";
import { Suspense } from "react";

export const revalidate = 0;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from("splits")
    .select("*, perfume:perfumes(*), variants:split_variants(*)");

  // Search filter
  if (params.q) {
    query = query.or(
      `brand.ilike.%${params.q}%,name.ilike.%${params.q}%`,
      { referencedTable: "perfumes" }
    );
  }

  // Brand filter
  if (params.brand) {
    query = query.eq("perfume.brand", params.brand);
  }

  // Concentration filter
  if (params.concentration) {
    query = query.eq("perfume.concentration", params.concentration);
  }

  // Scent family filter
  if (params.scent) {
    query = query.eq("perfume.scent_family", params.scent);
  }

  // Price filter
  if (params.price_min) {
    query = query.gte("price_per_slot", Number(params.price_min));
  }
  if (params.price_max) {
    query = query.lte("price_per_slot", Number(params.price_max));
  }

  // Sort
  if (params.sort === "price_asc") {
    query = query.order("price_per_slot", { ascending: true });
  } else if (params.sort === "price_desc") {
    query = query.order("price_per_slot", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: splits } = await query;

  // Filter out splits where perfume is null or split is hidden
  const activeSplits = ((splits ?? []) as unknown as Split[]).filter(
    (s) => s.perfume && !s.is_hidden
  );

  // Get distinct brands for filter dropdown
  const { data: brandsData } = await supabase
    .from("perfumes")
    .select("brand")
    .order("brand");

  const brands = [...new Set((brandsData ?? []).map((b) => b.brand))];

  return (
    <div>
      {/* Trust bar */}
      <div className="border-b border-gold-900/20 bg-surface-300/80 py-2.5 pt-20 md:pt-2.5">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-8 px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-gold-200/40">
          <span className="hidden items-center gap-2 sm:flex">
            <Shield size={12} className="text-gold-400/60" />
            100% Autentik
          </span>
          <span className="flex items-center gap-2">
            <Droplets size={12} className="text-gold-400/60" />
            Parfum Original
          </span>
          <span className="hidden items-center gap-2 md:flex">
            <Truck size={12} className="text-gold-400/60" />
            Pengiriman Aman
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 text-center sm:py-32">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-gold-400/[0.04] blur-[120px]" />
        </div>

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-400/50">
            Premium Fragrance Sharing
          </p>
          <h1 className="mx-auto mt-5 max-w-xl font-display text-4xl font-bold leading-[1.15] tracking-[-0.02em] text-gold-100 sm:text-5xl lg:text-6xl">
            Wangi Mewah,
            <br />
            <span className="gold-shimmer">Harga Bersahabat</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-gold-200/40 sm:text-base">
            Gabung bersama pengguna lain untuk menikmati parfum premium dunia.
            Bayar hanya sesuai porsi yang kamu inginkan.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl md:pb-16 pt-6 sm:px-4 py-6">
        {/* Desktop: static grid */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-5">
          {[
            {
              icon: <Droplets size={20} className="text-gold-400" />,
              title: "Parfum Asli",
              desc: "Setiap split dilengkapi foto botol dan batch code sebagai bukti keaslian.",
            },
            {
              icon: <Users size={20} className="text-gold-400" />,
              title: "Beli Bersama",
              desc: "Patungan bareng pengguna lain. Hemat budget, tetap dapat parfum premium.",
            },
            {
              icon: <Shield size={20} className="text-gold-400" />,
              title: "Transparan",
              desc: "Lihat progress split secara real-time dan bukti decant dari seller.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gold-900/20 bg-surface-200/60 p-7 text-center"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold-400/10">
                {f.icon}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-gold-100">
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gold-200/35">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: infinite marquee */}
        <div className="overflow-hidden sm:hidden">
          <div className="flex animate-marquee gap-4 px-4">
            {[...Array(2)].flatMap((_, dupeIdx) =>
              [
                {
                  icon: <Droplets size={20} className="text-gold-400" />,
                  title: "Parfum Asli",
                  desc: "Setiap split dilengkapi foto botol dan batch code sebagai bukti keaslian.",
                },
                {
                  icon: <Users size={20} className="text-gold-400" />,
                  title: "Beli Bersama",
                  desc: "Patungan bareng pengguna lain. Hemat budget, tetap dapat parfum premium.",
                },
                {
                  icon: <Shield size={20} className="text-gold-400" />,
                  title: "Transparan",
                  desc: "Lihat progress split secara real-time dan bukti decant dari seller.",
                },
              ].map((f, i) => (
                <div
                  key={`${dupeIdx}-${i}`}
                  className="w-[70vw] flex-shrink-0 rounded-2xl border border-gold-900/20 bg-surface-200/60 p-6 text-center"
                >
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold-400/10">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-gold-100">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-gold-200/35">
                    {f.desc}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gold-700/20 to-transparent" />
      </div>

      {/* Split Listings */}
      <section className="mx-auto max-w-[1410px] px-4 py-6 md:py-16 sm:px-8">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-gold-100">
          Produk Tersedia
        </h2>

        <div className="mt-4 sm:mt-6">
          <Suspense fallback={null}>
            <SearchFilter brands={brands} />
          </Suspense>
        </div>

        <SplitGrid splits={activeSplits} />
      </section>
    </div>
  );
}
