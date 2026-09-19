'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, ManagementServiceRow, ServiceAggregate, toJalali, money } from '@/lib/api';
import { Badge, Button, C, Card, EmptyState, Input, Pagination, Spinner, Table, Td } from '@/components/ui';

export default function ServicesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; page: number; pageSize: number; items: ManagementServiceRow[]; aggregates: ServiceAggregate[] } | null>(null);
  const [loading, setLoading] = useState(true);
  function load() { setLoading(true); api.management.services({ q: q || undefined, page, pageSize: 20 }).then(setData).finally(() => setLoading(false)); }
  useEffect(load, [page]);

  return (
    <Shell>
      <div style={{ marginBottom: 18 }}>
        <p style={{ color: C.accent, fontSize: 12, fontWeight: 900, margin: 0 }}>مدیریت سرویس‌ها</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '6px 0 4px' }}>خدمات فعال، قیمت‌ها و تقاضا</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>خدمات تعریف‌شده توسط تعمیرگاه‌ها، نوع ارائه حضوری/درمحل و سرویس‌های پرتقاضا.</p>
      </div>

      <div className="split-main">
        <Card padding="0">
          <div className="row-search" style={{ padding: 16, borderBottom: `1px solid ${C.border}`, gap: 10 }}>
            <Input placeholder="جستجو خدمت، تعمیرگاه یا نام خدمات‌دهنده..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }} />
            <Button onClick={() => { setPage(1); load(); }}>جستجو</Button>
          </div>
          {loading ? <Spinner /> : !data?.items.length ? <EmptyState title="خدمتی تعریف نشده" sub="وقتی مکانیک‌ها خدمت اضافه کنند اینجا دیده می‌شود." /> : (
            <>
              <Table head={['خدمت', 'خدمات‌دهنده', 'قیمت', 'نوع ارائه', 'وضعیت', 'ثبت']}>
                {data.items.map(s => (
                  <tr key={s.id}>
                    <Td><strong>{s.customName || s.serviceType}</strong><div style={{ color: C.subtle, fontSize: 11 }}>{s.serviceType}</div></Td>
                    <Td>{s.mechanicName || '—'}<div style={{ color: C.subtle, fontSize: 11 }}>{s.workshopName || s.mechanicPhone || '—'}</div></Td>
                    <Td>{s.price ? money(s.price) : 'توافقی'}</Td>
                    <Td><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{s.supportsInShop && <Badge>تعمیرگاه</Badge>}{s.supportsOnSite && <Badge color={C.green}>در محل</Badge>}</div></Td>
                    <Td><Badge color={s.mechanicActive ? C.green : C.red}>{s.mechanicActive ? 'فعال' : 'غیرفعال'}</Badge></Td>
                    <Td>{toJalali(s.createdAt)}</Td>
                  </tr>
                ))}
              </Table>
              <Pagination page={page} total={data.total} pageSize={data.pageSize} onChange={setPage} />
            </>
          )}
        </Card>

        <Card>
          <h2 style={{ color: C.text, fontSize: 15, fontWeight: 900, margin: '0 0 14px' }}>سرویس‌های پرتقاضا</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.aggregates || []).map(a => (
              <div key={a.label} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ color: C.text }}>{a.label}</strong><Badge color={C.accent}>{Number(a.requests || 0) + Number(a.records || 0)}</Badge></div>
                <p style={{ color: C.muted, fontSize: 12, margin: '6px 0 0' }}>{a.requests} درخواست · {a.records} سابقه سرویس</p>
              </div>
            ))}
            {!data?.aggregates?.length && <EmptyState title="هنوز داده‌ای نیست" />}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
