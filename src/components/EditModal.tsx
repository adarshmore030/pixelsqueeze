import { useEffect, useState } from "react";
import { X, RotateCw, FlipHorizontal2, Check } from "lucide-react";

export interface EditState {
  rotate: number; // 0,90,180,270
  flipH: boolean;
  crop: { x: number; y: number; w: number; h: number } | null; // 0..1 relative
}

export const DEFAULT_EDIT: EditState = { rotate: 0, flipH: false, crop: null };

export default function EditModal({
  src, name, title, mode, initial, onClose, onApply,
}: {
  src: string | null; name: string; title: string;
  mode: "rotate" | "crop";
  initial: EditState;
  onClose: () => void;
  onApply: (e: EditState) => void;
}) {
  const [st, setSt] = useState<EditState>(initial);
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });

  useEffect(() => {
    setSt(initial);
    if (initial.crop) setCrop(initial.crop);
    else setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    if (src) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [src]); // eslint-disable-line

  if (!src) return null;

  const apply = () => {
    onApply(mode === "crop" ? { ...st, crop } : st);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#14141f] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <h3 className="font-display font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[320px]">{name}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl grid place-items-center bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition">
            <X size={17} />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-2xl bg-slate-100 dark:bg-black/40 overflow-hidden grid place-items-center p-4 min-h-[280px]">
            {mode === "rotate" ? (
              <img
                src={src}
                alt="edit"
                className="max-h-[46vh] max-w-full object-contain rounded-lg shadow transition-transform"
                style={{ transform: `rotate(${st.rotate}deg) scaleX(${st.flipH ? -1 : 1})` }}
              />
            ) : (
              <CropBox src={src} crop={crop} setCrop={setCrop} />
            )}
          </div>

          {mode === "rotate" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setSt({ ...st, rotate: (st.rotate + 90) % 360 })}
                className="inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-white/15 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 transition"
              >
                <RotateCw size={14} /> Rotate 90°
              </button>
              <button
                onClick={() => setSt({ ...st, flipH: !st.flipH })}
                className="inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-white/15 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 transition"
              >
                <FlipHorizontal2 size={14} /> {st.flipH ? "Unflip" : "Flip"}
              </button>
              <button
                onClick={() => setSt({ rotate: 0, flipH: false, crop: st.crop })}
                className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2.5 transition"
              >
                Reset
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              Drag the corners or edges of the box to choose the crop area. Aspect is free — enable “Maintain aspect ratio” in settings is ignored for crops.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={onClose} className="text-sm font-bold border border-slate-200 dark:border-white/15 rounded-xl px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition">
              Cancel
            </button>
            <button onClick={apply} className="inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl px-4 py-3 shadow-lg shadow-violet-500/25 transition active:scale-95">
              <Check size={16} /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CropBox({ src, crop, setCrop }: { src: string; crop: { x: number; y: number; w: number; h: number }; setCrop: (c: { x: number; y: number; w: number; h: number }) => void }) {
  const startDrag = (corner: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const box = (e.currentTarget as HTMLElement).closest("[data-cropbox]") as HTMLElement;
    const move = (ev: PointerEvent) => {
      const r = box.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      setCrop(clampCrop(crop, corner, px, py));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div data-cropbox className="relative w-full max-w-[520px] aspect-[4/3] rounded-xl overflow-hidden touch-none select-none">
      <img src={src} alt="crop" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      <div
        className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.0)]"
        style={{
          left: `${crop.x * 100}%`, top: `${crop.y * 100}%`,
          width: `${crop.w * 100}%`, height: `${crop.h * 100}%`,
          boxShadow: "0 0 0 999px rgba(0,0,0,0.0)",
        }}
      >
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false}
          style={{ width: `${(100 / crop.w) * 100}%`, height: `${(100 / crop.h) * 100}%`, maxWidth: "none", left: `${(-crop.x / crop.w) * 100}%`, top: `${(-crop.y / crop.h) * 100}%`, position: "absolute" }} />
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
          {Array.from({ length: 9 }).map((_, i) => <span key={i} className="border border-white/40" />)}
        </div>
        {(["nw", "ne", "sw", "se", "n", "s", "w", "e"] as const).map((c) => (
          <span
            key={c}
            onPointerDown={startDrag(c)}
            className={`absolute w-5 h-5 -m-2.5 rounded-full bg-white border-2 border-violet-600 shadow cursor-nwse-resize touch-none ${posCls(c)}`}
          />
        ))}
      </div>
    </div>
  );
}

function posCls(c: string) {
  switch (c) {
    case "nw": return "left-0 top-0";
    case "ne": return "right-0 top-0";
    case "sw": return "left-0 bottom-0";
    case "se": return "right-0 bottom-0";
    case "n": return "left-1/2 top-0 -translate-x-1/2";
    case "s": return "left-1/2 bottom-0 -translate-x-1/2";
    case "w": return "left-0 top-1/2 -translate-y-1/2";
    case "e": return "right-0 top-1/2 -translate-y-1/2";
    default: return "";
  }
}

function clampCrop(c: { x: number; y: number; w: number; h: number }, corner: string, px: number, py: number) {
  let { x, y, w, h } = c;
  const min = 0.05;
  if (corner.includes("w")) { const nx = Math.min(px, x + w - min); w = x + w - nx; x = Math.max(0, nx); }
  if (corner.includes("e")) { w = Math.min(1 - x, Math.max(min, px - x)); }
  if (corner.includes("n")) { const ny = Math.min(py, y + h - min); h = y + h - ny; y = Math.max(0, ny); }
  if (corner.includes("s")) { h = Math.min(1 - y, Math.max(min, py - y)); }
  return { x, y, w, h };
}
