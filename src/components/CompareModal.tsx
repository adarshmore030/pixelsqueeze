import { useEffect, useState } from "react";
import { X, ChevronsLeftRight } from "lucide-react";
import { formatBytes, type ImageItem } from "../lib/image-utils";

export default function CompareModal({ item, onClose }: { item: ImageItem | null; onClose: () => void }) {
  const [pos, setPos] = useState(50);

  useEffect(() => {
    setPos(50);
    if (item) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!item || !item.compressedUrl) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#14141f] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-slate-900 dark:text-white truncate">{item.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {formatBytes(item.originalSize)} → {formatBytes(item.compressedSize ?? 0)} • {item.originalWidth}×{item.originalHeight} → {item.compressedWidth}×{item.compressedHeight}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl grid place-items-center bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition shrink-0 ml-3">
            <X size={17} />
          </button>
        </div>

        <div
          className="relative select-none bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[size:24px_24px] dark:bg-[repeating-conic-gradient(#1e1e2e_0%_25%,#14141f_0%_50%)] cursor-ew-resize touch-none"
          style={{ height: "min(62vh, 520px)" }}
          onPointerDown={(e) => {
            const el = e.currentTarget;
            const move = (ev: PointerEvent) => {
              const r = el.getBoundingClientRect();
              setPos(Math.min(98, Math.max(2, ((ev.clientX - r.left) / r.width) * 100)));
            };
            move(e.nativeEvent);
            const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        >
          {/* after (full) */}
          <img src={item.compressedUrl} alt="after" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
          {/* before (clipped) */}
          <div className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none" style={{ width: `${pos}%` }}>
            <div className="absolute top-0 left-0 h-full" style={{ width: `${(100 / Math.max(pos, 0.5)) * 100}%` }}>
              <img src={item.previewUrl} alt="before" className="absolute inset-0 w-full h-full object-contain bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[size:24px_24px]" draggable={false} />
            </div>
          </div>
          {/* labels */}
          <span className="absolute top-3 left-3 text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg bg-slate-900/80 text-white backdrop-blur">BEFORE • {formatBytes(item.originalSize)}</span>
          <span className="absolute top-3 right-3 text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg bg-emerald-600/90 text-white backdrop-blur">AFTER • {formatBytes(item.compressedSize ?? 0)}</span>
          {/* handle */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)]" style={{ left: `${pos}%` }}>
            <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-slate-800 grid place-items-center shadow-xl">
              <ChevronsLeftRight size={18} />
            </span>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-white/10">
          <input type="range" min={2} max={98} value={pos} onChange={(e) => setPos(parseInt(e.target.value))}
            className="pix-slider flex-1 min-w-[180px]" style={{ background: `linear-gradient(to right,#7c3aed ${pos}%,#e2e8f0 ${pos}%)` }} aria-label="Compare position" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Drag the handle or use the slider</p>
        </div>
      </div>
    </div>
  );
}
