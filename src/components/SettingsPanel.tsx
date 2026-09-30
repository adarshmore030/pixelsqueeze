import { Wand2, SlidersHorizontal, RotateCcw, FileOutput, Scaling, Gauge } from "lucide-react";
import type { CompressionMode, OutputFormat, ResizeSettings } from "../lib/image-utils";

interface Props {
  mode: CompressionMode;
  setMode: (m: CompressionMode) => void;
  quality: number;
  setQuality: (q: number) => void;
  output: OutputFormat;
  setOutput: (o: OutputFormat) => void;
  resize: ResizeSettings;
  setResize: (r: ResizeSettings) => void;
  onReset: () => void;
}

const QUALITY_PRESETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const WIDTH_PRESETS = [480, 720, 1080, 1280, 1920];

function qualityLabel(q: number) {
  if (q <= 30) return { t: "Maximum compression", c: "text-red-600 dark:text-red-400" };
  if (q <= 60) return { t: "High compression", c: "text-orange-600 dark:text-orange-400" };
  if (q <= 85) return { t: "Balanced — recommended", c: "text-emerald-600 dark:text-emerald-400" };
  return { t: "Near-lossless", c: "text-violet-600 dark:text-violet-300" };
}

export default function SettingsPanel(p: Props) {
  const ql = qualityLabel(p.quality);
  const sliderBg = `linear-gradient(to right, #7c3aed 0%, #d946ef ${p.quality}%, ${document.documentElement.classList.contains("dark") ? "#2a2a3d" : "#e2e8f0"} ${p.quality}%)`;

  return (
    <div id="settings" className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-sm scroll-mt-24">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 grid place-items-center">
            <SlidersHorizontal size={18} />
          </span>
          Compression Settings
        </h2>
        <button
          onClick={p.onReset}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 hover:border-violet-300 transition"
        >
          <RotateCcw size={13} /> Reset Settings
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: mode + quality */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Wand2 size={13} /> Compression Mode
            </p>
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              {(
                [
                  { v: "auto", t: "Automatic", d: "Smart quality per image" },
                  { v: "custom", t: "Custom", d: "You control quality" },
                ] as const
              ).map((m) => (
                <button
                  key={m.v}
                  onClick={() => p.setMode(m.v)}
                  className={`rounded-xl px-3 py-2.5 text-left transition active:scale-[0.98] ${
                    p.mode === m.v
                      ? "bg-white dark:bg-white/10 shadow-md border border-violet-200 dark:border-violet-500/30"
                      : "border border-transparent hover:bg-white/60 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`block text-sm font-bold ${p.mode === m.v ? "text-violet-700 dark:text-violet-200" : "text-slate-600 dark:text-slate-300"}`}>{m.t}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{m.d}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={p.mode === "auto" ? "opacity-50 pointer-events-none select-none" : ""}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Gauge size={13} /> Quality: <span className="text-violet-700 dark:text-violet-300 text-sm font-display">{p.quality}%</span>
              </p>
              <span className={`text-xs font-bold ${ql.c}`}>{p.mode === "auto" ? "Auto per image" : ql.t}</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={1}
              value={p.quality}
              onChange={(e) => p.setQuality(parseInt(e.target.value))}
              className="pix-slider w-full"
              style={{ background: sliderBg }}
              aria-label="Quality"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUALITY_PRESETS.map((q) => (
                <button
                  key={q}
                  onClick={() => { p.setMode("custom"); p.setQuality(q); }}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition active:scale-95 ${
                    p.quality === q && p.mode === "custom"
                      ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/30"
                      : "border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600"
                  }`}
                >
                  {q}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: format + resize */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileOutput size={13} /> Output Format
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { v: "original", t: "Original" },
                  { v: "jpeg", t: "JPG" },
                  { v: "png", t: "PNG" },
                  { v: "webp", t: "WebP" },
                ] as { v: OutputFormat; t: string }[]
              ).map((f) => (
                <button
                  key={f.v}
                  onClick={() => p.setOutput(f.v)}
                  className={`rounded-xl px-2 py-2.5 text-sm font-bold border transition active:scale-95 ${
                    p.output === f.v
                      ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white border-transparent shadow-lg shadow-violet-500/25"
                      : "border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-violet-400"
                  }`}
                >
                  {f.t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              JPG → WebP • PNG → WebP • JPG ↔ PNG • WebP → JPG / PNG supported
            </p>
          </div>

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Scaling size={13} /> Resize <span className="normal-case font-semibold">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">WIDTH (px)</span>
                <input
                  type="number"
                  min={1}
                  max={8192}
                  placeholder="Original"
                  value={p.resize.width}
                  onChange={(e) => p.setResize({ ...p.resize, width: e.target.value, preset: null })}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">HEIGHT (px)</span>
                <input
                  type="number"
                  min={1}
                  max={8192}
                  placeholder="Original"
                  value={p.resize.height}
                  onChange={(e) => p.setResize({ ...p.resize, height: e.target.value, preset: null })}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[480, 720, 1080, 1280, 1920].map((w) => (
                <button
                  key={w}
                  onClick={() => p.setResize({ ...p.resize, width: String(w), height: "", preset: w })}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition active:scale-95 ${
                    p.resize.preset === w && p.resize.width === String(w)
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                      : "border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-violet-400"
                  }`}
                >
                  {w}px
                </button>
              ))}
              {(p.resize.width || p.resize.height) && (
                <button
                  onClick={() => p.setResize({ ...p.resize, width: "", height: "", preset: null })}
                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  Clear
                </button>
              )}
            </div>
            <label className="mt-3 flex items-center gap-2.5 cursor-pointer select-none">
              <button
                role="switch"
                aria-checked={p.resize.maintainAspect}
                onClick={() => p.setResize({ ...p.resize, maintainAspect: !p.resize.maintainAspect })}
                className={`w-10 h-6 rounded-full relative transition ${p.resize.maintainAspect ? "bg-violet-600" : "bg-slate-300 dark:bg-white/15"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${p.resize.maintainAspect ? "left-[18px]" : "left-0.5"}`} />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Maintain aspect ratio</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
