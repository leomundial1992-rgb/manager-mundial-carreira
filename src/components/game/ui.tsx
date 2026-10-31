import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { Club, GameState, Player } from "@/game/types";
import { NAT_FLAG } from "@/game/data";
import { ovr } from "@/game/util";
import { cn } from "@/lib/utils";

export function Crest({ club, size = 32 }: { club: Club; size?: number }) {
  const [c1, c2] = club.colors;
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" className="shrink-0" aria-hidden>
      <path d="M20 2 L37 8 V22 C37 33 29 40 20 42 C11 40 3 33 3 22 V8 Z" fill={c1} stroke={c2} strokeWidth="2.5" />
      <path d="M20 2 L37 8 V22 C37 33 29 40 20 42 Z" fill={c2} opacity="0.85" />
      <text x="20" y="27" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Barlow Condensed, sans-serif" fill={c1} stroke={c2} strokeWidth="0.6" paintOrder="stroke">
        {club.short}
      </text>
    </svg>
  );
}

export const Flag = ({ nat }: { nat: string }) => <span className="text-base leading-none">{NAT_FLAG[nat] ?? "🏳️"}</span>;

export function OvrBadge({ v, className }: { v: number; className?: string }) {
  const tone = v >= 80 ? "bg-gold text-primary-foreground" : v >= 70 ? "bg-primary text-primary-foreground" : v >= 60 ? "bg-success text-primary-foreground" : "bg-muted text-foreground";
  return <span className={cn("inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1 font-display text-lg font-bold", tone, className)}>{Math.round(v)}</span>;
}

export function Bar({ value, max = 100, tone = "primary" }: { value: number; max?: number; tone?: "primary" | "warning" | "destructive" | "gold" | "success" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = { primary: "bg-primary", warning: "bg-warning", destructive: "bg-destructive", gold: "bg-gold", success: "bg-success" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] overflow-y-auto rounded-t-2xl border-t bg-card p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-between bg-card px-4 pt-4 pb-2">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button className="mm-btn-ghost min-h-10 px-3" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PlayerLine({ st, p, onClick, right }: { st: GameState; p: Player; onClick?: () => void; right?: ReactNode }) {
  const club = p.club !== null ? st.clubs[p.club] : null;
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b py-2.5 text-left last:border-b-0">
      <OvrBadge v={ovr(p)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate font-semibold">
          <Flag nat={p.nat} /> <span className="truncate">{p.name}</span>
          {p.inj > 0 && <span className="rounded bg-destructive px-1 text-xs text-destructive-foreground">LES {p.inj}s</span>}
          {p.sus > 0 && <span className="rounded bg-warning px-1 text-xs text-primary-foreground">SUSP</span>}
          {p.loanFrom != null && <span className="rounded bg-accent px-1 text-xs">EMP</span>}
          {p.listed && p.club === st.userClub && <span className="rounded bg-secondary px-1 text-xs">À VENDA</span>}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {p.pos} · {p.age} anos{club ? ` · ${club.name}` : " · Livre"}
        </div>
      </div>
      {right}
    </button>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mm-card">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
      {items.map((i) => (
        <button key={i.id} onClick={() => onChange(i.id)} className={cn("mm-chip shrink-0", value === i.id ? "border-primary bg-primary text-primary-foreground" : "bg-secondary")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="fixed inset-x-4 top-4 z-[60] rounded-xl border bg-popover p-3 text-center font-semibold shadow-lg">{text}</div>;
}
