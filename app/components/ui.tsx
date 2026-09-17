"use client";

import React from "react";
import { formatYen } from "../calc";

/* ========================================================================== */
/* Icons — 依存を増やさないためインライン SVG で持つ                          */
/* ========================================================================== */

type IconProps = { className?: string };

const iconBase = "h-4 w-4 shrink-0";

export function IconSettings({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function IconUsers({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconScale({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v16M7 20h10M4 8h16M4 8l-2.5 6a3 3 0 0 0 5 0L4 8Zm16 0-2.5 6a3 3 0 0 0 5 0L20 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 5.2 7 8m5-2.8L17 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconReceipt({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 3v18l2.5-1.6L10 21l2-1.6L14 21l2.5-1.6L19 21V3l-2.5 1.6L14 3l-2 1.6L10 3 7.5 4.6 5 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowRight({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSwap({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 8h14m0 0-4-4m4 4-4 4M21 16H7m0 0 4-4m-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTable({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9.5h18M9.5 9.5V20" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconCopy({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCheck({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPlus({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m3 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconWarning({ className = iconBase }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5 2.8 20h18.4L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.05" fill="currentColor" />
    </svg>
  );
}

/* ========================================================================== */
/* Layout parts                                                               */
/* ========================================================================== */

export function SectionCard({
  icon,
  title,
  description,
  action,
  children,
  className = "",
  id,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`card p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1 text-[11px] font-medium leading-relaxed text-neg">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-[11px] leading-relaxed text-ink-subtle">{hint}</p>
      )}
    </div>
  );
}

/** 入力欄の class。検証エラー時は赤枠にする。 */
export function fieldClass(hasError: boolean, extra = ""): string {
  return `field ${hasError ? "field-invalid" : ""} ${extra}`.trim();
}

/** 名前の1文字を丸で表示する。色は id から決まるので毎回同じ色になる。 */
export function Avatar({
  name,
  id,
  size = "md",
}: {
  name: string;
  id: string;
  size?: "sm" | "md";
}) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const hue = hash % 360;

  const dimension = size === "sm" ? "h-6 w-6 text-[11px]" : "h-8 w-8 text-xs";

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${dimension}`}
      style={{
        // 半透明なのでライト／ダークどちらの背景にも馴染む
        backgroundColor: `hsl(${hue} 70% 50% / 0.16)`,
        color: `hsl(${hue} 65% 38%)`,
      }}
    >
      <span className="dark:hidden">{name.slice(0, 1) || "?"}</span>
      <span
        className="hidden dark:inline"
        style={{ color: `hsl(${hue} 80% 72%)` }}
      >
        {name.slice(0, 1) || "?"}
      </span>
    </span>
  );
}

export function Money({
  value,
  className = "",
  showSign = false,
}: {
  value: number;
  className?: string;
  showSign?: boolean;
}) {
  const sign = showSign && value > 0 ? "+" : "";
  return (
    <span className={`num whitespace-nowrap ${className}`}>
      {sign}
      {formatYen(value)}
      <span className="ml-0.5 text-[0.8em] font-normal opacity-70">円</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "brand" | "muted";
}) {
  const toneClass =
    tone === "brand"
      ? "bg-brand-soft text-brand-ink"
      : tone === "muted"
        ? "bg-surface-2 text-ink"
        : "bg-surface-2 text-ink";
  return (
    <div className={`rounded-xl px-3 py-2.5 ${toneClass}`}>
      <div className="text-[11px] font-medium opacity-70">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-xs text-ink-subtle">
      {children}
    </div>
  );
}

export function Toast({
  message,
  tone,
  action,
}: {
  message: string;
  tone: "ok" | "error";
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="animate-toast-in fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
      data-print="hide"
    >
      <div
        className={`pointer-events-auto flex min-h-11 items-center gap-3 rounded-full py-2 pl-4 text-sm font-medium text-white shadow-lg ${
          action ? "pr-2" : "pr-4"
        } ${tone === "ok" ? "bg-ink" : "bg-neg"}`}
      >
        <span className="flex items-center gap-2">
          {tone === "ok" ? <IconCheck /> : <IconWarning />}
          {message}
        </span>
        {action && (
          <button
            className="min-h-11 rounded-full px-3 font-semibold text-brand-hover hover:underline"
            onClick={action.onClick}
            type="button"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
