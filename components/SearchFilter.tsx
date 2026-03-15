"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Concentration } from "@/types/database";

const CONCENTRATIONS: Concentration[] = ["EDP", "EDT", "Parfum", "EDC", "Cologne"];
const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "price_asc", label: "Harga Terendah" },
  { value: "price_desc", label: "Harga Tertinggi" },
];
const SCENT_FAMILIES = ["Woody", "Floral", "Oriental", "Fresh", "Citrus", "Aquatic", "Gourmand", "Aromatic"];

const PRICE_MIN = 0;
const PRICE_MAX = 2000000;
const PRICE_STEP = 25000;

function formatRupiahShort(val: number) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
  if (val >= 1000) return `${Math.round(val / 1000)}rb`;
  return `${val}`;
}

interface SearchFilterProps {
  brands: string[];
}

export function SearchFilter({ brands }: SearchFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const currentBrand = searchParams.get("brand") ?? "";
  const currentConcentration = searchParams.get("concentration") ?? "";
  const currentSort = searchParams.get("sort") ?? "newest";
  const currentScent = searchParams.get("scent") ?? "";
  const currentPriceMin = Number(searchParams.get("price_min") ?? PRICE_MIN);
  const currentPriceMax = Number(searchParams.get("price_max") ?? PRICE_MAX);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [tempBrand, setTempBrand] = useState(currentBrand);
  const [tempConcentration, setTempConcentration] = useState(currentConcentration);
  const [tempSort, setTempSort] = useState(currentSort);
  const [tempScent, setTempScent] = useState(currentScent);
  const [tempPriceMin, setTempPriceMin] = useState(currentPriceMin);
  const [tempPriceMax, setTempPriceMax] = useState(currentPriceMax);

  // Desktop price state (applies immediately on mouse up)
  const [desktopPriceMin, setDesktopPriceMin] = useState(currentPriceMin);
  const [desktopPriceMax, setDesktopPriceMax] = useState(currentPriceMax);
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  useEffect(() => {
    setTempBrand(currentBrand);
    setTempConcentration(currentConcentration);
    setTempSort(currentSort);
    setTempScent(currentScent);
    setTempPriceMin(currentPriceMin);
    setTempPriceMax(currentPriceMax);
    setDesktopPriceMin(currentPriceMin);
    setDesktopPriceMax(currentPriceMax);
  }, [currentBrand, currentConcentration, currentSort, currentScent, currentPriceMin, currentPriceMax]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({ q: search });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, updateParams]);

  const hasPriceFilter = currentPriceMin > PRICE_MIN || currentPriceMax < PRICE_MAX;
  const hasFilters = search || currentBrand || currentConcentration || currentScent || currentSort !== "newest" || hasPriceFilter;
  const activeFilterCount = [
    currentBrand,
    currentConcentration,
    currentScent,
    currentSort !== "newest" ? currentSort : "",
    hasPriceFilter ? "price" : "",
  ].filter(Boolean).length;

  function applyDesktopPrice() {
    const min = desktopPriceMin <= PRICE_MIN ? "" : String(desktopPriceMin);
    const max = desktopPriceMax >= PRICE_MAX ? "" : String(desktopPriceMax);
    updateParams({ price_min: min, price_max: max });
  }

  function clearAll() {
    setSearch("");
    router.push("/");
  }

  function applyMobileFilters() {
    const min = tempPriceMin <= PRICE_MIN ? "" : String(tempPriceMin);
    const max = tempPriceMax >= PRICE_MAX ? "" : String(tempPriceMax);
    updateParams({
      brand: tempBrand,
      concentration: tempConcentration,
      sort: tempSort,
      scent: tempScent,
      price_min: min,
      price_max: max,
    });
    setMobileOpen(false);
  }

  function clearMobileFilters() {
    setTempBrand("");
    setTempConcentration("");
    setTempSort("newest");
    setTempScent("");
    setTempPriceMin(PRICE_MIN);
    setTempPriceMax(PRICE_MAX);
  }

  const PriceRangeSlider = ({
    min, max, onMinChange, onMaxChange, onApply,
  }: {
    min: number; max: number;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
    onApply?: () => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-surface-300 px-2.5 py-1 font-mono text-[11px] text-gold-300">
          {formatRupiahShort(min)}
        </span>
        <span className="text-[11px] text-gold-200/30">—</span>
        <span className="rounded-lg bg-surface-300 px-2.5 py-1 font-mono text-[11px] text-gold-300">
          {max >= PRICE_MAX ? "2jt+" : formatRupiahShort(max)}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute h-1 w-full rounded-full bg-gold-900/40" />
        <div
          className="absolute h-1 rounded-full bg-gold-400/60"
          style={{
            left: `${((min - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
            right: `${100 - ((max - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
          }}
        />
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={min}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v < max) onMinChange(v);
          }}
          onMouseUp={onApply}
          onTouchEnd={onApply}
          className="absolute w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-surface-400"
        />
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={max}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > min) onMaxChange(v);
          }}
          onMouseUp={onApply}
          onTouchEnd={onApply}
          className="absolute w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-surface-400"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* ========== DESKTOP ========== */}
      <div className="hidden space-y-3 sm:block">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-200/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari brand atau nama parfum..."
            className="input-dark w-full !py-3 !pl-11 !pr-10"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); updateParams({ q: "" }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gold-200/30 hover:text-gold-400"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {brands.length > 0 && (
            <select
              value={currentBrand}
              onChange={(e) => updateParams({ brand: e.target.value })}
              className="input-dark !w-auto !rounded-lg !py-2 !pl-3 !pr-8 text-xs"
            >
              <option value="">Semua Brand</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          {CONCENTRATIONS.map((c) => (
            <button
              key={c}
              onClick={() => updateParams({ concentration: currentConcentration === c ? "" : c })}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                currentConcentration === c
                  ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                  : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
              }`}
            >
              {c}
            </button>
          ))}

          {SCENT_FAMILIES.map((sf) => (
            <button
              key={sf}
              onClick={() => updateParams({ scent: currentScent === sf ? "" : sf })}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                currentScent === sf
                  ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                  : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
              }`}
            >
              {sf}
            </button>
          ))}

          {/* Price filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPriceFilter(!showPriceFilter)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                hasPriceFilter || showPriceFilter
                  ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                  : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
              }`}
            >
              {hasPriceFilter
                ? `${formatRupiahShort(currentPriceMin)} – ${currentPriceMax >= PRICE_MAX ? "2jt+" : formatRupiahShort(currentPriceMax)}`
                : "Harga"}
            </button>

            <AnimatePresence>
              {showPriceFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-gold-900/20 bg-surface-200 p-4 shadow-xl"
                >
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">
                    Range Harga
                  </p>
                  <PriceRangeSlider
                    min={desktopPriceMin}
                    max={desktopPriceMax}
                    onMinChange={setDesktopPriceMin}
                    onMaxChange={setDesktopPriceMax}
                    onApply={applyDesktopPrice}
                  />
                  {hasPriceFilter && (
                    <button
                      onClick={() => {
                        setDesktopPriceMin(PRICE_MIN);
                        setDesktopPriceMax(PRICE_MAX);
                        updateParams({ price_min: "", price_max: "" });
                        setShowPriceFilter(false);
                      }}
                      className="mt-3 w-full rounded-lg py-1.5 text-[11px] text-red-400 hover:bg-red-500/10"
                    >
                      Reset harga
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <select
            value={currentSort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="input-dark ml-auto !w-auto !rounded-lg !px-3 !py-2 text-xs"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/10"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ========== MOBILE ========== */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-200/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari parfum..."
              className="input-dark w-full !py-2.5 !pl-9 !pr-8 text-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); updateParams({ q: "" }); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gold-200/30 hover:text-gold-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
              mobileOpen || activeFilterCount > 0
                ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filter
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold-400 text-[9px] font-bold text-surface-400">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-4 rounded-2xl border border-gold-900/20 bg-surface-200/80 p-4">
                {brands.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Brand</p>
                    <select
                      value={tempBrand}
                      onChange={(e) => setTempBrand(e.target.value)}
                      className="input-dark w-full !rounded-lg !py-2.5 !pl-3 !pr-8 text-sm"
                    >
                      <option value="">Semua Brand</option>
                      {brands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Konsentrasi</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONCENTRATIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTempConcentration(tempConcentration === c ? "" : c)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                          tempConcentration === c
                            ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                            : "bg-surface-300 text-gold-200/50 ring-1 ring-gold-900/30"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Scent Family</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SCENT_FAMILIES.map((sf) => (
                      <button
                        key={sf}
                        type="button"
                        onClick={() => setTempScent(tempScent === sf ? "" : sf)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                          tempScent === sf
                            ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                            : "bg-surface-300 text-gold-200/50 ring-1 ring-gold-900/30"
                        }`}
                      >
                        {sf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price range mobile */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Range Harga</p>
                  <PriceRangeSlider
                    min={tempPriceMin}
                    max={tempPriceMax}
                    onMinChange={setTempPriceMin}
                    onMaxChange={setTempPriceMax}
                  />
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Urutkan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setTempSort(o.value)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                          tempSort === o.value
                            ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                            : "bg-surface-300 text-gold-200/50 ring-1 ring-gold-900/30"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={clearMobileFilters}
                    className="flex-1 rounded-xl border border-gold-900/20 py-2.5 text-xs font-medium text-gold-200/50 transition-colors hover:text-gold-200/70"
                  >
                    Reset
                  </button>
                  <button
                    onClick={applyMobileFilters}
                    className="btn-gold flex-1 rounded-xl py-2.5 text-xs font-semibold text-surface-400"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
