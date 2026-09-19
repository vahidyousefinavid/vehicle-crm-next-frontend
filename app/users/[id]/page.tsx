'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import {
  C, Card, Button, Badge, Table, Td, Spinner, EmptyState, Modal, Field, Input,
  StatTile, StatGrid, Tabs, Notice, KeyValue,
} from '@/components/ui';
import { api, UserFull, toJalali, money, num, useCan, ROLE_LABEL, APPOINTMENT_STATUS_LABEL, PAYMENT_STATUS_LABEL, INVOICE_STATUS_LABEL, EXPENSE_CATEGORY_LABEL } from '@/lib/api';

/* Each role gets its own set of tabs; the key doubles as the section name. */
type TabKey =
  | 'overview' | 'timeline'
  | 'vehicles' | 'serviceRecords' | 'documents' | 'reminders' | 'fuelLogs'
  | 'services' | 'parts' | 'connectedVehicles' | 'addedVehicles' | 'expenses'
  | 'products' | 'sales'
  | 'appointments' | 'payments' | 'invoices' | 'reviews' | 'notifications';

const TABS_BY_ROLE: Record<string, { key: TabKey; label: string }[]> = {
  owner: [
    { key: 'overview', label: 'خلاصه' },
    { key: 'timeline', label: 'فعالیت‌ها' },
    { key: 'vehicles', label: 'خودروها' },
    { key: 'serviceRecords', label: 'سوابق سرویس' },
    { key: 'appointments', label: 'نوبت‌ها' },
    { key: 'documents', label: 'مدارک' },
    { key: 'reminders', label: 'یادآورها' },
    { key: 'fuelLogs', label: 'سوخت' },
    { key: 'invoices', label: 'فاکتورها' },
    { key: 'payments', label: 'پرداخت‌ها' },
    { key: 'reviews', label: 'نظرات ثبت‌شده' },
    { key: 'notifications', label: 'اعلان‌ها' },
  ],
  mechanic: [
    { key: 'overview', label: 'خلاصه' },
    { key: 'timeline', label: 'فعالیت‌ها' },
    { key: 'services', label: 'خدماتی که ارائه می‌دهد' },
    { key: 'parts', label: 'انبار قطعات' },
    { key: 'appointments', label: 'نوبت‌ها' },
    { key: 'connectedVehicles', label: 'خودروهای متصل' },
    { key: 'addedVehicles', label: 'خودروهای افزوده' },
    { key: 'serviceRecords', label: 'سرویس‌های ثبت‌شده' },
    { key: 'invoices', label: 'فاکتورها' },
    { key: 'expenses', label: 'هزینه‌های تعمیرگاه' },
    { key: 'reviews', label: 'نظرات دریافتی' },
    { key: 'notifications', label: 'اعلان‌ها' },
  ],
  seller: [
    { key: 'overview', label: 'خلاصه' },
    { key: 'timeline', label: 'فعالیت‌ها' },
    { key: 'products', label: 'محصولات فروشگاه' },
    { key: 'sales', label: 'فروش‌ها' },
    { key: 'notifications', label: 'اعلان‌ها' },
  ],
  admin: [
    { key: 'overview', label: 'خلاصه' },
    { key: 'timeline', label: 'فعالیت‌ها' },
    { key: 'notifications', label: 'اعلان‌ها' },
  ],
};

const STAT_LABELS: Record<string, string> = {
  vehicleCount: 'خودرو', appointmentCount: 'نوبت', serviceRecordCount: 'سابقه سرویس',
  serviceSpend: 'هزینه سرویس', paidTotal: 'پرداخت موفق', fuelSpend: 'هزینه سوخت', openReminders: 'یادآور باز',
  serviceCount: 'خدمت ارائه‌شده', partCount: 'قلم قطعه', inventoryValue: 'ارزش انبار',
  pendingAppointments: 'نوبت در انتظار', completedAppointments: 'نوبت انجام‌شده',
  connectedVehicleCount: 'خودروی متصل', addedVehicleCount: 'خودروی افزوده',
  reviewCount: 'نظر', avgRating: 'میانگین امتیاز', invoiceCount: 'فاکتور',
  invoiceRevenue: 'درآمد فاکتورها', expenseTotal: 'هزینه‌ها',
  productCount: 'محصول', activeProductCount: 'محصول فعال', outOfStockCount: 'ناموجود',
  saleCount: 'فروش', salesRevenue: 'درآمد فروش', itemsSold: 'قلم فروخته‌شده',
};
const MONEY_STATS = new Set([
  'serviceSpend', 'paidTotal', 'fuelSpend', 'inventoryValue', 'invoiceRevenue', 'expenseTotal', 'salesRevenue',
]);

