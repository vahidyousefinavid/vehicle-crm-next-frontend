'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import {
  C, Card, Button, Badge, Input, Select, Textarea, Table, Td, Spinner, EmptyState,
  Modal, Field, Check, Notice, Pagination, Tabs, StatTile, StatGrid,
} from '@/components/ui';
import {
  api, CatalogItemRow, CatalogKind, CatalogKindMeta, CATALOG_KIND_LABEL, useCan, money, num, toJalali,
} from '@/lib/api';

const KINDS: CatalogKind[] = ['service', 'product', 'part'];

const emptyForm = (kind: CatalogKind): Partial<CatalogItemRow> => ({
  kind,
  name: '', category: '', unit: 'عدد', suggestedPrice: 0, description: '',
  serviceType: 'سایر', customName: '', supportsInShop: true, supportsOnSite: false,
  availableNow: false, active: true, sortOrder: 0,
});

export default function CatalogPage() {
  const [kind, setKind] = useState<CatalogKind>('service');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: CatalogItemRow[]; total: number; pageSize: number } | null>(null);
  const [meta, setMeta] = useState<CatalogKindMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const can = useCan();
  const mayEdit = can('catalog.edit');
  const kindMeta = meta.find((m) => m.kind === kind);

  const load = useCallback(() => {
    setLoading(true);
    api.catalog.list({ kind, category: category || undefined, q: search || undefined, page, pageSize: 50 })
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [kind, category, search, page]);

  const loadMeta = useCallback(() => {
    api.catalog.meta().then((m) => setMeta(m.byKind)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { setPage(1); setSelected([]); }, [kind, category, search]);

  /* ── create / edit ── */
  const [editing, setEditing] = useState<Partial<CatalogItemRow> | null>(null);
  const [busy, setBusy] = useState(false);
  const isNew = editing && !editing.id;
  const editKind = (editing?.kind || kind) as CatalogKind;

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      // Send only what the form owns; id/key/timestamps are the server's.
      const payload: Partial<CatalogItemRow> = {
        kind: editing.kind, name: editing.name, category: editing.category,
        suggestedPrice: Number(editing.suggestedPrice) || 0,
        active: editing.active !== false,
        ...(editKind === 'service'
          ? {
              serviceType: editing.serviceType || 'سایر',
              customName: editing.customName || '',
              supportsInShop: !!editing.supportsInShop,
              supportsOnSite: !!editing.supportsOnSite,
              availableNow: !!editing.availableNow,
            }
          : {
              unit: editing.unit || 'عدد',
              description: editing.description || '',
            }),
      };
      if (editing.id) await api.catalog.update(editing.id, payload);
      else await api.catalog.create(payload);
      setEditing(null);
      setOk(editing.id ? 'آیتم ویرایش شد' : 'آیتم جدید به کاتالوگ اضافه شد');
      load(); loadMeta();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function toggle(row: CatalogItemRow) {
    setError('');
    try { await api.catalog.setActive(row.id, !row.active); load(); loadMeta(); }
    catch (e: any) { setError(e.message); }
  }

  async function remove(row: CatalogItemRow) {
    if (!confirm(`«${row.name}» از کاتالوگ آماده حذف شود؟\nمواردی که خدمات‌دهنده‌ها قبلاً به خودشان اضافه کرده‌اند دست‌نخورده می‌ماند.`)) return;
    setError('');
    try { await api.catalog.remove(row.id); setOk('آیتم حذف شد'); load(); loadMeta(); }
    catch (e: any) { setError(e.message); }
  }

  async function bulk(active: boolean) {
    setError('');
    try {
      const res = await api.catalog.bulkSetActive(selected, active);
      setOk(`${num(res.updated)} آیتم ${active ? 'فعال' : 'غیرفعال'} شد`);
      setSelected([]); load(); loadMeta();
    } catch (e: any) { setError(e.message); }
  }

  const allOnPage = data?.items.map((i) => i.id) ?? [];
  const allSelected = allOnPage.length > 0 && allOnPage.every((id) => selected.includes(id));

  return (
    <Shell>
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div>
          <p style={{ color: C.accent, fontSize: 12, fontWeight: 900, margin: 0 }}>کاتالوگ آماده</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '6px 0 4px' }}>خدمات و محصولات آماده</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            همان فهرستی که خدمات‌دهنده‌ها با یک کلیک به تعمیرگاه و فروشنده‌ها به فروشگاه‌شان اضافه می‌کنند.
          </p>
        </div>
        {mayEdit && <Button onClick={() => setEditing(emptyForm(kind))}>افزودن آیتم</Button>}
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="success">{ok}</Notice>}

      <Tabs
        tabs={KINDS.map((k) => ({ key: k, label: CATALOG_KIND_LABEL[k], count: meta.find((m) => m.kind === k)?.total }))}
        value={kind}
        onChange={(k) => { setKind(k); setCategory(''); }}
      />

      {kindMeta && (
        <StatGrid min={140}>
          <StatTile label="کل آیتم‌ها" value={num(kindMeta.total)} />
          <StatTile label="فعال" value={num(kindMeta.active)} tone={C.green} />
          <StatTile label="غیرفعال" value={num(kindMeta.total - kindMeta.active)} tone={kindMeta.total - kindMeta.active ? C.amber : undefined} />
          <StatTile label="دسته‌بندی" value={num(kindMeta.categories.length)} />
        </StatGrid>
      )}

      <Card className="row-filter" style={{ margin: '14px 0' }}>
        <Input
          placeholder="جستجو در نام، دسته یا شناسه..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setSearch(q); }}
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">همه دسته‌ها</option>
          {kindMeta?.categories.map((c) => (
            <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
          ))}
        </Select>
        <Button onClick={() => setSearch(q)}>جستجو</Button>

        {selected.length > 0 && mayEdit && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 11 }}>
            <span style={{ fontSize: 12, color: C.muted }}>{num(selected.length)} آیتم انتخاب شده</span>
            <Button size="sm" variant="secondary" onClick={() => bulk(true)}>فعال کردن</Button>
            <Button size="sm" variant="secondary" onClick={() => bulk(false)}>غیرفعال کردن</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>لغو انتخاب</Button>
          </div>
        )}
      </Card>

      <Card padding="0">
        {loading ? <Spinner /> : !data?.items.length ? <EmptyState title="آیتمی پیدا نشد" sub="فیلترها را تغییر دهید یا آیتم جدیدی بسازید" /> : (
          <>
            <Table
              labels={['انتخاب', 'نام', 'دسته', kind === 'service' ? 'نوع پایه' : 'واحد', 'قیمت پیشنهادی',
                       kind === 'service' ? 'محل ارائه' : 'شناسه', 'وضعیت', '']}
              head={[
              mayEdit ? (
                <input
                  key="all" type="checkbox" checked={allSelected} aria-label="انتخاب همه"
                  onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...allOnPage])) : selected.filter((id) => !allOnPage.includes(id)))}
                  style={{ accentColor: C.accent, cursor: 'pointer' }}
                />
              ) : '',
              'نام', 'دسته', kind === 'service' ? 'نوع پایه' : 'واحد', 'قیمت پیشنهادی',
              kind === 'service' ? 'محل ارائه' : 'شناسه', 'وضعیت', '',
            ]}>
              {data.items.map((r) => (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                  <Td>
                    {mayEdit && (
                      <input
                        type="checkbox" checked={selected.includes(r.id)} aria-label={`انتخاب ${r.name}`}
                        onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((id) => id !== r.id))}
                        style={{ accentColor: C.accent, cursor: 'pointer' }}
                      />
                    )}
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                    {r.description && <div style={{ fontSize: 10.5, color: C.subtle, maxWidth: 320 }}>{r.description}</div>}
                  </Td>
                  <Td>{r.category}</Td>
                  <Td>{kind === 'service' ? r.serviceType : r.unit}</Td>
                  <Td>{money(r.suggestedPrice)}</Td>
                  <Td>
                    {kind === 'service' ? (
                      <span style={{ display: 'flex', gap: 5 }}>
                        {r.supportsInShop && <Badge color={C.green}>تعمیرگاه</Badge>}
                        {r.supportsOnSite && <Badge color={C.accent}>در محل</Badge>}
                        <Badge color={r.availableNow ? C.green : C.subtle}>{r.availableNow ? 'موجود' : 'به‌زودی'}</Badge>
                      </span>
                    ) : <span dir="ltr" style={{ fontSize: 11, color: C.subtle }}>{r.key}</span>}
                  </Td>
                  <Td><Badge color={r.active ? C.green : C.red}>{r.active ? 'فعال' : 'غیرفعال'}</Badge></Td>
                  <Td>
                    {mayEdit && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button size="sm" variant="secondary" onClick={() => setEditing({ ...r })}>ویرایش</Button>
                        <Button size="sm" variant="secondary" onClick={() => toggle(r)}>{r.active ? 'غیرفعال' : 'فعال'}</Button>
                        <Button size="sm" variant="danger" onClick={() => remove(r)}>حذف</Button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination page={page} total={data.total} pageSize={data.pageSize} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={!!editing}
        title={isNew ? `افزودن به ${CATALOG_KIND_LABEL[editKind]}` : `ویرایش «${editing?.name || ''}»`}
        onClose={() => setEditing(null)}
        width={600}
        footer={<>
          <Button onClick={save} loading={busy}>{isNew ? 'افزودن' : 'ذخیره'}</Button>
          <Button variant="secondary" onClick={() => setEditing(null)}>انصراف</Button>
        </>}
      >
        {error && <Notice kind="error">{error}</Notice>}
        {editing && (
          <>
            {isNew && (
              <Field label="نوع آیتم">
                <Select value={editing.kind} onChange={(e) => setEditing({ ...emptyForm(e.target.value as CatalogKind) })}>
                  {KINDS.map((k) => <option key={k} value={k}>{CATALOG_KIND_LABEL[k]}</option>)}
                </Select>
              </Field>
            )}

            {editKind === 'service' ? (
              <>
                <Field label="نام خدمت" hint="همان چیزی که مکانیک در فهرست می‌بیند">
                  <Input value={editing.customName || editing.name || ''} onChange={(e) => setEditing({ ...editing, customName: e.target.value, name: e.target.value })} />
                </Field>
                <Field label="نوع پایه" hint="خدمات استاندارد با همین نوع در اپلیکیشن گروه‌بندی می‌شوند؛ برای خدمت اختصاصی «سایر» را بگذارید">
                  <Input value={editing.serviceType || ''} onChange={(e) => setEditing({ ...editing, serviceType: e.target.value })} />
                </Field>
              </>
            ) : (
              <Field label="نام">
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
            )}

            <Field label="دسته‌بندی">
              <Input
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                list="catalog-categories"
              />
              <datalist id="catalog-categories">
                {meta.find((m) => m.kind === editKind)?.categories.map((c) => <option key={c.category} value={c.category} />)}
              </datalist>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: editKind === 'service' ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <Field label="قیمت پیشنهادی (تومان)">
                <Input
                  type="number" dir="ltr" value={editing.suggestedPrice ?? 0}
                  onChange={(e) => setEditing({ ...editing, suggestedPrice: Number(e.target.value) })}
                />
              </Field>
              {editKind !== 'service' && (
                <Field label="واحد">
                  <Input value={editing.unit || ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
                </Field>
              )}
            </div>

            {editKind === 'product' && (
              <Field label="توضیح (اختیاری)">
                <Textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
            )}

            {editKind === 'service' && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 11, marginBottom: 12 }}>
                <Check checked={!!editing.supportsInShop} onChange={(v) => setEditing({ ...editing, supportsInShop: v })} label="ارائه در تعمیرگاه" />
                <Check checked={!!editing.supportsOnSite} onChange={(v) => setEditing({ ...editing, supportsOnSite: v })} label="ارائه در محل مشتری" />
                <Check
                  checked={!!editing.availableNow}
                  onChange={(v) => setEditing({ ...editing, availableNow: v })}
                  label="همین حالا قابل سفارش است"
                />
                <p style={{ fontSize: 11.5, color: C.subtle, margin: '4px 0 0', lineHeight: 1.9 }}>
                  اگر تیک نخورَد، خدمت در کاتالوگ می‌ماند و خدمات‌دهنده می‌تواند به لیست خودش
                  اضافه کند، ولی در اپ مشتری با برچسب «به‌زودی» و بدون دکمه‌ی سفارش دیده می‌شود.
                </p>
              </div>
            )}

            <Check
              checked={editing.active !== false}
              onChange={(v) => setEditing({ ...editing, active: v })}
              label="فعال"
              hint="آیتم غیرفعال در اپلیکیشن خدمات‌دهنده‌ها دیده نمی‌شود"
            />

            {!isNew && (
              <p style={{ fontSize: 10.5, color: C.subtle, margin: '12px 0 0' }}>
                شناسه <span dir="ltr">{editing.key}</span> · آخرین تغییر {toJalali(editing.updatedAt)}
              </p>
            )}
          </>
        )}
      </Modal>
    </Shell>
  );
}
