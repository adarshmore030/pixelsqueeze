export type OutputFormat = "original" | "jpeg" | "png" | "webp";
export type CompressionMode = "auto" | "custom";

export interface ResizeSettings {
  width: string;
  height: string;
  maintainAspect: boolean;
  preset: number | null;
}

export type ItemStatus = "queued" | "compressing" | "done" | "error";

export interface CropRel { x: number; y: number; w: number; h: number; }

export interface EditState {
  rotate: number;
  flipH: boolean;
  crop: CropRel | null;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  format: string;
  previewUrl: string;
  status: ItemStatus;
  progress: number;
  error?: string;
  compressedBlob?: Blob;
  compressedUrl?: string;
  compressedSize?: number;
  compressedWidth?: number;
  compressedHeight?: number;
  outputFormatUsed?: string;
  qualityUsed?: number;
}

export const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";
export const ACCEPT_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100} ${units[i]}`;
}

export function extOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function mimeForOutput(out: OutputFormat, originalMime: string, originalName: string): { mime: string; ext: string } {
  if (out === "original") {
    const e = extOf(originalName);
    if (originalMime === "image/gif" || e === "gif") return { mime: "image/png", ext: "png" };
    if (originalMime === "image/png" || e === "png") return { mime: "image/png", ext: "png" };
    if (originalMime === "image/webp" || e === "webp") return { mime: "image/webp", ext: "webp" };
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (out === "jpeg") return { mime: "image/jpeg", ext: "jpg" };
  if (out === "png") return { mime: "image/png", ext: "png" };
  return { mime: "image/webp", ext: "webp" };
}

export function withExt(name: string, newExt: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${base}.${newExt}`;
}

export async function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const dims = { width: bmp.width, height: bmp.height };
    bmp.close();
    return dims;
  } catch {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const d = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(d);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read image"));
      };
      img.src = url;
    });
  }
}

export function computeTargetSize(origW: number, origH: number, resize: ResizeSettings): { w: number; h: number } {
  const w = parseInt(resize.width, 10);
  const h = parseInt(resize.height, 10);
  const hasW = !isNaN(w) && w > 0;
  const hasH = !isNaN(h) && h > 0;
  if (!hasW && !hasH) return { w: origW, h: origH };
  if (!origW || !origH) return { w: hasW ? w : origW, h: hasH ? h : origH };
  if (resize.maintainAspect) {
    if (hasW && hasH) {
      const scale = Math.min(w / origW, h / origH);
      return { w: Math.max(1, Math.round(origW * scale)), h: Math.max(1, Math.round(origH * scale)) };
    }
    if (hasW) {
      const scale = w / origW;
      return { w, h: Math.max(1, Math.round(origH * scale)) };
    }
    const scale = h / origH;
    return { w: Math.max(1, Math.round(origW * scale)), h };
  }
  return { w: hasW ? w : origW, h: hasH ? h : origH };
}

export function autoQuality(originalSize: number): number {
  const mb = originalSize / (1024 * 1024);
  if (mb > 8) return 68;
  if (mb > 4) return 72;
  if (mb > 2) return 76;
  if (mb > 1) return 80;
  if (mb > 0.5) return 82;
  return 85;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
      mime,
      mime === "image/png" ? undefined : quality
    );
  });
}

/** Render rotate/flip/crop edits into a new blob (lossless-ish PNG unless source is jpeg without transparency). */
export async function renderEditedImage(
  file: File | Blob,
  edit: EditState,
  preferMime?: string
): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const srcW = bmp.width;
  const srcH = bmp.height;
  const crop = edit.crop;
  const sx = crop ? Math.round(crop.x * srcW) : 0;
  const sy = crop ? Math.round(crop.y * srcH) : 0;
  const sw = crop ? Math.max(1, Math.round(crop.w * srcW)) : srcW;
  const sh = crop ? Math.max(1, Math.round(crop.h * srcH)) : srcH;

  const rot = ((edit.rotate % 360) + 360) % 360;
  const swapped = rot === 90 || rot === 270;
  const outW = swapped ? sh : sw;
  const outH = swapped ? sw : sh;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bmp.close(); throw new Error("Canvas not supported"); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(edit.flipH ? -1 : 1, 1);
  ctx.drawImage(bmp, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  bmp.close();

  const mime = preferMime ?? "image/png";
  const blob = await canvasToBlob(canvas, mime, 0.92);
  return { blob, width: outW, height: outH };
}

export async function compressSingle(
  item: ImageItem,
  opts: { quality: number; output: OutputFormat; resize: ResizeSettings; }
): Promise<{ blob: Blob; width: number; height: number; mime: string; ext: string }> {
  const { mime, ext } = mimeForOutput(opts.output, item.file.type, item.name);
  const target = computeTargetSize(item.originalWidth, item.originalHeight, opts.resize);

  const MAX_DIM = 8192;
  let tw = Math.max(1, target.w || item.originalWidth);
  let th = Math.max(1, target.h || item.originalHeight);
  if (tw > MAX_DIM || th > MAX_DIM) {
    const s = Math.min(MAX_DIM / tw, MAX_DIM / th);
    tw = Math.round(tw * s);
    th = Math.round(th * s);
  }

  const bmp = await createImageBitmap(item.file);
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bmp.close(); throw new Error("Canvas not supported"); }
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tw, th);
  } else {
    ctx.clearRect(0, 0, tw, th);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, tw, th);
  bmp.close();

  const blob = await canvasToBlob(canvas, mime, opts.quality);
  return { blob, width: tw, height: th, mime, ext };
}

export function savedPct(orig: number, comp: number): number {
  if (!orig) return 0;
  return Math.round(((orig - comp) / orig) * 100);
}
