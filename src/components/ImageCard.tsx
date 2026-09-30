import { Check, Download, Loader2, Trash2, RefreshCw, Eye, RotateCw, Crop } from "lucide-react";
import type { ImageItem } from "../lib/image-utils";
import { formatBytes, savedPct } from "../lib/image-utils";

interface Props {
  item: ImageItem;
  onRemove: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onCompressOne: (id: string) => void;
  onDownloadOne: (id: string) => void;
  onCompare: (id: string) => void;
  onRotate: (id: string) => void;
  onCrop: (id: string) => void;
  busy: boolean;
}

const FORMAT_COLORS: Record<string, string> = {
  jpg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  jpeg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  png: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  webp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  gif: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
};

export default function ImageCard(p: Props) {
  const { item } = p;
  const done = item.status === "done" && item.compressedSize != null;
  const pct = done ? savedPct(item.originalSize, item.compressedSize!) : 0;
  const grew = pct < 0;
  const fmt = (item.format || "img").toLowerCase();
  const fmtCls = FORMAT_COLORS[fmt] ?? "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";

  return (
    <div className="group bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all">
      {/* preview */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-black/40 overflow-hidden">
        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg ${fmtCls}`}>{item.format}</span>
          {done && (
            <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg ${grew ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}>
              {grew ? `+${Math.abs(pct)}%` : `−${pct}%`}
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          <button title="Compare" onClick={() => done && p.onCompare(item.id)} disabled={!done}
            className="w-8 h-8 rounded-lg bg-black/55 backdrop-blur text-white grid place-items-center hover:bg-violet-600 disabled:opacity-40 transition">
            <Eye size={14} />
          </button>
          <button title="Rotate 90°" onClick={() => p.onRotate(item.id)} disabled={p.busy}
            className="w-8 h-8 rounded-lg bg-black/55 backdrop-blur text-white grid place-items-center hover:bg-violet-600 disabled:opacity-40 transition">
            <RotateCw size={14} />
          </button>
          <button title="Crop" onClick={() => p.onCrop(item.id)} disabled={p.busy}
            className="w-8 h-8 rounded-lg bg-black/55 backdrop-blur text-white grid place-items-center hover:bg-violet-600 disabled:opacity-40 transition">
            <Crop size={14} />
          </button>
          <label title="Replace" className={`w-8 h-8 rounded-lg bg-black/55 backdrop-blur text-white grid place-items-center hover:bg-violet-600 transition ${p.busy ? "opacity-40 pointer-events-none" : "cursor-pointer"}`}>
            <RefreshCw size={14} />
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onReplace(item.id, f); e.target.value = ""; }} />
          </label>
          <button title="Remove" onClick={() => p.onRemove(item.id)} disabled={p.busy}
            className="w-8 h-8 rounded-lg bg-black/55 backdrop-blur text-white grid place-items-center hover:bg-red-600 disabled:opacity-40 transition">
            <Trash2 size={14} />
          </button>
        </div>
        {item.status === "compressing" && (
          <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 size={26} className="animate-spin" />
            <span className="text-sm font-bold">{item.progress}%</span>
            <div className="w-2/3 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all" style={{ width: `${item.progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* body */}
      <div className="p-3.5">
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate" title={item.name}>{item.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>{formatBytes(item.originalSize)}</span>
          <span>•</span>
          <span>{item.originalWidth > 0 ? `${item.originalWidth} × ${item.originalHeight}` : "reading…"}</span>
          <span>•</span>
          <span className="uppercase">{item.format}</span>
        </div>

        {done ? (
          <div className="mt-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500 dark:text-slate-400">BEFORE <span className="text-slate-800 dark:text-slate-200">{formatBytes(item.originalSize)}</span></span>
              <span className="text-slate-500 dark:text-slate-400">AFTER <span className="text-emerald-700 dark:text-emerald-300">{formatBytes(item.compressedSize!)}</span></span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-emerald-200/60 dark:bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${grew ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-teal-400"}`}
                style={{ width: `${Math.min(100, Math.max(4, Math.abs(pct)))}%` }} />
            </div>
            <p className={`mt-1 text-[11px] font-extrabold ${grew ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}>
              {grew ? `Grew by ${Math.abs(pct)}% — try JPG/WebP` : `Saved ${pct}% • ${formatBytes(item.originalSize - item.compressedSize!)}`} 
              {item.compressedWidth ? ` • ${item.compressedWidth}×${item.compressedHeight}` : ""}
            </p>
          </div>
        ) : item.status === "error" ? (
          <p className="mt-2.5 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">
            {item.error ?? "Compression failed"}
          </p>
        ) : (
          <p className="mt-2.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-xl px-3 py-2">
            Ready to compress — hit “Compress Images” or compress this one alone.
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {done ? (
            <>
              <button onClick={() => p.onDownloadOne(item.id)}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl px-3 py-2.5 shadow-md shadow-emerald-500/20 transition active:scale-95">
                <Download size={14} /> Download
              </button>
              <button onClick={() => p.onCompare(item.id)}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-200 border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-xl px-3 py-2.5 transition active:scale-95">
                <Eye size={14} /> Compare
              </button>
            </>
          ) : (
            <>
              <button onClick={() => p.onCompressOne(item.id)} disabled={p.busy || item.status === "compressing"}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl px-3 py-2.5 shadow-md shadow-violet-500/25 transition active:scale-95 disabled:opacity-50">
                {item.status === "compressing" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Compress
              </button>
              <button onClick={() => p.onRemove(item.id)} disabled={p.busy}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/15 hover:border-red-300 hover:text-red-600 rounded-xl px-3 py-2.5 transition active:scale-95 disabled:opacity-50">
                <Trash2 size={14} /> Remove
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
