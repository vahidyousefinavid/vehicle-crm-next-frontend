import { useEffect, useState } from 'react';

const BASE = '/api';

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('crm_token') || '';
}

/** Carries the HTTP status so callers can tell "signed out" from "network hiccup". */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = (err as any).message;
    throw new ApiError(
      Array.isArray(message) ? message.join('، ') : (message || `HTTP ${res.status}`),
      res.status,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface AdminUser {
  id: string; phone: string; name: string; role: 'admin';
  isSuper?: boolean; permissions?: string[];
}
export interface PermissionItem { key: string; label: string }
export interface PermissionGroup { group: string; items: PermissionItem[] }
export interface MeResponse extends AdminUser { permissionGroups: PermissionGroup[] }

export interface AdminRow {
  id: string; phone: string; name: string; active: boolean; createdAt: string;
  isRoot: boolean; isSuper: boolean; permissions: string[]; note?: string | null;
}

export type CatalogKind = 'part' | 'product' | 'service';
export interface CatalogItemRow {
  id: string; kind: CatalogKind; key: string; name: string; category: string;
  unit?: string | null; suggestedPrice: number; description?: string | null;
  serviceType?: string | null; customName?: string | null;
  supportsInShop: boolean; supportsOnSite: boolean;
  availableNow?: boolean;
  active: boolean; sortOrder: number; createdAt: string; updatedAt: string;
}
export interface CatalogKindMeta {
  kind: CatalogKind; total: number; active: number;
  categories: { category: string; count: number }[];
}

export interface TimelineEntry { kind: string; label: string; title: string; subtitle?: string; at: string }

/** Everything the platform holds about one account; sections vary by role. */
export interface UserFull {
  user: UserSummary & { workshopLat?: number; workshopLng?: number };
  stats: Record<string, number>;
  timeline: TimelineEntry[];
  notifications: any[];
  messageCount: number;
  organizations: any[];
  /* owner */
  vehicles?: any[]; serviceRecords?: any[]; documents?: any[]; reminders?: any[]; fuelLogs?: any[];
  /* shared */
  appointments?: any[]; payments?: any[]; invoices?: any[]; reviews?: any[];
  /* mechanic */
  services?: any[]; parts?: any[]; connectedVehicles?: any[]; addedVehicles?: any[]; expenses?: any[];
  /* seller */
  products?: any[]; sales?: any[]; topProducts?: { name: string; quantity: number; revenue: number }[];
  /* admin */
  adminAccess?: { permissions: string[]; isSuper: boolean; note?: string } | null;
}
export interface AuthRes { access_token: string; user: AdminUser }

export interface Paginated<T> { total: number; page: number; pageSize: number; items: T[] }

export type CRole = 'mechanic' | 'seller';
export interface ProviderRow {
  id: string; phone: string; name: string; role: CRole; active: boolean; workshopName?: string; workshopAddress?: string; createdAt: string;
  serviceCount: number; productCount: number; appointmentCount: number; connectedVehicleCount: number; avgRating: number;
}
export interface ManagementServiceRow {
  id: string; serviceType: string; customName?: string; price?: number; supportsInShop: boolean; supportsOnSite: boolean; createdAt: string;
  mechanicId?: string; mechanicName?: string; mechanicPhone?: string; workshopName?: string; mechanicActive: boolean;
}
export interface ServiceAggregate { label: string; requests: number; records: number }
export interface ActivityRow { kind: string; id: string; title: string; subtitle?: string; createdAt: string }
export interface ActivityCount { kind: string; count: number }

export interface UserSummary {
  id: string; phone: string; name: string; role: 'owner' | 'mechanic' | 'admin' | 'seller'; active: boolean;
  workshopName?: string; workshopAddress?: string; createdAt: string;
}
export interface UserDetail extends UserSummary {
  vehicles?: { id: string; make: string; model: string; year: number; plateNumber?: string; currentMileage: number }[];
  connectedVehicles?: number;
  reviewCount?: number;
  avgRating?: number;
  productCount?: number;
  activeProductCount?: number;
}

export interface ProductRow {
  id: string; name: string; category?: string; price: number; stock: number; unit: string;
  imageUrl?: string; active: boolean; createdAt: string; sellerName?: string; sellerPhone?: string;
}

export interface VehicleSummary {
  id: string; make: string; model: string; year: number; plateNumber?: string;
  currentMileage: number; createdAt: string; ownerName?: string; ownerPhone?: string;
}

export interface AppointmentSummary {
  id: string; requestedAt: string; serviceType?: string; status: string; mode: string; address?: string;
  createdAt: string; vehicle: { make: string; model: string; plateNumber?: string } | null;
  ownerName?: string; ownerPhone?: string; mechanicName?: string;
}

export interface PaymentRow { id: string; amount: number; status: string; refId?: string; createdAt: string }
export interface PaymentSummary { totalRevenue: number; successCount: number; byStatus: { status: string; count: number; total: number }[] }

export interface ReviewRow { id: string; rating: number; comment?: string; createdAt: string; mechanicName?: string; ownerName?: string }

export interface OrganizationRow { id: string; name: string; createdAt: string; ownerName?: string; memberCount: number; vehicleCount: number }

export interface DashboardStats {
  owners: number; mechanics: number; activeOwners: number; activeMechanics: number;
  sellers: number; activeSellers: number;
  vehicleCount: number; organizationCount: number; productCount: number;
  appointmentsByStatus: Record<string, number>;
  totalRevenue: number; reviewCount: number; avgRating: number;
}

function qs(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : '';
}

export const api = {
  auth: {
    login: (phone: string, password: string) => req<AuthRes>('POST', '/auth/login', { phone, password }),
    me: () => req<MeResponse>('GET', '/auth/me'),
  },
  dashboard: {
    stats: () => req<DashboardStats>('GET', '/dashboard/stats'),
  },
  users: {
    list: (params: { role?: 'owner' | 'mechanic' | 'seller'; q?: string; page?: number; pageSize?: number }) =>
      req<Paginated<UserSummary>>('GET', `/users${qs(params)}`),
    detail: (id: string) => req<UserDetail>('GET', `/users/${id}`),
    full: (id: string) => req<UserFull>('GET', `/users/${id}/full`),
    update: (id: string, dto: { name?: string; workshopName?: string; workshopAddress?: string }) =>
      req<UserSummary>('PATCH', `/users/${id}`, dto),
    setActive: (id: string, active: boolean) => req<UserSummary>('PATCH', `/users/${id}/active`, { active }),
  },
  vehicles: {
    list: (params: { q?: string; ownerId?: string; page?: number; pageSize?: number }) =>
      req<Paginated<VehicleSummary>>('GET', `/vehicles${qs(params)}`),
    detail: (id: string) => req<any>('GET', `/vehicles/${id}`),
  },
  appointments: {
    list: (params: { status?: string; page?: number; pageSize?: number }) =>
      req<Paginated<AppointmentSummary>>('GET', `/appointments${qs(params)}`),
  },
  payments: {
    list: (params: { status?: string; page?: number; pageSize?: number }) =>
      req<Paginated<PaymentRow>>('GET', `/payments${qs(params)}`),
    summary: () => req<PaymentSummary>('GET', '/payments/summary'),
  },
  reviews: {
    list: (params: { page?: number; pageSize?: number }) => req<Paginated<ReviewRow>>('GET', `/reviews${qs(params)}`),
    remove: (id: string) => req<void>('DELETE', `/reviews/${id}`),
  },
  organizations: {
    list: (params: { page?: number; pageSize?: number }) => req<Paginated<OrganizationRow>>('GET', `/organizations${qs(params)}`),
  },
  products: {
    list: (params: { q?: string; sellerId?: string; page?: number; pageSize?: number }) =>
      req<Paginated<ProductRow>>('GET', `/products${qs(params)}`),
    setActive: (id: string, active: boolean) => req<ProductRow>('PATCH', `/products/${id}/active`, { active }),
  },
  catalog: {
    list: (params: { kind?: CatalogKind; category?: string; q?: string; active?: string; page?: number; pageSize?: number }) =>
      req<Paginated<CatalogItemRow>>('GET', `/catalog${qs(params)}`),
    meta: () => req<{ byKind: CatalogKindMeta[] }>('GET', '/catalog/meta'),
    create: (dto: Partial<CatalogItemRow>) => req<CatalogItemRow>('POST', '/catalog', dto),
    update: (id: string, dto: Partial<CatalogItemRow>) => req<CatalogItemRow>('PATCH', `/catalog/${id}`, dto),
    setActive: (id: string, active: boolean) => req<CatalogItemRow>('PATCH', `/catalog/${id}/active`, { active }),
    bulkSetActive: (ids: string[], active: boolean) => req<{ updated: number }>('PATCH', '/catalog/bulk-active', { ids, active }),
    remove: (id: string) => req<{ ok: boolean }>('DELETE', `/catalog/${id}`),
  },
  admins: {
    list: () => req<{ total: number; items: AdminRow[] }>('GET', '/admins'),
    permissions: () => req<{ groups: PermissionGroup[]; all: string[]; readOnly: string[] }>('GET', '/admins/permissions'),
    create: (dto: { phone: string; name: string; password: string; permissions?: string[]; isSuper?: boolean; note?: string }) =>
      req<AdminRow>('POST', '/admins', dto),
    promote: (userId: string, dto: { password: string; permissions?: string[]; isSuper?: boolean }) =>
      req<AdminRow>('POST', `/admins/promote/${userId}`, dto),
    update: (id: string, dto: { name?: string; password?: string; active?: boolean }) =>
      req<AdminRow>('PATCH', `/admins/${id}`, dto),
    setPermissions: (id: string, dto: { permissions?: string[]; isSuper?: boolean; note?: string }) =>
      req<AdminRow>('PATCH', `/admins/${id}/permissions`, dto),
    remove: (id: string) => req<{ ok: boolean }>('DELETE', `/admins/${id}`),
  },
  management: {
    providers: (params: { role?: CRole; q?: string; page?: number; pageSize?: number }) =>
      req<Paginated<ProviderRow>>('GET', `/management/providers${qs(params)}`),
    services: (params: { q?: string; page?: number; pageSize?: number }) =>
      req<Paginated<ManagementServiceRow> & { aggregates: ServiceAggregate[] }>('GET', `/management/services${qs(params)}`),
    activities: (params: { kind?: string; page?: number; pageSize?: number }) =>
      req<{ page: number; pageSize: number; items: ActivityRow[]; counts: ActivityCount[] }>('GET', `/management/activities${qs(params)}`),
  },
};

// Product images are uploaded to and served by vehicle/service directly (not proxied through this CRM backend).
const VEHICLE_SERVICE_ORIGIN = 'http://localhost:3002';
export function productImageUrl(path?: string | null): string | undefined {
  return path ? `${VEHICLE_SERVICE_ORIGIN}${path}` : undefined;
}

export function toJalali(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'در انتظار', confirmed: 'تاییدشده', rejected: 'ردشده', completed: 'انجام‌شده', cancelled: 'لغوشده',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'در انتظار', success: 'موفق', failed: 'ناموفق',
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: 'در انتظار تایید', approved: 'تاییدشده', rejected: 'ردشده',
};

/** Mirrors EXPENSE_CATEGORY_LABELS in vehicle/service. */
export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  rent: 'اجاره', payroll: 'حقوق و دستمزد', utilities: 'آب، برق، گاز و تلفن',
  parts: 'خرید قطعه', tools: 'ابزار و تجهیزات', maintenance: 'تعمیر و نگهداری',
  transport: 'حمل و نقل', marketing: 'تبلیغات', tax: 'مالیات و عوارض',
  insurance: 'بیمه', other: 'متفرقه',
};

