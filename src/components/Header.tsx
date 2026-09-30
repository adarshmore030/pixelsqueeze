import { useEffect, useState } from "react";
import { Zap, Moon, Sun, Menu, X, ShieldCheck } from "lucide-react";

const LINKS = [
  { label: "Compressor", href: "#compressor" },
  { label: "Resize", href: "#settings" },
  { label: "Convert", href: "#settings" },
  { label: "Compare", href: "#compare" },
  { label: "Tools", href: "#tools" },
  { label: "About", href: "#about" },
];

export default function Header({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled
          ? "bg-white/85 dark:bg-[#0b0b14]/85 backdrop-blur-xl border-b border-violet-100 dark:border-white/10 shadow-sm"
          : "bg-white/60 dark:bg-[#0b0b14]/60 backdrop-blur-lg border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-400 grid place-items-center text-white shadow-lg shadow-violet-500/30">
            <Zap size={18} strokeWidth={2.6} />
          </span>
          <span className="leading-none">
            <span className="font-display font-700 font-bold text-lg tracking-tight text-slate-900 dark:text-white block">
              Pixel<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">Squeeze</span>
            </span>
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">
              Image Compressor
            </span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          {LINKS.map((l) => (
            <a
              key={l.label + l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-white hover:bg-violet-50 dark:hover:bg-white/10 transition"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full px-3 py-1.5">
            <ShieldCheck size={13} /> 100% Private
          </span>
          <button
            onClick={onToggleDark}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-xl grid place-items-center border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-amber-300 hover:border-violet-300 hover:text-violet-600 transition"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a
            href="#compressor"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl px-4 py-2.5 shadow-lg shadow-violet-500/25 transition active:scale-95"
          >
            Compress Now
          </a>
          <button
            className="lg:hidden w-10 h-10 grid place-items-center rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="lg:hidden border-t border-slate-100 dark:border-white/10 bg-white dark:bg-[#0b0b14] px-4 py-3 grid gap-1">
          {LINKS.map((l) => (
            <a
              key={l.label + l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-white/10"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#compressor"
            onClick={() => setOpen(false)}
            className="mt-1 text-center text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl px-4 py-3"
          >
            Compress Now
          </a>
        </nav>
      )}
    </header>
  );
}
