'use client';
import React from 'react';

export const C = {
  bg: '#0B0F1A', surface: '#131A2A', surface2: '#1A2338', border: '#242E45',
  text: '#F1F5F9', muted: '#8B95AB', subtle: '#5B6580',
  accent: '#6366F1', accentDark: '#4F46E5',
  green: '#22C55E', red: '#EF4444', amber: '#F59E0B',
};

export function Card({ children, style, padding = '18px 20px', className }: {
  children: React.ReactNode; style?: React.CSSProperties; padding?: string; className?: string;
}) {
  return (
    <div className={className} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding, ...style }}>
      {children}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  children, variant = 'primary', onClick, type = 'button', loading, disabled, icon, style, fullWidth, size = 'md',
}: {
  children: React.ReactNode; variant?: Variant; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit'; loading?: boolean; disabled?: boolean; icon?: React.ReactNode;
  style?: React.CSSProperties; fullWidth?: boolean; size?: 'sm' | 'md';
}) {
  const isDisabled = disabled || loading;
  const variants: Record<Variant, React.CSSProperties> = {
    primary: { background: isDisabled ? `${C.accent}55` : C.accent, color: 'white', border: 'none' },
    secondary: { background: C.surface2, color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: 'transparent', color: C.muted, border: 'none' },
    danger: { background: 'rgba(239,68,68,0.10)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
  };
  return (
    <button
      type={type} onClick={onClick} disabled={isDisabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: size === 'sm' ? '7px 13px' : '10px 18px',
        borderRadius: 10, fontSize: size === 'sm' ? 12.5 : 13.5, fontWeight: 700,
        fontFamily: 'Vazirmatn, sans-serif', cursor: isDisabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined, opacity: isDisabled && variant !== 'primary' ? 0.6 : 1,
        transition: 'opacity 0.15s', ...variants[variant], ...style,
      }}
    >
      {icon}{loading ? 'در حال بارگذاری...' : children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '9px 13px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif', outline: 'none',
        ...props.style,
      }}
    />
  );
}

export function Badge({ children, color = C.muted }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, color,
      background: `${color}1F`, border: `1px solid ${color}40`, borderRadius: 7, padding: '2px 9px',
    }}>
      {children}
    </span>
  );
}

export function Spinner({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `2.5px solid ${C.accent}30`, borderTopColor: C.accent,
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.muted }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{title}</p>
      {sub && <p style={{ fontSize: 12.5, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  );
}

/**
 * One table renders two ways: a normal table on a desktop, and a stack of
 * cards on a phone. The switch lives in globals.css so the first paint is
 * already right; all this does is copy each column's name onto its cells,
 * which is what the card layout shows as the label.
 */
export function Table({ head, children, labels: override }: {
  head: React.ReactNode[]; children: React.ReactNode; labels?: string[];
}) {
  const labels = head.map((h, i) =>
    override?.[i] !== undefined ? override[i]
      : (typeof h === 'string' || typeof h === 'number' ? String(h) : ''));

  const rows = React.Children.map(children, (row) => {
    if (!React.isValidElement(row)) return row;
    const cells = React.Children.toArray((row.props as any).children);
    return React.cloneElement(row as React.ReactElement<any>, {
      children: cells.map((cell, i) =>
        React.isValidElement(cell)
          ? React.cloneElement(cell as React.ReactElement<any>, { key: i, label: labels[i] ?? '' })
          : cell,
      ),
    });
  });

  return (
    <div className="dt-wrap">
      <table className="dt">
        <thead>
          <tr>
            {head.map((h, i) => <th key={i} className="dt-th">{h}</th>)}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, style, label }: { children: React.ReactNode; style?: React.CSSProperties; label?: string }) {
  return (
    <td className="dt-td" data-label={label ?? ''} style={style}>
      <span className="dt-cell-value">{children}</span>
    </td>
  );
}

export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 0' }}>
      <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>قبلی</Button>
      <span style={{ fontSize: 12.5, color: C.muted }}>
        صفحه {page.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}
      </span>
      <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>بعدی</Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Additions for the detail, admin and catalogue screens
   ──────────────────────────────────────────────────────────────────────── */

export function StatTile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 12, padding: '13px 15px', border: `1px solid ${C.border}` }}>
      <p style={{ fontSize: 19, fontWeight: 900, color: tone || C.text, margin: 0, lineHeight: 1.3 }}>{value}</p>
      <p style={{ fontSize: 11, color: C.muted, margin: '5px 0 0' }}>{label}</p>
      {hint && <p style={{ fontSize: 10.5, color: C.subtle, margin: '3px 0 0' }}>{hint}</p>}
    </div>
  );
}

export function StatGrid({ children, min = 150 }: { children: React.ReactNode; min?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 11 }}>
      {children}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void;
}) {
  return (
    <div className="tabstrip" style={{ marginBottom: 16 }}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              border: `1px solid ${active ? C.accent : C.border}`,
              background: active ? `${C.accent}25` : C.surface2,
              color: active ? C.text : C.muted,
              borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 800,
              fontFamily: 'Vazirmatn, sans-serif', cursor: 'pointer',
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{ color: active ? C.accent : C.subtle, marginRight: 6, fontSize: 11.5 }}>
                {t.count.toLocaleString('fa-IR')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, width = 560 }: {
  open: boolean; title: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div
      className="modal-scrim"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(4,7,14,0.72)', zIndex: 70,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 18px', overflowY: 'auto',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-shell"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: width }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: C.text, margin: 0 }}>{title}</p>
          <button onClick={onClose} aria-label="بستن" style={{ background: 'none', border: 'none', color: C.muted, fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && (
          <div className="modal-foot" style={{ display: 'flex', gap: 9, justifyContent: 'flex-start', padding: '14px 20px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 10.5, color: C.subtle, margin: '5px 0 0' }}>{hint}</p>}
    </div>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '9px 13px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif', outline: 'none',
        ...props.style,
      }}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '9px 13px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif',
        outline: 'none', minHeight: 78, resize: 'vertical', ...props.style,
      }}
    />
  );
}

export function Check({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; hint?: string;
}) {
  return (
    <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', padding: '5px 0' }}>
      <input
        type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ width: 15, height: 15, marginTop: 2, accentColor: C.accent, cursor: 'pointer', flexShrink: 0 }}
      />
      <span>
        <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>{label}</span>
        {hint && <span style={{ fontSize: 10.5, color: C.subtle, display: 'block' }}>{hint}</span>}
      </span>
    </label>
  );
}

/** Inline error/success strip — every mutating screen reports the API's own message. */
export function Notice({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const tone = kind === 'error' ? C.red : C.green;
  return (
    <div style={{
      fontSize: 12, color: kind === 'error' ? '#F87171' : '#4ADE80',
      background: `${tone}1A`, border: `1px solid ${tone}33`,
      borderRadius: 10, padding: '10px 13px', margin: '0 0 13px',
    }}>
      {children}
    </div>
  );
}

/** Rows a screen renders repeatedly: a label on the right, a value on the left. */
export function KeyValue({ items }: { items: { k: string; v: React.ReactNode }[] }) {
  return (
    <div style={{ display: 'grid', gap: 1 }}>
      {items.filter(i => i.v !== undefined && i.v !== null && i.v !== '').map((i, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, color: C.muted }}>{i.k}</span>
          <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600, textAlign: 'left' }}>{i.v}</span>
        </div>
      ))}
    </div>
  );
}