const plate = (r: any) => [r.make, r.model].filter(Boolean).join(' ') || '—';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<UserFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', workshopName: '', workshopAddress: '' });
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ password: '', isSuper: false });
  const can = useCan();

  const load = useCallback(() => {
    setLoading(true);
    api.users.full(id)
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const user = data?.user;
  const isBusiness = user?.role === 'mechanic' || user?.role === 'seller';
  const tabs = useMemo(() => {
    const all = TABS_BY_ROLE[user?.role || 'owner'] || TABS_BY_ROLE.owner;
    return all.map((t) => {
      const section = (data as any)?.[t.key];
      return { ...t, count: Array.isArray(section) ? section.length : undefined };
    });
  }, [data, user?.role]);

  async function toggleActive() {
    if (!user) return;
    try { await api.users.setActive(user.id, !user.active); load(); }
    catch (e: any) { setError(e.message); }
  }

  function openEdit() {
    if (!user) return;
    setForm({ name: user.name || '', workshopName: user.workshopName || '', workshopAddress: user.workshopAddress || '' });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await api.users.update(id, isBusiness ? form : { name: form.name });
      setEditing(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  /** Promoting keeps the account and its data; it only adds panel access. */
  async function promote() {
    setSaving(true);
    try {
      await api.admins.promote(id, { password: promoteForm.password, isSuper: promoteForm.isSuper });
      setPromoting(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Shell><Spinner /></Shell>;
  if (!data || !user) return <Shell><Notice kind="error">{error || 'کاربر پیدا نشد'}</Notice></Shell>;

  return (
    <Shell>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, marginBottom: 14, cursor: 'pointer', fontFamily: 'Vazirmatn' }}>
        ← بازگشت
      </button>

      {error && <Notice kind="error">{error}</Notice>}

      {/* ── identity header ── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 19, fontWeight: 900, color: C.text, margin: 0 }}>
                {isBusiness ? (user.workshopName || user.name) : user.name}
              </h1>
              <Badge color={user.role === 'mechanic' ? C.green : user.role === 'seller' ? '#A78BFA' : user.role === 'admin' ? C.amber : C.accent}>
                {ROLE_LABEL[user.role] || user.role}
              </Badge>
              <Badge color={user.active ? C.green : C.red}>{user.active ? 'فعال' : 'مسدود'}</Badge>
            </div>
            {isBusiness && <p style={{ fontSize: 12.5, color: C.muted, margin: '6px 0 0' }}>مسئول: {user.name}</p>}
            <p style={{ fontSize: 12.5, color: C.muted, margin: '4px 0 0', direction: 'ltr', textAlign: 'right' }}>{user.phone}</p>
            {user.workshopAddress && <p style={{ fontSize: 12, color: C.subtle, margin: '4px 0 0' }}>{user.workshopAddress}</p>}
            <p style={{ fontSize: 11.5, color: C.subtle, margin: '4px 0 0' }}>عضویت: {toJalali(user.createdAt)}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {can('users.edit') && <Button size="sm" variant="secondary" onClick={openEdit}>ویرایش اطلاعات</Button>}
            {user.role === 'seller' && (
              <Link href={`/products?sellerId=${user.id}`}><Button size="sm" variant="secondary">محصولات در فهرست کل</Button></Link>
            )}
            {can('admins.manage') && user.role !== 'admin' && (
              <Button size="sm" variant="secondary" onClick={() => { setPromoteForm({ password: '', isSuper: false }); setPromoting(true); }}>
                ارتقا به مدیر
              </Button>
            )}
            {can('users.block') && user.role !== 'admin' && (
              <Button size="sm" variant={user.active ? 'danger' : 'secondary'} onClick={toggleActive}>
                {user.active ? 'مسدودسازی حساب' : 'رفع مسدودی'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && <Overview data={data} />}
      {tab === 'timeline' && <Timeline entries={data.timeline} />}
      {tab !== 'overview' && tab !== 'timeline' && (
        <SectionTable tab={tab} rows={((data as any)[tab] || []) as any[]} />
      )}

      <Modal
        open={editing}
        title="ویرایش اطلاعات کاربر"
        onClose={() => setEditing(false)}
        footer={<>
          <Button onClick={saveEdit} loading={saving}>ذخیره</Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>انصراف</Button>
        </>}
      >
        <Field label="نام مسئول"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        {isBusiness && <>
          <Field label={user.role === 'mechanic' ? 'نام تعمیرگاه' : 'نام فروشگاه'}>
            <Input value={form.workshopName} onChange={(e) => setForm({ ...form, workshopName: e.target.value })} />
          </Field>
          <Field label="آدرس">
            <Input value={form.workshopAddress} onChange={(e) => setForm({ ...form, workshopAddress: e.target.value })} />
          </Field>
        </>}
      </Modal>

      <Modal
        open={promoting}
        title={`ارتقای «${user.name}» به مدیر`}
        onClose={() => setPromoting(false)}
        footer={<>
          <Button onClick={promote} loading={saving}>ارتقا به مدیر</Button>
          <Button variant="secondary" onClick={() => setPromoting(false)}>انصراف</Button>
        </>}
      >
        <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 14px', lineHeight: 1.8 }}>
          حساب کاربری و همه اطلاعاتش دست‌نخورده می‌ماند و فقط دسترسی به پنل مدیریت اضافه می‌شود.
          به‌صورت پیش‌فرض فقط دسترسی «مشاهده» می‌گیرد؛ بعد از ارتقا می‌توانید از صفحه مدیران دقیق‌ترش کنید.
        </p>
        <Field label="رمز عبور ورود به پنل" hint="حداقل ۶ کاراکتر">
          <Input type="password" value={promoteForm.password} onChange={(e) => setPromoteForm({ ...promoteForm, password: e.target.value })} />
        </Field>
      </Modal>
    </Shell>
  );
}

/* ── overview ─────────────────────────────────────────────────────────── */

function Overview({ data }: { data: UserFull }) {
  const stats = Object.entries(data.stats || {}).filter(([k]) => STAT_LABELS[k]);
  const u = data.user as any;

  return (
    <>
      {stats.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: '0 0 12px' }}>آمار کلی</p>
          <StatGrid>
            {stats.map(([k, v]) => (
              <StatTile key={k} label={STAT_LABELS[k]} value={MONEY_STATS.has(k) ? money(v) : num(v)} />
            ))}
          </StatGrid>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <Card>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>مشخصات</p>
          <KeyValue items={[
            { k: 'نام', v: u.name },
            { k: 'موبایل', v: <span dir="ltr">{u.phone}</span> },
            { k: 'نقش', v: ROLE_LABEL[u.role] || u.role },
            { k: 'وضعیت', v: u.active ? 'فعال' : 'مسدود' },
            { k: 'کسب‌وکار', v: u.workshopName },
            { k: 'آدرس', v: u.workshopAddress },
            { k: 'مختصات', v: u.workshopLat ? <span dir="ltr">{u.workshopLat}, {u.workshopLng}</span> : '' },
            { k: 'تاریخ عضویت', v: toJalali(u.createdAt) },
            { k: 'تعداد پیام', v: num(data.messageCount) },
          ]} />
        </Card>

        <Card>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>سازمان‌ها</p>
          {!data.organizations?.length
            ? <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>عضو هیچ سازمانی نیست</p>
            : <KeyValue items={data.organizations.map((o: any) => ({
                k: o.name, v: `${o.membership === 'owner' ? 'مالک' : 'عضو'} · ${num(o.memberCount)} عضو`,
              }))} />}
        </Card>

        {data.adminAccess && (
          <Card>
            <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>دسترسی مدیریتی</p>
            {data.adminAccess.isSuper
              ? <Badge color={C.amber}>مدیر ارشد — همه دسترسی‌ها</Badge>
              : <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{data.adminAccess.permissions.length} دسترسی فعال</p>}
            <div style={{ marginTop: 10 }}>
              <Link href="/admins"><Button size="sm" variant="secondary">مدیریت دسترسی‌ها</Button></Link>
            </div>
          </Card>
        )}

        {!!data.topProducts?.length && (
          <Card>
            <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>پرفروش‌ترین‌ها</p>
            <KeyValue items={data.topProducts.map((p) => ({ k: p.name, v: `${num(p.quantity)} عدد · ${money(p.revenue)}` }))} />
          </Card>
        )}
      </div>
    </>
  );
}

/* ── timeline ─────────────────────────────────────────────────────────── */

function Timeline({ entries }: { entries: UserFull['timeline'] }) {
  if (!entries?.length) return <Card><EmptyState title="فعالیتی ثبت نشده" /></Card>;
  return (
    <Card padding="8px 20px">
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '13px 0', borderBottom: i === entries.length - 1 ? 'none' : `1px solid ${C.border}` }}>
          <div style={{ flexShrink: 0, width: 96 }}>
            <Badge color={C.accent}>{e.label}</Badge>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{e.title}</p>
            {e.subtitle && <p style={{ fontSize: 11.5, color: C.muted, margin: '3px 0 0' }}>{e.subtitle}</p>}
          </div>
          <div style={{ flexShrink: 0, fontSize: 11, color: C.subtle }}>{toJalali(e.at)}</div>
        </div>
      ))}
    </Card>
  );
}

/* ── per-section tables ───────────────────────────────────────────────── */

type Col = { h: string; cell: (r: any) => React.ReactNode };

const SECTIONS: Record<string, { empty: string; cols: Col[] }> = {
  vehicles: { empty: 'خودرویی ثبت نشده', cols: [
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'سال', cell: r => num(r.year) },
    { h: 'پلاک', cell: r => <span dir="ltr">{r.plateNumber || '—'}</span> },
    { h: 'کارکرد', cell: r => `${num(r.currentMileage)} km` },
    { h: 'سرویس', cell: r => num(r.serviceCount) },
    { h: 'مدارک', cell: r => num(r.documentCount) },
    { h: 'مکانیک متصل', cell: r => num(r.mechanicCount) },
    { h: 'ثبت', cell: r => toJalali(r.createdAt) },
  ]},
  serviceRecords: { empty: 'سابقه سرویسی ثبت نشده', cols: [
    { h: 'نوع سرویس', cell: r => r.serviceType },
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'کارکرد', cell: r => num(r.mileage) },
    { h: 'هزینه', cell: r => money(r.cost) },
    { h: 'تعمیرگاه', cell: r => r.workshop || '—' },
    { h: 'تاریخ', cell: r => toJalali(r.serviceDate || r.createdAt) },
  ]},
  appointments: { empty: 'نوبتی ثبت نشده', cols: [
    { h: 'خدمت', cell: r => r.serviceType || 'نامشخص' },
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'طرف مقابل', cell: r => r.mechanicWorkshop || r.mechanicName || r.ownerName || '—' },
    { h: 'وضعیت', cell: r => <Badge color={r.status === 'completed' ? C.green : r.status === 'pending' ? C.amber : C.muted}>{APPOINTMENT_STATUS_LABEL[r.status] || r.status}</Badge> },
    { h: 'حالت', cell: r => (r.mode === 'onsite' ? 'در محل' : 'در تعمیرگاه') },
    { h: 'زمان', cell: r => toJalali(r.requestedAt) },
  ]},
  documents: { empty: 'مدرکی ثبت نشده', cols: [
    { h: 'عنوان', cell: r => r.title },
    { h: 'نوع', cell: r => r.type },
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'صدور', cell: r => toJalali(r.issueDate) },
    { h: 'انقضا', cell: r => toJalali(r.expiryDate) },
  ]},
  reminders: { empty: 'یادآوری ثبت نشده', cols: [
    { h: 'عنوان', cell: r => r.title },
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'سررسید', cell: r => toJalali(r.dueDate) || (r.dueMileage ? `${num(r.dueMileage)} km` : '—') },
    { h: 'اولویت', cell: r => r.priority || '—' },
    { h: 'وضعیت', cell: r => <Badge color={r.isCompleted ? C.green : C.amber}>{r.isCompleted ? 'انجام‌شده' : 'باز'}</Badge> },
  ]},
  fuelLogs: { empty: 'ثبت سوختی وجود ندارد', cols: [
    { h: 'مقدار', cell: r => `${num(r.liters)} لیتر` },
    { h: 'هزینه', cell: r => money(r.cost) },
    { h: 'کارکرد', cell: r => num(r.mileage) },
    { h: 'جایگاه', cell: r => r.station || '—' },
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'تاریخ', cell: r => toJalali(r.date) },
  ]},
  services: { empty: 'خدمتی ثبت نکرده', cols: [
    { h: 'خدمت', cell: r => r.customName || r.serviceType },
    { h: 'نوع پایه', cell: r => r.serviceType },
    { h: 'قیمت', cell: r => money(r.price) },
    { h: 'در تعمیرگاه', cell: r => <Badge color={r.supportsInShop ? C.green : C.subtle}>{r.supportsInShop ? 'بله' : 'خیر'}</Badge> },
    { h: 'در محل', cell: r => <Badge color={r.supportsOnSite ? C.green : C.subtle}>{r.supportsOnSite ? 'بله' : 'خیر'}</Badge> },
    { h: 'ثبت', cell: r => toJalali(r.createdAt) },
  ]},
  parts: { empty: 'قطعه‌ای در انبار نیست', cols: [
    { h: 'قطعه', cell: r => r.name },
    { h: 'دسته', cell: r => r.category || '—' },
    { h: 'کد', cell: r => <span dir="ltr">{r.sku || '—'}</span> },
    { h: 'قیمت واحد', cell: r => money(r.unitPrice) },
    { h: 'موجودی', cell: r => `${num(r.quantity)} ${r.unit || ''}` },
    { h: 'وضعیت', cell: r => <Badge color={r.inStock ? C.green : C.red}>{r.inStock ? 'موجود' : 'ناموجود'}</Badge> },
  ]},
  connectedVehicles: { empty: 'خودروی متصلی ندارد', cols: [
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'پلاک', cell: r => <span dir="ltr">{r.plateNumber || '—'}</span> },
    { h: 'مالک', cell: r => r.ownerName || '—' },
    { h: 'موبایل مالک', cell: r => <span dir="ltr">{r.ownerPhone || '—'}</span> },
    { h: 'وضعیت', cell: r => <Badge color={r.revoked ? C.red : C.green}>{r.revoked ? 'لغو شده' : 'فعال'}</Badge> },
    { h: 'از تاریخ', cell: r => toJalali(r.grantedAt) },
  ]},
  addedVehicles: { empty: 'خودرویی اضافه نکرده', cols: [
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'سال', cell: r => num(r.year) },
    { h: 'پلاک', cell: r => <span dir="ltr">{r.plateNumber || '—'}</span> },
    { h: 'مشتری', cell: r => r.customerName || '—' },
    { h: 'وضعیت اتصال', cell: r => r.linkStatus || '—' },
    { h: 'ثبت', cell: r => toJalali(r.createdAt) },
  ]},
  expenses: { empty: 'هزینه‌ای ثبت نشده', cols: [
    { h: 'دسته', cell: r => EXPENSE_CATEGORY_LABEL[r.category] || r.category },
    { h: 'مبلغ', cell: r => money(r.amount) },
    { h: 'شرح', cell: r => r.description || '—' },
    { h: 'تکرارشونده', cell: r => (r.recurring ? 'بله' : 'خیر') },
    { h: 'تاریخ', cell: r => toJalali(r.spentAt) },
  ]},
  invoices: { empty: 'فاکتوری ثبت نشده', cols: [
    { h: 'شماره', cell: r => <span dir="ltr">{r.number || '—'}</span> },
    { h: 'خدمت', cell: r => r.serviceType || '—' },
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'جمع اقلام', cell: r => money(r.itemsTotal) },
    { h: 'پرداختی', cell: r => money(r.paidAmount) },
    { h: 'وضعیت', cell: r => <Badge color={r.status === 'approved' ? C.green : r.status === 'rejected' ? C.red : C.amber}>{INVOICE_STATUS_LABEL[r.status] || r.status}</Badge> },
    { h: 'تاریخ', cell: r => toJalali(r.createdAt) },
  ]},
  payments: { empty: 'پرداختی ثبت نشده', cols: [
    { h: 'مبلغ', cell: r => money(r.amount) },
    { h: 'وضعیت', cell: r => <Badge color={r.status === 'success' ? C.green : r.status === 'failed' ? C.red : C.amber}>{PAYMENT_STATUS_LABEL[r.status] || r.status}</Badge> },
    { h: 'کد پیگیری', cell: r => <span dir="ltr">{r.refId || '—'}</span> },
    { h: 'خودرو', cell: r => plate(r) },
    { h: 'تاریخ', cell: r => toJalali(r.createdAt) },
  ]},
  reviews: { empty: 'نظری ثبت نشده', cols: [
    { h: 'امتیاز', cell: r => `${num(r.rating)} ★` },
    { h: 'متن', cell: r => r.comment || '—' },
    { h: 'طرف مقابل', cell: r => r.mechanicWorkshop || r.mechanicName || r.ownerName || '—' },
    { h: 'تاریخ', cell: r => toJalali(r.createdAt) },
  ]},
  products: { empty: 'محصولی ثبت نکرده', cols: [
    { h: 'محصول', cell: r => r.name },
    { h: 'دسته', cell: r => r.category || '—' },
    { h: 'قیمت', cell: r => money(r.price) },
    { h: 'موجودی', cell: r => `${num(r.stock)} ${r.unit || ''}` },
    { h: 'وضعیت', cell: r => <Badge color={r.active ? C.green : C.red}>{r.active ? 'فعال' : 'غیرفعال'}</Badge> },
    { h: 'ثبت', cell: r => toJalali(r.createdAt) },
  ]},
  sales: { empty: 'فروشی ثبت نشده', cols: [
    { h: 'مشتری', cell: r => r.customerName || 'مشتری حضوری' },
    { h: 'موبایل', cell: r => <span dir="ltr">{r.customerPhone || '—'}</span> },
    { h: 'اقلام', cell: r => num(r.itemCount) },
    { h: 'جمع', cell: r => money(r.itemsTotal) },
    { h: 'دریافتی', cell: r => money(r.paidAmount) },
    { h: 'تاریخ', cell: r => toJalali(r.soldAt) },
  ]},
  notifications: { empty: 'اعلانی ثبت نشده', cols: [
    { h: 'عنوان', cell: r => r.title },
    { h: 'متن', cell: r => r.body || '—' },
    { h: 'نوع', cell: r => r.type || '—' },
    { h: 'وضعیت', cell: r => r.status || '—' },
    { h: 'خوانده', cell: r => <Badge color={r.read ? C.green : C.amber}>{r.read ? 'بله' : 'خیر'}</Badge> },
    { h: 'تاریخ', cell: r => toJalali(r.createdAt) },
  ]},
};

function SectionTable({ tab, rows }: { tab: string; rows: any[] }) {
  const section = SECTIONS[tab];
  if (!section) return <Card><EmptyState title="این بخش وجود ندارد" /></Card>;
  if (!rows.length) return <Card><EmptyState title={section.empty} /></Card>;

  return (
    <Card padding="0">
      <Table head={section.cols.map(c => c.h)}>
        {rows.map((r, i) => (
          <tr key={r.id || i}>
            {section.cols.map((c, ci) => <Td key={ci}>{c.cell(r)}</Td>)}
          </tr>
        ))}
      </Table>
    </Card>
  );
}
