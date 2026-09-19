'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { C } from './ui';
import { api, ADMIN_CHANGED_EVENT, type AdminUser } from '@/lib/api';

/** Each entry names the permission that reveals it; nav mirrors the API guards. */
const NAV: { href: string; label: string; permission: string; group?: string }[] = [
  { href: '/dashboard', label: 'داشبورد', permission: 'dashboard.view' },
  { href: '/users', label: 'کاربران', permission: 'users.view' },
  { href: '/providers', label: 'خدمات‌دهندگان', permission: 'providers.view' },
  { href: '/services', label: 'سرویس‌ها', permission: 'services.view' },
  { href: '/activities', label: 'فعالیت‌ها', permission: 'activities.view' },
  { href: '/vehicles', label: 'خودروها', permission: 'vehicles.view' },
  { href: '/products', label: 'محصولات', permission: 'products.view' },
  { href: '/appointments', label: 'نوبت‌ها', permission: 'appointments.view' },
  { href: '/payments', label: 'پرداخت‌ها', permission: 'payments.view' },
  { href: '/reviews', label: 'نظرات', permission: 'reviews.view' },
  { href: '/organizations', label: 'سازمان‌ها', permission: 'organizations.view' },
  { href: '/catalog', label: 'کاتالوگ آماده', permission: 'catalog.view', group: 'مدیریت' },
  { href: '/admins', label: 'مدیران پنل', permission: 'admins.view', group: 'مدیریت' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('crm_token')) { router.replace('/'); return; }
    try { setAdmin(JSON.parse(localStorage.getItem('crm_user') || 'null')); } catch {}

    // Permissions are re-read from the server on every mount so a grant revoked
    // elsewhere disappears from the nav without waiting for the token to expire.
    api.auth.me()
      .then((me) => {
        const fresh = { id: me.id, phone: me.phone, name: me.name, role: me.role, isSuper: me.isSuper, permissions: me.permissions };
        localStorage.setItem('crm_user', JSON.stringify(fresh));
        setAdmin(fresh as AdminUser);
        window.dispatchEvent(new Event(ADMIN_CHANGED_EVENT));
      })
      .catch((e) => {
        // Only a rejected token ends the session. A dropped connection — or a
        // request aborted because the admin navigated away mid-flight — must
        // not sign them out.
        if (e?.status === 401 || e?.status === 403) {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
          router.replace('/');
        }
      });
  }, [router]);

  const visible = NAV.filter((item) => admin?.isSuper || (admin?.permissions ?? []).includes(item.permission));
  const current = visible.find((item) => item.href === pathname);

  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    router.push('/');
  }

  return (
    <div className="shell">
      {/* phone-only bar: the drawer trigger and where you currently are */}
      <header className="shell-topbar">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="باز کردن منو"
          aria-expanded={navOpen}
          style={{
            background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
            width: 40, height: 40, display: 'flex', flexDirection: 'column', gap: 4,
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ display: 'block', width: 17, height: 2, borderRadius: 2, background: C.text }} />
          ))}
        </button>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {current?.label || 'پنل مدیریت'}
          </p>
          <p style={{ fontSize: 10.5, color: C.subtle, margin: 0 }}>دستیار خودرو</p>
        </div>
      </header>

      {navOpen && <div className="shell-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <aside className="shell-aside" data-open={navOpen ? 'true' : 'false'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 22px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 15,
            flexShrink: 0,
          }}>C</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>پنل مدیریت</p>
            <p style={{ fontSize: 10.5, color: C.subtle, margin: 0 }}>دستیار خودرو</p>
          </div>
          <button
            className="drawer-close"
            onClick={() => setNavOpen(false)}
            aria-label="بستن منو"
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {visible.map((item, i) => {
            const active = pathname === item.href;
            const startsGroup = !!item.group && visible[i - 1]?.group !== item.group;
            return (
              <div key={item.href}>
              {startsGroup && (
                <p style={{ fontSize: 10, fontWeight: 800, color: C.subtle, margin: '12px 12px 5px' }}>{item.group}</p>
              )}
              <Link
                href={item.href}
                style={{
                  display: 'block',
                  padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: active ? 800 : 600,
                  color: active ? 'white' : C.muted, background: active ? C.accent : 'transparent',
                  textDecoration: 'none', transition: 'background 0.15s',
                }}
              >
                {item.label}
              </Link>
              </div>
            );
          })}
          {admin && visible.length === 0 && (
            <p style={{ fontSize: 11.5, color: C.subtle, padding: '10px 12px', lineHeight: 1.7 }}>
              هنوز دسترسی‌ای برای این حساب فعال نشده است. با مدیر اصلی تماس بگیرید.
            </p>
          )}
        </nav>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>{admin?.name || '...'}</p>
          <p style={{ fontSize: 10.5, color: C.subtle, margin: '2px 0 10px', direction: 'ltr', textAlign: 'right' }}>{admin?.phone}</p>
          <button
            onClick={logout}
            style={{
              width: '100%', background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '8px 0', fontSize: 12.5, fontWeight: 700, fontFamily: 'Vazirmatn, sans-serif', cursor: 'pointer',
            }}
          >
            خروج
          </button>
        </div>
      </aside>

      <main className="shell-main">
        {children}
      </main>
    </div>
  );
}
