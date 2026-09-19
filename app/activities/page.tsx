'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, ActivityRow, ActivityCount, toJalali } from '@/lib/api';
import { Badge, Button, C, Card, EmptyState, Spinner } from '@/components/ui';

const KIND_LABEL: Record<string, string> = {
  appointment: 'درخواست خدمت', payment: 'پرداخت', service_record: 'سابقه سرویس', vehicle: 'خودرو', document: 'مدرک', reminder: 'یادآوری', product: 'محصول', review: 'نظر', message: 'پیام', notification: 'اعلان', fuel_log: 'سوخت', user: 'کاربر'
};
const KIND_COLOR: Record<string, string> = { appointment: C.accent, payment: C.green, service_record: '#38BDF8', vehicle: C.amber, document: '#A78BFA', reminder: '#F472B6', product: '#2DD4BF', review: '#FBBF24', message: '#60A5FA', notification: '#FB7185', fuel_log: '#34D399', user: '#CBD5E1' };

export default function ActivitiesPage() {
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ page: number; pageSize: number; items: ActivityRow[]; counts: ActivityCount[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); api.management.activities({ kind: kind || undefined, page, pageSize: 30 }).then(setData).finally(() => setLoading(false)); }, [kind, page]);

  return (
    <Shell>
      <div style={{ marginBottom: 18 }}>
        <p style={{ color: C.accent, fontSize: 12, fontWeight: 900, margin: 0 }}>فعالیت‌های سیستم</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '6px 0 4px' }}>تایم‌لاین کامل برنامه</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>آخرین کاربران، خودروها، مدارک، درخواست‌ها، پرداخت‌ها، پیام‌ها و سوابق سرویس.</p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setKind(''); setPage(1); }} style={{ border: `1px solid ${!kind?C.accent:C.border}`, background: !kind?`${C.accent}25`:C.surface2, color: !kind?C.text:C.muted, borderRadius: 999, padding: '8px 13px', fontWeight: 800, fontFamily: 'Vazirmatn', cursor: 'pointer' }}>همه</button>
          {(data?.counts || []).map(c => <button key={c.kind} onClick={() => { setKind(c.kind); setPage(1); }} style={{ border: `1px solid ${kind===c.kind?KIND_COLOR[c.kind]||C.accent:C.border}`, background: kind===c.kind?`${KIND_COLOR[c.kind]||C.accent}25`:C.surface2, color: kind===c.kind?C.text:C.muted, borderRadius: 999, padding: '8px 13px', fontWeight: 800, fontFamily: 'Vazirmatn', cursor: 'pointer' }}>{KIND_LABEL[c.kind] || c.kind} · {c.count}</button>)}
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : !data?.items.length ? <EmptyState title="فعالیتی پیدا نشد" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.items.map(a => (
              <div key={`${a.kind}-${a.id}`} className="feed-row" style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px 14px' }}>
                <div style={{ width: 12, height: 12, borderRadius: 99, background: KIND_COLOR[a.kind] || C.accent, boxShadow: `0 0 0 5px ${(KIND_COLOR[a.kind] || C.accent)}22` }} />
                <div><Badge color={KIND_COLOR[a.kind] || C.accent}>{KIND_LABEL[a.kind] || a.kind}</Badge><strong style={{ display: 'block', color: C.text, marginTop: 6 }}>{a.title || '—'}</strong><p style={{ color: C.muted, fontSize: 12, margin: '4px 0 0' }}>{a.subtitle || '—'}</p></div>
                <span style={{ color: C.subtle, fontSize: 12 }}>{toJalali(a.createdAt)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, paddingTop: 10 }}>
              <Button variant="secondary" disabled={page<=1} onClick={() => setPage(page-1)}>قبلی</Button>
              <Button variant="secondary" disabled={(data.items.length || 0)<(data.pageSize || 30)} onClick={() => setPage(page+1)}>بعدی</Button>
            </div>
          </div>
        )}
      </Card>
    </Shell>
  );
}
