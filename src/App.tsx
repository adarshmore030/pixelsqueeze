import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";
import {
  Zap, ShieldCheck, Lock, Gauge, Images, HardDrive, TrendingDown,
  PackageCheck, Download, FileArchive, Trash2, Sparkles, ArrowRight,
  CheckCircle2, XCircle, ChevronDown, MonitorSmartphone, Layers,
  FileImage, Maximize2, RefreshCw, Crop, RotateCw, Wand2, BadgeCheck,
  UploadCloud, MousePointerClick, Settings2, Eye,
} from "lucide-react";
import Header from "./components/Header";
import Dropzone from "./components/Dropzone";
import SettingsPanel from "./components/SettingsPanel";
import ImageCard from "./components/ImageCard";
import CompareModal from "./components/CompareModal";
import EditModal, { DEFAULT_EDIT, type EditState } from "./components/EditModal";
import {
  ACCEPT_EXT, autoQuality, compressSingle, computeTargetSize, extOf,
  formatBytes, getImageDimensions, renderEditedImage, savedPct, uid, withExt,
  type CompressionMode, type ImageItem, type OutputFormat, type ResizeSettings,
} from "./lib/image-utils";

const MAX_FILES = 20;
const MAX_SIZE = 50 * 1024 * 1024;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem("pixelsqueeze-theme");
    if (s) return s === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const [items, setItems] = useState<ImageItem[]>([]);
  const [mode, setMode] = useState<CompressionMode>("auto");
  const [quality, setQuality] = useState(80);
  const [output, setOutput] = useState<OutputFormat>("original");
  const [resize, setResize] = useState<ResizeSettings>({ width: "", height: "", maintainAspect: true, preset: null });
  const [busy, setBusy] = useState(false);
  const [overall, setOverall] = useState(0);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; mode: "rotate" | "crop" } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [zipping, setZipping] = useState(false);

  const itemsRef = useRef<ImageItem[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("pixelsqueeze-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- upload ----------
  const addFiles = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (!arr.length) return;
    if (itemsRef.current.length + arr.length > MAX_FILES) {
      setToast(`You can add up to ${MAX_FILES} images at once.`);
    }
    const room = Math.max(0, MAX_FILES - itemsRef.current.length);
    const slice = arr.slice(0, room);
    const fresh: ImageItem[] = [];
    for (const f of slice) {
      const ext = extOf(f.name);
      const okType = f.type.startsWith("image/") || ACCEPT_EXT.includes(ext);
      if (!okType) { setToast(`"${f.name}" is not a supported image.`); continue; }
      if (f.size > MAX_SIZE) { setToast(`"${f.name}" is over 50 MB and was skipped.`); continue; }
      const id = uid();
      const fmt = (ext === "jpeg" ? "jpg" : ext || (f.type.split("/")[1] ?? "img")).toLowerCase();
      fresh.push({
        id, file: f, name: f.name, originalSize: f.size,
        originalWidth: 0, originalHeight: 0, format: fmt,
        previewUrl: URL.createObjectURL(f), status: "queued", progress: 0,
      });
    }
    if (!fresh.length) return;
    setItems((prev) => [...fresh, ...prev]);
    // resolve dimensions async
    for (const it of fresh) {
      try {
        const d = await getImageDimensions(it.file);
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, originalWidth: d.width, originalHeight: d.height } : p)));
      } catch {
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, originalWidth: 0, originalHeight: 0 } : p)));
      }
    }
    setTimeout(() => document.getElementById("queue")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const t = prev.find((i) => i.id === id);
      if (t) { URL.revokeObjectURL(t.previewUrl); if (t.compressedUrl) URL.revokeObjectURL(t.compressedUrl); }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    itemsRef.current.forEach((t) => { URL.revokeObjectURL(t.previewUrl); if (t.compressedUrl) URL.revokeObjectURL(t.compressedUrl); });
    setItems([]);
    setOverall(0);
  }, []);

  const replaceItem = useCallback(async (id: string, file: File) => {
    const ext = extOf(file.name);
    if (!file.type.startsWith("image/") && !ACCEPT_EXT.includes(ext)) { setToast("That file is not a supported image."); return; }
    const old = itemsRef.current.find((i) => i.id === id);
    if (old) { URL.revokeObjectURL(old.previewUrl); if (old.compressedUrl) URL.revokeObjectURL(old.compressedUrl); }
    const url = URL.createObjectURL(file);
    setItems((prev) => prev.map((p) => p.id === id
      ? { ...p, file, name: file.name, originalSize: file.size, previewUrl: url, originalWidth: 0, originalHeight: 0, format: (ext === "jpeg" ? "jpg" : ext || "img").toLowerCase(), status: "queued" as const, progress: 0, compressedBlob: undefined, compressedUrl: undefined, compressedSize: undefined, error: undefined }
      : p));
    try {
      const d = await getImageDimensions(file);
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, originalWidth: d.width, originalHeight: d.height } : p)));
    } catch { /* keep 0 */ }
    setToast("Image replaced — ready to compress again.");
  }, []);

  // ---------- compress ----------
  const compressIds = useCallback(async (ids: string[]) => {
    if (busyRef.current || ids.length === 0) return;
    setBusy(true);
    setOverall(1);
    let done = 0;
    for (const id of ids) {
      const snap = itemsRef.current.find((i) => i.id === id);
      if (!snap) { done++; continue; }
      const q = mode === "auto" ? autoQuality(snap.originalSize) / 100 : quality / 100;
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "compressing", progress: 6, error: undefined } : it)));
      let prog = 6;
      const tick = setInterval(() => {
        prog = Math.min(92, prog + 5 + Math.random() * 11);
        setItems((prev) => prev.map((it) => (it.id === id && it.status === "compressing" ? { ...it, progress: Math.round(prog) } : it)));
      }, 160);
      try {
        await new Promise((r) => setTimeout(r, 120));
        const safeSnap = {
          ...snap,
          originalWidth: snap.originalWidth || 1600,
          originalHeight: snap.originalHeight || 1200,
        };
        const res = await compressSingle(safeSnap, { quality: q, output, resize });
        clearInterval(tick);
        const prevUrl = itemsRef.current.find((i) => i.id === id)?.compressedUrl;
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        const url = URL.createObjectURL(res.blob);
        setItems((prev) => prev.map((it) => it.id === id
          ? { ...it, status: "done", progress: 100, compressedBlob: res.blob, compressedUrl: url, compressedSize: res.blob.size, compressedWidth: res.width, compressedHeight: res.height, outputFormatUsed: res.ext, qualityUsed: Math.round(q * 100) }
          : it));
      } catch (e: unknown) {
        clearInterval(tick);
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error", progress: 0, error: e instanceof Error ? e.message : "Compression failed" } : it)));
      }
      done++;
      setOverall(Math.round((done / ids.length) * 100));
    }
    setBusy(false);
    setTimeout(() => setOverall(0), 1200);
  }, [mode, quality, output, resize]);

  const compressAll = useCallback(() => {
    const ids = itemsRef.current.filter((i) => i.status !== "compressing").map((i) => i.id);
    if (!ids.length) { setToast("Add some images first."); return; }
    compressIds(ids);
  }, [compressIds]);

  const compressOne = useCallback((id: string) => compressIds([id]), [compressIds]);

  // ---------- downloads ----------
  const downloadOne = useCallback((id: string) => {
    const it = itemsRef.current.find((i) => i.id === id);
    if (!it?.compressedBlob) { setToast("Compress this image first."); return; }
    downloadBlob(it.compressedBlob, withExt(it.name.replace(/\.gif$/i, ".png"), it.outputFormatUsed ?? "jpg"));
    setToast("Download started.");
  }, []);

  const downloadAll = useCallback(() => {
    const done = itemsRef.current.filter((i) => i.status === "done" && i.compressedBlob);
    if (!done.length) { setToast("Nothing compressed yet — hit Compress Images."); return; }
    done.forEach((it, idx) => {
      setTimeout(() => downloadBlob(it.compressedBlob!, withExt(it.name.replace(/\.gif$/i, ".png"), it.outputFormatUsed ?? "jpg")), idx * 450);
    });
    setToast(`Downloading ${done.length} images…`);
  }, []);

  const downloadZip = useCallback(async () => {
    const done = itemsRef.current.filter((i) => i.status === "done" && i.compressedBlob);
    if (!done.length) { setToast("Nothing compressed yet — hit Compress Images."); return; }
    setZipping(true);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      for (const it of done) {
        let fname = withExt(it.name.replace(/\.gif$/i, ".png"), it.outputFormatUsed ?? "jpg");
        let n = 1;
        while (used.has(fname)) { const base = fname.slice(0, fname.lastIndexOf(".")); const ext = fname.slice(fname.lastIndexOf(".") + 1); fname = `${base}-${n}.${ext}`; n++; }
        used.add(fname);
        zip.file(fname, it.compressedBlob!);
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      downloadBlob(blob, "compressed-images.zip");
      setToast("ZIP downloaded: compressed-images.zip");
    } catch {
      setToast("ZIP creation failed — try Download All instead.");
    }
    setZipping(false);
  }, []);

  // ---------- edits (rotate / crop) ----------
  const applyEdit = useCallback(async (edit: EditState) => {
    if (!editTarget) return;
    const it = itemsRef.current.find((i) => i.id === editTarget.id);
    const modeNow = editTarget.mode;
    setEditTarget(null);
    if (!it) return;
    try {
      setToast(modeNow === "crop" ? "Applying crop…" : "Applying rotation…");
      const prefer = it.file.type === "image/jpeg" ? "image/jpeg" : it.file.type === "image/webp" ? "image/webp" : "image/png";
      const out = await renderEditedImage(it.file, edit, prefer);
      const newFile = new File([out.blob], it.name, { type: out.blob.type });
      const url = URL.createObjectURL(newFile);
      URL.revokeObjectURL(it.previewUrl);
      if (it.compressedUrl) URL.revokeObjectURL(it.compressedUrl);
      setItems((prev) => prev.map((p) => p.id === it.id
        ? { ...p, file: newFile, name: newFile.name, originalSize: newFile.size, previewUrl: url, originalWidth: out.width, originalHeight: out.height, status: "queued" as const, progress: 0, compressedBlob: undefined, compressedUrl: undefined, compressedSize: undefined }
        : p));
      setToast("Edit applied — compress again to export.");
    } catch {
      setToast("Edit failed — image may be too large.");
    }
  }, [editTarget]);

  const resetSettings = useCallback(() => {
    setMode("auto");
    setQuality(80);
    setOutput("original");
    setResize({ width: "", height: "", maintainAspect: true, preset: null });
    setToast("Settings reset to defaults.");
  }, []);

  // ---------- derived ----------
  const stats = useMemo(() => {
    const doneItems = items.filter((i) => i.status === "done" && i.compressedSize != null);
    const orig = doneItems.reduce((s, i) => s + i.originalSize, 0);
    const comp = doneItems.reduce((s, i) => s + (i.compressedSize ?? 0), 0);
    const allOrig = items.reduce((s, i) => s + i.originalSize, 0);
    return {
      processed: doneItems.length,
      total: items.length,
      orig, comp,
      allOrig,
      saved: Math.max(0, orig - comp),
      reduction: orig ? savedPct(orig, comp) : 0,
      hasGif: items.some((i) => i.format === "gif"),
    };
  }, [items]);

  const compareItem = compareId ? items.find((i) => i.id === compareId) ?? null : null;
  const editItem = editTarget ? items.find((i) => i.id === editTarget.id) ?? null : null;
  const firstDone = items.find((i) => i.status === "done" && i.compressedUrl);

  const applyToolPreset = (tool: string) => {
    switch (tool) {
      case "compressor": setMode("auto"); setOutput("original"); break;
      case "resizer": setResize({ width: "1280", height: "", maintainAspect: true, preset: 1280 }); break;
      case "converter": setOutput("webp"); setMode("custom"); setQuality(82); break;
      case "jpg": setOutput("jpeg"); setMode("custom"); setQuality(75); break;
      case "png": setOutput("png"); setMode("auto"); break;
      case "webp": setOutput("webp"); setMode("custom"); setQuality(80); break;
      case "optimizer": setMode("auto"); setOutput("webp"); setResize({ width: "", height: "", maintainAspect: true, preset: null }); break;
      case "cropper":
        if (!items.length) { setToast("Upload an image first, then use Crop on its card."); document.getElementById("compressor")?.scrollIntoView({ behavior: "smooth" }); return; }
        setEditTarget({ id: items[0].id, mode: "crop" }); return;
      case "rotator":
        if (!items.length) { setToast("Upload an image first, then use Rotate on its card."); document.getElementById("compressor")?.scrollIntoView({ behavior: "smooth" }); return; }
        setEditTarget({ id: items[0].id, mode: "rotate" }); return;
    }
    document.getElementById("settings")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setToast("Preset applied — now compress your images.");
  };

  const resizePreview = useMemo(() => {
    if (!items.length) return null;
    const s = items[0];
    if (!s.originalWidth) return null;
    const t = computeTargetSize(s.originalWidth, s.originalHeight, resize);
    if (t.w === s.originalWidth && t.h === s.originalHeight) return null;
    return { from: `${s.originalWidth} × ${s.originalHeight}`, to: `${t.w} × ${t.h}` };
  }, [items, resize]);

  return (
    <div id="top" className="min-h-screen bg-[#f6f6fb] dark:bg-[#0b0b14] text-slate-900 dark:text-slate-100 overflow-x-clip transition-colors">
      <Header dark={dark} onToggleDark={() => setDark((d) => !d)} />

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl max-w-[92vw]">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400 dark:text-emerald-600" />
            <span className="truncate">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ HERO ============ */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-orange-400/15 blur-3xl rounded-full" />
          <div className="absolute top-24 -left-24 w-72 h-72 bg-cyan-400/10 blur-3xl rounded-full" />
          <div className="absolute top-24 -right-24 w-72 h-72 bg-violet-500/15 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8 text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold tracking-wide uppercase bg-white dark:bg-white/5 border border-violet-200 dark:border-white/10 rounded-full px-4 py-2 shadow-sm">
              <Sparkles size={13} className="text-violet-600" /> Free • Unlimited • No sign-up
            </span>
            <h1 className="mt-5 font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
              Compress Images{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400">
                Without Losing Quality
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
              Shrink JPG, PNG, WebP &amp; GIF files up to <strong className="text-slate-900 dark:text-white">90% smaller</strong> — resize, convert formats, and compare results. Everything happens locally in your browser.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#compressor" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-2xl px-8 py-4 shadow-xl shadow-violet-500/30 transition active:scale-95 min-h-[52px]">
                <UploadCloud size={20} /> Upload Images
              </a>
              <a href="#compare" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold border-2 border-slate-200 dark:border-white/15 hover:border-violet-400 rounded-2xl px-8 py-[14px] transition active:scale-95 min-h-[52px] bg-white/60 dark:bg-white/5">
                <Eye size={18} /> See comparison
              </a>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {["JPG", "PNG", "WebP", "GIF"].map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">✓ {f}</span>
              ))}
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                <Lock size={11} /> Private — never uploaded
              </span>
            </div>
          </motion.div>

          {/* mini before/after strip */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.55 }}
            className="mt-10 grid sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-left">
            {[
              { icon: Gauge, t: "Smart compression", d: "Auto mode picks the ideal quality for each photo." },
              { icon: Maximize2, t: "Resize + convert", d: "Scale to 480–1920px & export JPG, PNG or WebP." },
              { icon: ShieldCheck, t: "100% private", d: "Files never leave your device. No server, no trace." },
            ].map((c) => (
              <div key={c.t} className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex gap-3 shadow-sm">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white grid place-items-center shrink-0">
                  <c.icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold">{c.t}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.d}</span>
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ COMPRESSOR ============ */}
      <main id="compressor" className="max-w-7xl mx-auto px-4 sm:px-6 pb-4 scroll-mt-20">
        {!items.length ? (
          <Dropzone onFiles={addFiles} />
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
            <div className="space-y-5 min-w-0">
              <Dropzone onFiles={addFiles} compact />
              <SettingsPanel
                mode={mode} setMode={setMode}
                quality={quality} setQuality={setQuality}
                output={output} setOutput={setOutput}
                resize={resize} setResize={setResize}
                onReset={resetSettings}
              />
              {resizePreview && (
                <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-2xl px-4 py-3">
                  <Maximize2 size={15} /> Resize preview: {resizePreview.from} → {resizePreview.to}
                </div>
              )}
              {stats.hasGif && (
                <div className="flex items-start gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3">
                  <XCircle size={15} className="mt-0.5 shrink-0" />
                  <span>GIFs are animated — browsers can't re-encode them on a canvas, so GIFs export as a static <strong>PNG/WebP/JPG</strong> first frame. Convert to WebP for the smallest animated-alternative still.</span>
                </div>
              )}
            </div>

            {/* action rail */}
            <div className="lg:sticky lg:top-20 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-lg flex items-center gap-2">
                  <Images size={19} className="text-violet-600" />
                  {items.length} image{items.length > 1 ? "s" : ""}
                </p>
                <button onClick={clearAll} disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl px-3 py-2 transition disabled:opacity-40">
                  <Trash2 size={13} /> Clear All
                </button>
              </div>

              <button onClick={compressAll} disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 text-base font-extrabold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-70 rounded-2xl px-6 py-4 shadow-xl shadow-violet-500/25 transition active:scale-[0.98] min-h-[56px]">
                {busy ? (
                  <>
                    <span className="w-5 h-5 border-[3px] border-white/40 border-t-white rounded-full animate-spin" />
                    Compressing… {overall}%
                  </>
                ) : (
                  <>
                    <Zap size={19} /> Compress Images
                  </>
                )}
              </button>
              {busy && (
                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all" style={{ width: `${overall}%` }} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={downloadAll} disabled={busy || !stats.processed}
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 rounded-xl px-3 py-3.5 shadow-md shadow-emerald-500/20 transition active:scale-95 min-h-[48px]">
                  <Download size={16} /> Download All
                </button>
                <button onClick={downloadZip} disabled={busy || zipping || !stats.processed}
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-bold border-2 border-slate-900 dark:border-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 disabled:opacity-40 rounded-xl px-3 py-3 transition active:scale-95 min-h-[48px]">
                  {zipping ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FileArchive size={16} />}
                  {zipping ? "Zipping…" : "ZIP"}
                </button>
              </div>
              <p className="text-[11px] text-center font-semibold text-slate-500 dark:text-slate-400">
                {stats.processed > 0 ? `${stats.processed}/${items.length} compressed • ZIP saves as compressed-images.zip` : "Compress first, then download individually or as ZIP"}
              </p>

              {/* mini stats */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1"><HardDrive size={11} /> Original</p>
                  <p className="font-display font-bold text-sm mt-0.5">{formatBytes(stats.allOrig)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1"><PackageCheck size={11} /> Compressed</p>
                  <p className="font-display font-bold text-sm mt-0.5">{stats.processed ? formatBytes(stats.comp) : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* settings visible even with 0 images (below fold teaser) */}
        {!items.length && (
          <div className="mt-5">
            <SettingsPanel
              mode={mode} setMode={setMode}
              quality={quality} setQuality={setQuality}
              output={output} setOutput={setOutput}
              resize={resize} setResize={setResize}
              onReset={resetSettings}
            />
          </div>
        )}

        {/* ============ QUEUE ============ */}
        {items.length > 0 && (
          <section id="queue" className="mt-8 scroll-mt-24">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="font-display font-bold text-xl flex items-center gap-2">
                <Layers size={20} className="text-violet-600" /> Your images
                <span className="text-xs font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 rounded-full px-2.5 py-1">{items.length}/{MAX_FILES}</span>
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tip: hover a photo for Replace • Rotate • Crop • Compare</p>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence initial={false}>
                {items.map((it) => (
                  <motion.div key={it.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <ImageCard
                      item={it} busy={busy}
                      onRemove={removeItem} onReplace={replaceItem}
                      onCompressOne={compressOne} onDownloadOne={downloadOne}
                      onCompare={(id) => setCompareId(id)}
                      onRotate={(id) => setEditTarget({ id, mode: "rotate" })}
                      onCrop={(id) => setEditTarget({ id, mode: "crop" })}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* ============ RESULT STATS ============ */}
        {stats.processed > 0 && (
          <section className="mt-8">
            <div className="rounded-3xl overflow-hidden border border-emerald-200 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-500/10 dark:via-transparent dark:to-teal-500/10 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white grid place-items-center"><BadgeCheck size={19} /></span>
                <div>
                  <h2 className="font-display font-bold text-xl leading-none">Compression complete</h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Before vs after, summed across {stats.processed} image{stats.processed > 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { icon: Images, l: "Images Processed", v: String(stats.processed) },
                  { icon: HardDrive, l: "Original Size", v: formatBytes(stats.orig) },
                  { icon: PackageCheck, l: "Compressed Size", v: formatBytes(stats.comp) },
                  { icon: TrendingDown, l: "Space Saved", v: formatBytes(stats.saved) },
                  { icon: Gauge, l: "Reduction", v: `${stats.reduction}%` },
                ].map((s) => (
                  <div key={s.l} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                    <s.icon size={18} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                    <p className="font-display font-bold text-lg sm:text-xl mt-1.5">{s.v}</p>
                    <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
              {/* before/after bar */}
              <div className="mt-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">BEFORE • {formatBytes(stats.orig)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">AFTER • {formatBytes(stats.comp)} • Saved {stats.reduction}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                  <div className="h-full bg-slate-300 dark:bg-white/25 rounded-full" style={{ width: "100%" }} />
                </div>
                <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 -mt-3 transition-all" style={{ width: `${Math.max(3, 100 - stats.reduction)}%` }} />
              </div>
            </div>
          </section>
        )}

        {/* ============ COMPARE ============ */}
        <section id="compare" className="mt-10 scroll-mt-24">
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="font-display font-bold text-2xl flex items-center gap-2">
              <Eye size={22} className="text-violet-600" /> Before vs After
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">Drag the slider to inspect quality. Example: <strong>4.8 MB • 4000 × 3000 → 820 KB • 4000 × 3000, saved 83%</strong>.</p>
            {firstDone?.compressedUrl ? (
              <div className="mt-5 grid lg:grid-cols-[1fr_280px] gap-5 items-stretch">
                <button onClick={() => setCompareId(firstDone.id)}
                  className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 aspect-video group text-left">
                  <img src={firstDone.previewUrl} alt="before" className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r-2 border-white">
                    <img src={firstDone.compressedUrl} alt="after" className="absolute inset-0 h-full object-cover max-w-none" style={{ width: "200%" }} />
                  </span>
                  <span className="absolute top-3 left-3 text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg bg-slate-900/80 text-white">BEFORE • {formatBytes(firstDone.originalSize)}</span>
                  <span className="absolute top-3 right-3 text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white">AFTER • {formatBytes(firstDone.compressedSize ?? 0)}</span>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-xs font-bold bg-white/95 dark:bg-slate-900/90 px-4 py-2 rounded-full shadow-lg group-hover:scale-105 transition">
                    <MousePointerClick size={14} /> Click to open full compare
                  </span>
                </button>
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 flex flex-col justify-center gap-3">
                  <div className="flex justify-between text-sm font-bold"><span className="text-slate-500">Before</span><span>{formatBytes(firstDone.originalSize)} • {firstDone.originalWidth}×{firstDone.originalHeight}</span></div>
                  <div className="flex justify-between text-sm font-bold"><span className="text-slate-500">After</span><span className="text-emerald-600 dark:text-emerald-400">{formatBytes(firstDone.compressedSize ?? 0)} • {firstDone.compressedWidth}×{firstDone.compressedHeight}</span></div>
                  <div className="rounded-xl bg-emerald-500 text-white text-center font-display font-bold text-lg py-2.5">
                    Saved {savedPct(firstDone.originalSize, firstDone.compressedSize ?? firstDone.originalSize)}%
                  </div>
                  <button onClick={() => setCompareId(firstDone.id)} className="text-sm font-bold text-violet-700 dark:text-violet-300 hover:underline inline-flex items-center gap-1 justify-center">
                    Open interactive slider <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 p-6 text-center">
                  <p className="text-[11px] font-extrabold tracking-widest text-slate-400">BEFORE</p>
                  <p className="font-display font-bold text-2xl mt-1">4.8 MB</p>
                  <p className="text-xs font-semibold text-slate-500">4000 × 3000 • PNG</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-6 text-center shadow-lg shadow-emerald-500/20">
                  <p className="text-[11px] font-extrabold tracking-widest text-white/80">AFTER</p>
                  <p className="font-display font-bold text-2xl mt-1">820 KB</p>
                  <p className="text-xs font-bold text-white/85">4000 × 3000 • WebP • Saved 83%</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============ EXTRA TOOLS ============ */}
        <section id="tools" className="mt-10 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-full px-4 py-1.5">All-in-one toolkit</span>
            <h2 className="mt-3 font-display font-bold text-2xl sm:text-3xl">More than a compressor</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">Nine pro tools in one page — tap any tool to apply its preset instantly.</p>
          </div>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: "compressor", icon: Zap, t: "Image Compressor", d: "Smart auto quality", g: "from-violet-600 to-fuchsia-600" },
              { id: "resizer", icon: Maximize2, t: "Image Resizer", d: "480 → 1920px presets", g: "from-sky-500 to-blue-600" },
              { id: "converter", icon: RefreshCw, t: "Image Converter", d: "→ JPG PNG WebP", g: "from-amber-500 to-orange-600" },
              { id: "jpg", icon: FileImage, t: "JPG Compressor", d: "Photos, tiny files", g: "from-emerald-500 to-teal-600" },
              { id: "png", icon: Layers, t: "PNG Compressor", d: "Graphics & logos", g: "from-cyan-500 to-sky-600" },
              { id: "webp", icon: Sparkles, t: "WebP Converter", d: "Modern web format", g: "from-fuchsia-500 to-pink-600" },
              { id: "cropper", icon: Crop, t: "Image Cropper", d: "Free crop box", g: "from-rose-500 to-red-600" },
              { id: "rotator", icon: RotateCw, t: "Image Rotator", d: "Rotate + flip", g: "from-indigo-500 to-violet-600" },
              { id: "optimizer", icon: Wand2, t: "Image Optimizer", d: "One-click best result", g: "from-slate-700 to-slate-900" },
            ].map((t) => (
              <button key={t.id} onClick={() => applyToolPreset(t.id)}
                className="group text-left bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/40 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all active:scale-[0.98]">
                <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.g} text-white grid place-items-center shadow-md group-hover:scale-110 transition-transform`}>
                  <t.icon size={20} />
                </span>
                <span className="block font-bold text-sm sm:text-base mt-3">{t.t}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.d}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-300">Use tool <ArrowRight size={12} /></span>
              </button>
            ))}
          </div>
        </section>

        {/* ============ ABOUT / PRIVACY / HOW ============ */}
        <section id="about" className="mt-10 scroll-mt-24 grid lg:grid-cols-2 gap-5">
          <div className="rounded-3xl bg-slate-900 dark:bg-gradient-to-br dark:from-violet-600 dark:to-fuchsia-700 text-white p-6 sm:p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-violet-500/30 blur-3xl rounded-full" />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest bg-white/10 rounded-full px-3 py-1.5">
              <ShieldCheck size={13} /> Privacy first
            </span>
            <h2 className="mt-3 font-display font-bold text-2xl leading-tight">Your images stay private.<br />Always.</h2>
            <p className="mt-3 text-sm text-white/80 font-medium leading-relaxed border-l-2 border-emerald-400 pl-4">
              Your images stay private. Images are processed locally in your browser and are not uploaded to our server.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm font-semibold">
              {["No uploads, no cloud, no waiting rooms", "Works offline once loaded — try airplane mode", "Nothing stored: refresh and everything is gone"].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />{t}</li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-white/70">
              <Lock size={13} /> Verified client-side: open DevTools → Network → compress and watch zero uploads.
            </div>
          </div>

          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8">
            <h2 className="font-display font-bold text-2xl flex items-center gap-2"><Settings2 size={22} className="text-violet-600" /> How it works</h2>
            <ol className="mt-5 space-y-4">
              {[
                { icon: UploadCloud, t: "1. Upload", d: "Drag & drop up to 20 JPG, PNG, WebP or GIF files. Instant thumbnails with size & dimensions." },
                { icon: Gauge, t: "2. Tune", d: "Pick Automatic or Custom quality (10–100%), resize to 480–1920px, choose JPG / PNG / WebP output." },
                { icon: Zap, t: "3. Compress & download", d: "Hit Compress Images, watch per-image progress, compare before/after, download singly or as ZIP." },
              ].map((s) => (
                <li key={s.t} className="flex gap-3">
                  <span className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 grid place-items-center shrink-0"><s.icon size={18} /></span>
                  <span><span className="block font-bold text-sm">{s.t}</span><span className="block text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{s.d}</span></span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 text-xs font-semibold text-slate-600 dark:text-slate-300 flex gap-2">
              <MonitorSmartphone size={16} className="shrink-0 text-violet-600" />
              Fully mobile-friendly: big touch targets, stacking cards, an easy slider and zero horizontal scrolling.
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-6 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8">
          <h2 className="font-display font-bold text-xl">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
            {[
              { q: "Will compression ruin my image quality?", a: "At 75–85% quality (our Auto default) most photos look identical while shrinking 60–85%. Use the Before/After slider to verify, and bump quality to 90%+ for print work." },
              { q: "Which format should I choose?", a: "WebP is smallest for the web and supported everywhere modern. JPG is best for photos with wide compatibility. PNG keeps transparency and crisp graphics but larger files." },
              { q: "Is there a file size or count limit?", a: "Up to 20 images at once, 50 MB each — all processed locally, so the only limit is your device's memory. Everything is free and unlimited." },
              { q: "Are my images really private?", a: "Yes. Compression runs on the HTML Canvas API inside your browser tab. No uploads, no servers, no analytics on your pixels. Disconnect the internet after loading and it still works." },
              { q: "Why did my PNG get bigger as JPG?", a: "Simple graphics with few colors compress better as PNG; photos compress better as JPG/WebP. If a result grows, re-export that image as WebP or raise quality slightly — the app shows honest savings per file." },
            ].map((f, i) => (
              <div key={f.q}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full flex items-center justify-between gap-3 py-4 text-left font-bold text-sm sm:text-[15px]">
                  {f.q}
                  <ChevronDown size={17} className={`shrink-0 transition-transform ${faqOpen === i ? "rotate-180 text-violet-600" : "text-slate-400"}`} />
                </button>
                {faqOpen === i && <p className="pb-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="mt-10 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-400 grid place-items-center text-white"><Zap size={15} /></span>
            <div className="leading-tight">
              <p className="font-display font-bold text-sm">PixelSqueeze</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Compress Images Without Losing Quality</p>
            </div>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <a href="#compressor" className="hover:text-violet-600">Compressor</a>
            <a href="#settings" className="hover:text-violet-600">Resize</a>
            <a href="#settings" className="hover:text-violet-600">Convert</a>
            <a href="#compare" className="hover:text-violet-600">Compare</a>
            <a href="#tools" className="hover:text-violet-600">Tools</a>
            <a href="#about" className="hover:text-violet-600">About</a>
          </nav>
          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5"><ShieldCheck size={12} /> 100% browser-side • Free forever</p>
        </div>
      </footer>

      {/* modals */}
      <CompareModal item={compareItem} onClose={() => setCompareId(null)} />
      <EditModal
        src={editItem?.previewUrl ?? null}
        name={editItem?.name ?? ""}
        title={editTarget?.mode === "crop" ? "Crop image" : "Rotate / flip image"}
        mode={editTarget?.mode ?? "rotate"}
        initial={DEFAULT_EDIT}
        onClose={() => setEditTarget(null)}
        onApply={applyEdit}
      />
    </div>
  );
}
