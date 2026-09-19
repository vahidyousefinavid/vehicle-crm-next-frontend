'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import {
  C, Card, Button, Badge, Input, Table, Td, Spinner, EmptyState,
  Modal, Field, Check, Notice, Textarea,
} from '@/components/ui';
import { api, AdminRow, PermissionGroup, useAdmin, useCan, toJalali } from '@/lib/api';

export default function AdminsPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [readOnly, setReadOnly] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const me = useAdmin();
  const can = useCan();
  const mayManage = can('admins.manage');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.admins.list(), api.admins.permissions()])
      .then(([list, perms]) => {
        setRows(list.items);
        setGroups(perms.groups);
        setReadOnly(perms.readOnly);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ── create ── */
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '', password: '', note: '' });
  const [perms, setPerms] = useState<string[]>([]);
  const [isSuper, setIsSuper] = useState(false);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setForm({ phone: '', name: '', password: '', note: '' });
    setPerms(readOnly);
    setIsSuper(false);
    setError('');
    setCreating(true);
  }

  async function submitCreate() {
    setBusy(true);
    try {
      await api.admins.create({ ...form, permissions: perms, isSuper });
      setCreating(false);
      setOk('مدیر جدید اضافه شد');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  /* ── permissions editor ── */
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editSuper, setEditSuper] = useState(false);

  function openPerms(row: AdminRow) {
    setEditing(row);
    setEditPerms(row.permissions);
    setEditSuper(row.isSuper);
    setError('');
  }

  async function savePerms() {
    if (!editing) return;
    setBusy(true);
    try {
      await api.admins.setPermissions(editing.id, { permissions: editPerms, isSuper: editSuper });
      setEditing(null);
      setOk('دسترسی‌ها به‌روزرسانی شد');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  /* ── account edit (name / password / active) ── */
  const [account, setAccount] = useState<AdminRow | null>(null);
  const [accForm, setAccForm] = useState({ name: '', password: '' });

  function openAccount(row: AdminRow) {
    setAccount(row);
    setAccForm({ name: row.name, password: '' });
    setError('');
  }

  async function saveAccount() {
    if (!account) return;
    setBusy(true);
    try {
      await api.admins.update(account.id, {
        name: accForm.name,
        ...(accForm.password ? { password: accForm.password } : {}),
      });
      setAccount(null);
      setOk('اطلاعات مدیر ذخیره شد');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function toggleActive(row: AdminRow) {
    setError('');
    try { await api.admins.update(row.id, { active: !row.active }); load(); }
    catch (e: any) { setError(e.message); }
  }

  async function remove(row: AdminRow) {
    if (!confirm(`دسترسی مدیریت «${row.name}» حذف شود؟ حساب کاربری‌اش باقی می‌ماند.`)) return;
    setError('');
    try { await api.admins.remove(row.id); setOk('دسترسی مدیریت حذف شد'); load(); }
    catch (e: any) { setError(e.message); }
  }

  const allKeys = groups.flatMap((g) => g.items.map((i) => i.key));

  function PermissionEditor({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
    const toggle = (key: string, on: boolean) => onChange(on ? [...value, key] : value.filter((k) => k !== key));
    return (
      <div style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
        <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
          <Button size="sm" variant="secondary" onClick={() => onChange(allKeys)}>انتخاب همه</Button>
          <Button size="sm" variant="secondary" onClick={() => onChange(readOnly)}>فقط مشاهده</Button>
          <Button size="sm" variant="secondary" onClick={() => onChange([])}>هیچ‌کدام</Button>
        </div>
        {groups.map((g) => (
          <div key={g.group} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.accent, margin: '0 0 4px' }}>{g.group}</p>
            {g.items.map((i) => (
              <Check key={i.key} checked={value.includes(i.key)} onChange={(on) => toggle(i.key, on)} label={i.label} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Shell>
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div>
          <p style={{ color: C.accent, fontSize: 12, fontWeight: 900, margin: 0 }}>مدیریت دسترسی</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '6px 0 4px' }}>مدیران پنل</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            مدیر اضافه یا حذف کن و برای هر کدام مشخص کن به کدام بخش‌ها دسترسی داشته باشد.
          </p>
        </div>
        {mayManage && <Button onClick={openCreate}>افزودن مدیر</Button>}
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="success">{ok}</Notice>}

      <Card padding="0">
        {loading ? <Spinner /> : !rows.length ? <EmptyState title="مدیری ثبت نشده" /> : (
          <Table head={['نام', 'موبایل', 'دسترسی', 'وضعیت', 'عضویت', '']}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/users/${r.id}`} style={{ color: C.text, textDecoration: 'none', fontWeight: 800 }}>{r.name}</Link>
                  {r.id === me?.id && <span style={{ color: C.subtle, fontSize: 11, marginRight: 6 }}>(شما)</span>}
                  {r.note && <div style={{ color: C.subtle, fontSize: 10.5 }}>{r.note}</div>}
                </Td>
                <Td style={{ direction: 'ltr', textAlign: 'right' }}>{r.phone}</Td>
                <Td>
                  {r.isRoot ? <Badge color={C.amber}>مدیر اصلی</Badge>
                    : r.isSuper ? <Badge color={C.amber}>مدیر ارشد</Badge>
                    : <span style={{ fontSize: 12 }}>{r.permissions.length.toLocaleString('fa-IR')} دسترسی</span>}
                </Td>
                <Td><Badge color={r.active ? C.green : C.red}>{r.active ? 'فعال' : 'غیرفعال'}</Badge></Td>
                <Td>{toJalali(r.createdAt)}</Td>
                <Td>
                  {mayManage && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Button size="sm" variant="secondary" onClick={() => openAccount(r)}>ویرایش</Button>
                      <Button size="sm" variant="secondary" disabled={r.isRoot || r.id === me?.id} onClick={() => openPerms(r)}>دسترسی‌ها</Button>
                      <Button size="sm" variant="secondary" disabled={r.isRoot || r.id === me?.id} onClick={() => toggleActive(r)}>
                        {r.active ? 'غیرفعال' : 'فعال'}
                      </Button>
                      <Button size="sm" variant="danger" disabled={r.isRoot || r.id === me?.id} onClick={() => remove(r)}>حذف</Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* create */}
      <Modal
        open={creating} title="افزودن مدیر جدید" onClose={() => setCreating(false)} width={620}
        footer={<>
          <Button onClick={submitCreate} loading={busy}>ایجاد مدیر</Button>
          <Button variant="secondary" onClick={() => setCreating(false)}>انصراف</Button>
        </>}
      >
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="شماره موبایل" hint="۱۱ رقم، با ۰۹ شروع شود. اگر این شماره از قبل کاربر عادی است، از صفحه همان کاربر ارتقا دهید.">
          <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="نام و نام خانوادگی">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="رمز عبور" hint="حداقل ۶ کاراکتر">
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="یادداشت (اختیاری)">
          <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ minHeight: 54 }} />
        </Field>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 13, marginTop: 6 }}>
          <Check
            checked={isSuper} onChange={setIsSuper}
            label="مدیر ارشد"
            hint="همه دسترسی‌های فعلی و آینده را دارد و انتخاب تک‌تک لازم نیست"
          />
          <div style={{ marginTop: 10 }}>
            <PermissionEditor value={perms} onChange={setPerms} disabled={isSuper} />
          </div>
        </div>
      </Modal>

      {/* permissions */}
      <Modal
        open={!!editing} title={`دسترسی‌های ${editing?.name || ''}`} onClose={() => setEditing(null)} width={620}
        footer={<>
          <Button onClick={savePerms} loading={busy}>ذخیره دسترسی‌ها</Button>
          <Button variant="secondary" onClick={() => setEditing(null)}>انصراف</Button>
        </>}
      >
        {error && <Notice kind="error">{error}</Notice>}
        <Check checked={editSuper} onChange={setEditSuper} label="مدیر ارشد" hint="همه دسترسی‌ها، بدون نیاز به انتخاب تکی" />
        <div style={{ marginTop: 10 }}>
          <PermissionEditor value={editPerms} onChange={setEditPerms} disabled={editSuper} />
        </div>
      </Modal>

      {/* account */}
      <Modal
        open={!!account} title={`ویرایش ${account?.name || ''}`} onClose={() => setAccount(null)}
        footer={<>
          <Button onClick={saveAccount} loading={busy}>ذخیره</Button>
          <Button variant="secondary" onClick={() => setAccount(null)}>انصراف</Button>
        </>}
      >
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="نام"><Input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} /></Field>
        <Field label="رمز عبور جدید" hint="خالی بگذارید تا تغییر نکند">
          <Input type="password" value={accForm.password} onChange={(e) => setAccForm({ ...accForm, password: e.target.value })} />
        </Field>
      </Modal>
    </Shell>
  );
}
