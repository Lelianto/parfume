"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Concentration } from "@/types/database";
import type { FilterState, FormOptionsMap } from "./HomeListings";

const CONCENTRATIONS: Concentration[] = ["EDP", "EDT", "Parfum", "EDC", "Cologne"];
const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "price_asc", label: "Harga Terendah" },
  { value: "price_desc", label: "Harga Tertinggi" },
];

const DEFAULT_PRICE_MIN = 0;
const DEFAULT_PRICE_MAX = 1000000;
const DEFAULT_PRICE_STEP = 25000;

function formatRupiahShort(val: number) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
  if (val >= 1000) return `${Math.round(val / 1000)}rb`;
  return `${val}`;
}

interface SearchFilterProps {
  brands: string[];
  formOptions: FormOptionsMap;
  priceRange: { min: number; max: number; step?: number };
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onClearAll: () => void;
}

export function SearchFilter({ brands, formOptions, priceRange, filters, onFilterChange, onClearAll }: SearchFilterProps) {
  const PRICE_MIN = priceRange.min ?? DEFAULT_PRICE_MIN;
  const PRICE_MAX = priceRange.max ?? DEFAULT_PRICE_MAX;
  const PRICE_STEP = priceRange.step ?? DEFAULT_PRICE_STEP;

  const [search, setSearch] = useState(filters.q);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Derive dynamic options from formOptions, merging with DB brands
  const allBrands = [...new Set([...brands, ...(formOptions.brand ?? [])])].sort();
  const scentClassifications = formOptions.scent_classification ?? [];
  const genderOptions = formOptions.gender ?? [];
  const brandTypeOptions = formOptions.brand_type ?? [];

  // Mobile temp state
  const [tempBrand, setTempBrand] = useState(filters.brand);
  const [tempConcentration, setTempConcentration] = useState(filters.concentration);
  const [tempSort, setTempSort] = useState(filters.sort);
  const [tempScent, setTempScent] = useState(filters.scent);
  const [tempGender, setTempGender] = useState(filters.gender);
  const [tempBrandType, setTempBrandType] = useState(filters.brand_type);
  const [tempScentClassification, setTempScentClassification] = useState(filters.scent_classification);
  const [tempPriceMin, setTempPriceMin] = useState(Number(filters.price_min) || PRICE_MIN);
  const [tempPriceMax, setTempPriceMax] = useState(Number(filters.price_max) || PRICE_MAX);

  // Desktop price state
  const [desktopPriceMin, setDesktopPriceMin] = useState(Number(filters.price_min) || PRICE_MIN);
  const [desktopPriceMax, setDesktopPriceMax] = useState(Number(filters.price_max) || PRICE_MAX);
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // Sync local state when parent filters change (e.g. clearAll)
  const prevFilters = useRef(filters);
  useEffect(() => {
    const prev = prevFilters.current;
    if (prev !== filters) {
      prevFilters.current = filters;
      setSearch(filters.q);
      setTempBrand(filters.brand);
      setTempConcentration(filters.concentration);
      setTempSort(filters.sort);
      setTempScent(filters.scent);
      setTempGender(filters.gender);
      setTempBrandType(filters.brand_type);
      setTempScentClassification(filters.scent_classification);
      setTempPriceMin(Number(filters.price_min) || PRICE_MIN);
      setTempPriceMax(Number(filters.price_max) || PRICE_MAX);
      setDesktopPriceMin(Number(filters.price_min) || PRICE_MIN);
      setDesktopPriceMax(Number(filters.price_max) || PRICE_MAX);
    }
  }, [filters]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== filters.q) {
        onFilterChange({ q: search });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filters.q, onFilterChange]);

  const currentPriceMin = Number(filters.price_min) || PRICE_MIN;
  const currentPriceMax = Number(filters.price_max) || PRICE_MAX;
  const hasPriceFilter = currentPriceMin > PRICE_MIN || currentPriceMax < PRICE_MAX;
  const hasFilters = filters.q || filters.brand || filters.concentration || filters.scent || filters.gender || filters.brand_type || filters.scent_classification || filters.sort !== "newest" || hasPriceFilter;
  const activeFilterCount = [
    filters.brand,
    filters.concentration,
    filters.scent,
    filters.gender,
    filters.brand_type,
    filters.scent_classification,
    filters.sort !== "newest" ? filters.sort : "",
    hasPriceFilter ? "price" : "",
  ].filter(Boolean).length;

  function applyDesktopPrice() {
    const min = desktopPriceMin <= PRICE_MIN ? "" : String(desktopPriceMin);
    const max = desktopPriceMax >= PRICE_MAX ? "" : String(desktopPriceMax);
    onFilterChange({ price_min: min, price_max: max });
  }

  function handleClearAll() {
    setSearch("");
    onClearAll();
  }

  function applyMobileFilters() {
    const min = tempPriceMin <= PRICE_MIN ? "" : String(tempPriceMin);
    const max = tempPriceMax >= PRICE_MAX ? "" : String(tempPriceMax);
    onFilterChange({
      brand: tempBrand,
      concentration: tempConcentration,
      sort: tempSort,
      scent: tempScent,
      gender: tempGender,
      brand_type: tempBrandType,
      scent_classification: tempScentClassification,
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
    setTempGender("");
    setTempBrandType("");
    setTempScentClassification("");
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
          {max >= PRICE_MAX ? `${formatRupiahShort(PRICE_MAX)}+` : formatRupiahShort(max)}
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
              onClick={() => { setSearch(""); onFilterChange({ q: "" }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gold-200/30 hover:text-gold-400"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allBrands.length > 0 && (
            <select
              value={filters.brand}
              onChange={(e) => onFilterChange({ brand: e.target.value })}
              className="input-dark !w-auto !rounded-lg !py-2 !pl-3 !pr-8 text-xs"
            >
              <option value="">Semua Brand</option>
              {allBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          <select
            value={filters.concentration}
            onChange={(e) => onFilterChange({ concentration: e.target.value })}
            className="input-dark !w-auto !rounded-lg !py-2 !pl-3 !pr-8 text-xs"
          >
            <option value="">Semua Konsentrasi</option>
            {CONCENTRATIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {genderOptions.length > 0 && (
            <select
              value={filters.gender}
              onChange={(e) => onFilterChange({ gender: e.target.value })}
              className="input-dark !w-auto !rounded-lg !py-2 !pl-3 !pr-8 text-xs"
            >
              <option value="">Semua Gender</option>
              {genderOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}

          {brandTypeOptions.length > 0 && (
            <select
              value={filters.brand_type}
              onChange={(e) => onFilterChange({ brand_type: e.target.value })}
              className="input-dark !w-auto !rounded-lg !py-2 !pl-3 !pr-8 text-xs"
            >
              <option value="">Semua Tipe Brand</option>
              {brandTypeOptions.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          )}

          {scentClassifications.length > 0 && (
            <select
              value={filters.scent_classification}
              onChange={(e) => onFilterChange({ scent_classification: e.target.value })}
              className="input-dark !w-auto !rounded-lg !py-2 !pl-3 !pr-8 text-xs"
            >
              <option value="">Semua Klasifikasi Aroma</option>
              {scentClassifications.map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          )}

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
                ? `${formatRupiahShort(currentPriceMin)} – ${currentPriceMax >= PRICE_MAX ? `${formatRupiahShort(PRICE_MAX)}+` : formatRupiahShort(currentPriceMax)}`
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
                        onFilterChange({ price_min: "", price_max: "" });
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
            value={filters.sort}
            onChange={(e) => onFilterChange({ sort: e.target.value })}
            className="input-dark ml-auto !w-auto !rounded-lg !px-3 !py-2 text-xs"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={handleClearAll}
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
                onClick={() => { setSearch(""); onFilterChange({ q: "" }); }}
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
                {allBrands.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Brand</p>
                    <select
                      value={tempBrand}
                      onChange={(e) => setTempBrand(e.target.value)}
                      className="input-dark w-full !rounded-lg !py-2.5 !pl-3 !pr-8 text-sm"
                    >
                      <option value="">Semua Brand</option>
                      {allBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Konsentrasi</p>
                  <select
                    value={tempConcentration}
                    onChange={(e) => setTempConcentration(e.target.value)}
                    className="input-dark w-full !rounded-lg !py-2.5 !pl-3 !pr-8 text-sm"
                  >
                    <option value="">Semua Konsentrasi</option>
                    {CONCENTRATIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {genderOptions.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Gender</p>
                    <div className="flex flex-wrap gap-1.5">
                      {genderOptions.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setTempGender(tempGender === g ? "" : g)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                            tempGender === g
                              ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                              : "bg-surface-300 text-gold-200/50 ring-1 ring-gold-900/30"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {brandTypeOptions.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Tipe Brand</p>
                    <div className="flex flex-wrap gap-1.5">
                      {brandTypeOptions.map((bt) => (
                        <button
                          key={bt}
                          type="button"
                          onClick={() => setTempBrandType(tempBrandType === bt ? "" : bt)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                            tempBrandType === bt
                              ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                              : "bg-surface-300 text-gold-200/50 ring-1 ring-gold-900/30"
                          }`}
                        >
                          {bt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {scentClassifications.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-200/40">Klasifikasi Aroma</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scentClassifications.map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => setTempScentClassification(tempScentClassification === sc ? "" : sc)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                            tempScentClassification === sc
                              ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                              : "bg-surface-300 text-gold-200/50 ring-1 ring-gold-900/30"
                          }`}
                        >
                          {sc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
