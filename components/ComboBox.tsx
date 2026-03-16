"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface ComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function ComboBox({ value, onChange, options, placeholder, className }: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const isCustom = value && !options.includes(value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(option: string) {
    onChange(option);
    setOpen(false);
    setSearch("");
  }

  function handleInputChange(val: string) {
    setSearch(val);
    if (!open) setOpen(true);
  }

  function handleClear() {
    onChange("");
    setSearch("");
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <div
        className="input-dark flex cursor-pointer items-center gap-2"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                e.preventDefault();
                // If there's a filtered match, select it; otherwise use custom input
                if (filtered.length > 0) {
                  handleSelect(filtered[0]);
                } else {
                  handleSelect(search.trim());
                }
              }
              if (e.key === "Escape") {
                setOpen(false);
                setSearch("");
              }
            }}
            placeholder={placeholder ?? "Cari atau ketik..."}
            className="flex-1 bg-transparent text-sm text-gold-100 outline-none placeholder:text-gold-200/30"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm ${value ? "text-gold-100" : "text-gold-200/30"}`}>
            {value || placeholder || "Pilih..."}
          </span>
        )}
        {value && !open ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="text-gold-200/30 hover:text-gold-200/60"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className={`text-gold-200/30 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gold-900/20 bg-surface-200 shadow-xl">
          {filtered.length > 0 ? (
            filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-gold-400/10 ${
                  value === option ? "text-gold-400 font-medium" : "text-gold-200/70"
                }`}
              >
                {option}
              </button>
            ))
          ) : search.trim() ? (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-gold-400 hover:bg-gold-400/10"
            >
              Gunakan &quot;{search.trim()}&quot;
            </button>
          ) : (
            <p className="px-3 py-2 text-xs text-gold-200/30">Tidak ada opsi</p>
          )}
          {isCustom && !open && (
            <p className="border-t border-gold-900/10 px-3 py-1.5 text-[10px] text-gold-200/25">
              Input kustom
            </p>
          )}
        </div>
      )}
    </div>
  );
}
