'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { api, ProviderRow, CRole, toJalali, num } from '@/lib/api';
import { Badge, Button, C, Card, EmptyState, Input, Pagination, Spinner, Table, Td } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = { mechanic: 'خدمات‌دهنده / مکانیک', seller: 'فروشنده قطعه' };

export default function ProvidersPage() {
  const [role, setRole] = useState<CRole | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; page: number; pageSize: number; items: ProviderRow[] } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.management.providers({ role: role || undefined, q: q || undefined, page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }
  useEffect(load, [role, page]);

  return (
    <Shell>
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div>
          <p style={{ color: C.accent, fontSize: 12, fontWeight: 900, margin: 0 }}>مدیریت خدمات‌دهندگان</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '6px 0 4px' }}>مکانیک‌ها و فروشندگان</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>وضعیت، فعالیت، خدمات، کالاها و ارتباط هر خدمات‌دهنده را یکجا ببین.</p>
        </div>
        <Link href="/users" style={{ textDecoration: 'none' }}><Button variant="secondary">همه کاربران</Button></Link>
      </div>

      <Card className="row-search" style={{ marginBottom: 16 }}>
        <Input placeholder="جستجو نام، موبایل، تعمیرگاه یا آدرس..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }} />
        <Button onClick={() => { setPage(1); load(); }}>جستجو</Button>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[{k:'',l:'همه'}, {k:'mechanic',l:'مکانیک‌ها'}, {k:'seller',l:'فروشندگان'}].map(t => (
            <button key={t.k} onClick={() => { setRole(t.k as CRole | ''); setPage(1); }} style={{ border: `1px solid ${role===t.k?C.accent:C.border}`, background: role===t.k?`${C.accent}25`:C.surface2, color: role===t.k?C.text:C.muted, borderRadius: 999, padding: '8px 13px', fontWeight: 800, fontFamily: 'Vazirmatn', cursor: 'pointer' }}>{t.l}</button>
          ))}
        </div>
      </Card>

      <Card padding="0">
        {loading ? <Spinner /> : !data?.items.length ? <EmptyState title="خدمات‌دهنده‌ای پیدا نشد" /> : (
          <>
            <Table head={['نام', 'نوع', 'وضعیت', 'خدمات/کالا', 'نوبت/اتصال', 'امتیاز', 'عضویت']}>
              {data.items.map(p => (
                <tr key={p.id}>
                  <Td><Link href={`/users/${p.id}`} style={{ color: C.text, textDecoration: 'none', fontWeight: 900 }}>{p.name || 'بدون نام'}</Link><div style={{ color: C.subtle, fontSize: 11, direction: 'ltr', textAlign: 'right' }}>{p.phone}</div><div style={{ color: C.muted, fontSize: 11 }}>{p.workshopName || p.workshopAddress || '—'}</div></Td>
                  <Td><Badge color={p.role === 'mechanic' ? C.green : '#A78BFA'}>{ROLE_LABEL[p.role] || p.role}</Badge></Td>
                  <Td><Badge color={p.active ? C.green : C.red}>{p.active ? 'فعال' : 'غیرفعال'}</Badge></Td>
                  <Td>{p.role === 'mechanic' ? `${num(p.serviceCount)} خدمت` : `${num(p.productCount)} کالا`}</Td>
                  <Td>{p.role === 'mechanic' ? `${num(p.appointmentCount)} نوبت / ${num(p.connectedVehicleCount)} خودرو` : '—'}</Td>
                  <Td>{p.avgRating ? `${num(p.avgRating)} ★` : '—'}</Td>
                  <Td>{toJalali(p.createdAt)}</Td>
                </tr>
              ))}
            </Table>
            <Pagination page={page} total={data.total} pageSize={data.pageSize} onChange={setPage} />
          </>
        )}
      </Card>
    </Shell>
  );
}
