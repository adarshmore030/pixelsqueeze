import { useRef, useState } from "react";
import { CloudUpload, FolderOpen, ImagePlus, FileImage } from "lucide-react";

export default function Dropzone({ onFiles, compact }: { onFiles: (f: FileList | File[]) => void; compact?: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDragDepth(0);
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setDragDepth((d) => d + 1); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragDepth((d) => { const n = d - 1; if (n <= 0) setDragOver(false); return Math.max(0, n); }); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer group overflow-hidden rounded-3xl border-2 transition-all duration-300 ${
        dragOver
          ? "border-violet-600 bg-violet-50 dark:bg-violet-500/10 scale-[1.01] shadow-2xl shadow-violet-500/20"
          : "border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-xl hover:shadow-violet-500/10"
      } ${compact ? "p-6" : "p-8 sm:p-12"}`}
    >
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-violet-400/20 via-fuchsia-400/15 to-orange-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-tr from-cyan-400/15 via-violet-400/10 to-transparent blur-2xl" />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }}
      />

      <div className="relative flex flex-col items-center text-center">
        <div className={`relative ${compact ? "mb-3" : "mb-5"}`}>
          <div className={`rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white grid place-items-center shadow-xl shadow-violet-500/30 group-hover:scale-110 transition-transform ${compact ? "w-14 h-14" : "w-20 h-20 animate-floaty"}`}>
            {dragOver ? <FolderOpen size={compact ? 26 : 36} /> : <CloudUpload size={compact ? 26 : 36} />}
          </div>
          <span className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-emerald-500 text-white grid place-items-center border-4 border-white dark:border-[#12121e]">
            <ImagePlus size={14} />
          </span>
        </div>

        <h3 className={`font-display font-bold text-slate-900 dark:text-white tracking-tight ${compact ? "text-lg" : "text-2xl sm:text-3xl"}`}>
          {dragOver ? "Drop to add images" : "Drop Images Here"}
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Drag & drop, or <span className="font-bold text-violet-600 dark:text-violet-300">browse files</span> — compress up to 20 images at once, right in your browser.
        </p>

        <span className={`mt-5 inline-flex items-center gap-2 font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-2xl shadow-lg shadow-violet-500/30 transition active:scale-95 ${compact ? "px-5 py-2.5 text-sm" : "px-8 py-4 text-base pulse-ring"}`}>
          <FileImage size={19} /> Select Images
        </span>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {["JPG", "JPEG", "PNG", "WebP", "GIF"].map((f) => (
            <span key={f} className="text-[11px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