export const CATALOG_KIND_LABEL: Record<CatalogKind, string> = {
  part: 'قطعات تعمیرگاه',
  product: 'محصولات فروشگاه',
  service: 'خدمات آماده',
};

export const ROLE_LABEL: Record<string, string> = {
  owner: 'مالک خودرو', mechanic: 'خدمات‌دهنده', seller: 'فروشنده', admin: 'مدیر',
};

/** Toman amounts are long; the panel always shows them grouped and suffixed. */
export function money(n?: number | null): string {
  if (n === undefined || n === null) return '—';
  return `${Number(n).toLocaleString('fa-IR')} تومان`;
}

export function num(n?: number | null): string {
  if (n === undefined || n === null) return '۰';
  return Number(n).toLocaleString('fa-IR');
}

/** Reads the cached admin so a page can hide what the account may not use. */
export function cachedAdmin(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('crm_user') || 'null'); } catch { return null; }
}

export function can(permission: string, admin: AdminUser | null): boolean {
  if (!admin) return false;
  if (admin.isSuper) return true;
  return (admin.permissions ?? []).includes(permission);
}

/** Broadcast by Shell once /auth/me has refreshed the cached admin. */
export const ADMIN_CHANGED_EVENT = 'crm:admin-changed';

/**
 * The cached admin, but never during the first render. localStorage does not
 * exist on the server, so reading it while rendering makes the server and the
 * client disagree and React throws away the tree; waiting for mount keeps both
 * passes identical and only then reveals the actions this account may take.
 */
export function useAdmin(): AdminUser | null {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  useEffect(() => {
    const read = () => setAdmin(cachedAdmin());
    read();
    window.addEventListener(ADMIN_CHANGED_EVENT, read);
    return () => window.removeEventListener(ADMIN_CHANGED_EVENT, read);
  }, []);
  return admin;
}

/** `const can = useCan()` — same call shape as before, hydration-safe. */
export function useCan(): (permission: string) => boolean {
  const admin = useAdmin();
  return (permission: string) => can(permission, admin);
}
