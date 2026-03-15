interface FragranceNotesProps {
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  scentFamily: string | null;
}

export function FragranceNotes({ topNotes, middleNotes, baseNotes, scentFamily }: FragranceNotesProps) {
  const layers = [
    {
      label: "Top Notes",
      notes: topNotes,
      color: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
      barColor: "bg-amber-500/30",
      desc: "Kesan pertama, bertahan 15-30 menit",
    },
    {
      label: "Middle Notes",
      notes: middleNotes,
      color: "bg-rose-500/15 text-rose-400 ring-rose-500/20",
      barColor: "bg-rose-500/30",
      desc: "Karakter utama, bertahan 2-4 jam",
    },
    {
      label: "Base Notes",
      notes: baseNotes,
      color: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
      barColor: "bg-emerald-500/30",
      desc: "Fondasi, bertahan 4-8 jam+",
    },
  ];

  const hasAnyNotes = topNotes.length > 0 || middleNotes.length > 0 || baseNotes.length > 0;
  if (!hasAnyNotes) return null;

  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl font-bold text-gold-100">Fragrance Notes</h2>
        {scentFamily && (
          <span className="rounded-full bg-gold-400/10 px-3 py-0.5 text-[11px] font-semibold text-gold-400">
            {scentFamily}
          </span>
        )}
      </div>

      {/* Pyramid visualization */}
      <div className="mt-6 space-y-4">
        {layers.map((layer) => {
          if (layer.notes.length === 0) return null;
          return (
            <div key={layer.label} className="flex gap-4">
              {/* Left label */}
              <div className="w-28 flex-shrink-0 pt-1">
                <p className="text-xs font-semibold text-gold-200/60">{layer.label}</p>
                <p className="text-[10px] text-gold-200/25">{layer.desc}</p>
              </div>

              {/* Bar + pills */}
              <div className="flex-1">
                <div className={`h-1 rounded-full ${layer.barColor} mb-2`} />
                <div className="flex flex-wrap gap-1.5">
                  {layer.notes.map((note, i) => (
                    <span
                      key={i}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${layer.color}`}
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
