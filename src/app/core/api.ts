import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type Doc = Record<string, any>;
export type RankedType = 'doctors' | 'facilities' | 'labs';
export type Page<T = Doc> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type Meta = {
  cities: { slug: string; name: string; localities: string[] }[];
  specialties: { slug: string; name: string; focusAreas: { slug: string; name: string }[] }[];
  specialtyCategories: string[];
  facilityTypes: {
    name: string;
    slug: string;
    group: 'hospital' | 'clinic';
    icon: string;
    description: string;
  }[];
  facilities: { slug: string; name: string; city: string; area: string }[];
  labCategories: { slug: string; name: string }[];
  medicineCategories: { slug: string; name: string }[];
  articleCategories: string[];
  surgeries: {
    slug: string;
    name: string;
    category: string;
    specialty: string;
    cost: [number, number];
  }[];
  conditions: { slug: string; name: string; specialty: string }[];
  surgeryCategories: string[];
  contentPages: string[];
  settingGroups: string[];
};

export type Stats = {
  counts: Record<string, number>;
  appointmentsToday: number;
  appointmentsTodayByMode: { clinic: number; video: number; audio: number };
  callsToday: number;
  whatsappToday: number;
  loginsToday: number;
  activeUsers7d: number;
  newReports: number;
  newLeads: number;
  adminDoctors: number;
  ordersByStatus: Record<string, number>;
  recentAppointments: Doc[];
  recentLeads: Doc[];
  recentOrders: Doc[];
};

/** GET /admin/doctar/status: the Doctar directory the website reads doctors and hospitals from. */
export type DoctarStatus = {
  enabled: boolean;
  status: 'disabled' | 'loading' | 'ready' | 'unavailable';
  builtAt: string | null;
  /** Where the current copy came from: a fresh read of Doctar, or the saved copy loaded at start-up. */
  from: 'doctar' | 'cache' | null;
  error: string | null;
  doctors: number;
  facilities: number;
  overlays: number;
  report: {
    scanned: number;
    doctors: number;
    facilities: number;
    skippedDoctors: Record<string, number>;
    skippedFacilities: Record<string, number>;
    seconds: number;
    peakRssMb: number;
    peakHeapMb: number;
    capped: boolean;
  } | null;
};

export type DoctarOverlay = {
  rank?: number;
  featured?: boolean;
  /** Doctors: claimed, and the medical council registration checked by the team. */
  registrationVerified?: boolean;
  hidden?: boolean;
  bookable?: boolean;
  phone?: string;
  whatsapp?: string;
  photoUrl?: string;
  note?: string;
};
export type DoctarKind = 'doctors' | 'facilities';

/** The API's error body → a sentence to show in the UI. */
export function errorText(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Can’t reach the Curxx API. Is the backend running?';
    return (error.error as { message?: string } | null)?.message ?? fallback;
  }
  return fallback;
}

/** Typed client for /api/v1/admin. The auth interceptor adds the bearer token. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;
  private metaCache: Promise<Meta> | null = null;

  login(email: string, password: string) {
    return firstValueFrom(
      this.http.post<{ token: string; admin: { email: string } }>(`${this.base}/auth/login`, {
        email,
        password,
      }),
    );
  }

  stats() {
    return firstValueFrom(this.http.get<Stats>(`${this.base}/stats`));
  }

  /** Dropdown data; cached for the session, refreshed after catalogue edits. */
  meta(refresh = false) {
    if (!this.metaCache || refresh)
      this.metaCache = firstValueFrom(this.http.get<Meta>(`${this.base}/meta`)).catch((e) => {
        this.metaCache = null;
        throw e;
      });
    return this.metaCache;
  }

  list(resource: string, query: Record<string, string | number | undefined>) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query))
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    return firstValueFrom(this.http.get<Page>(`${this.base}/${resource}`, { params }));
  }

  get(resource: string, key: string) {
    return firstValueFrom(
      this.http.get<{ item: Doc }>(`${this.base}/${resource}/${encodeURIComponent(key)}`),
    ).then((r) => r.item);
  }

  create(resource: string, body: Doc) {
    return firstValueFrom(this.http.post<{ item: Doc }>(`${this.base}/${resource}`, body)).then(
      (r) => r.item,
    );
  }

  update(resource: string, key: string, body: Doc) {
    return firstValueFrom(
      this.http.patch<{ item: Doc }>(`${this.base}/${resource}/${encodeURIComponent(key)}`, body),
    ).then((r) => r.item);
  }

  /** Ranking board for doctors (city + specialty), hospitals/clinics or labs (city). */
  rankings(query: {
    type: RankedType;
    city: string;
    specialty?: string;
    category?: string;
    q?: string;
  }) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) if (v) params = params.set(k, v);
    return firstValueFrom(
      this.http.get<{ items: Doc[]; total: number }>(`${this.base}/rankings`, { params }),
    );
  }

  saveRankings(type: RankedType, ranks: { slug: string; rank: number }[]) {
    return firstValueFrom(
      this.http.post<{ updated: number }>(`${this.base}/rankings`, { type, ranks }),
    );
  }

  doctarStatus() {
    return firstValueFrom(this.http.get<DoctarStatus>(`${this.base}/doctar/status`));
  }

  doctarRefresh() {
    return firstValueFrom(
      this.http.post<DoctarStatus & { started: boolean }>(`${this.base}/doctar/refresh`, {}),
    );
  }

  doctarList(kind: DoctarKind, query: Record<string, string | number | undefined>) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query))
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    return firstValueFrom(this.http.get<Page>(`${this.base}/doctar/${kind}`, { params }));
  }

  saveDoctarOverlay(kind: 'doctor' | 'facility', doctarId: string, body: DoctarOverlay) {
    return firstValueFrom(
      this.http.put<{ overlay: Doc }>(`${this.base}/doctar/overlays/${kind}/${doctarId}`, body),
    ).then((r) => r.overlay);
  }

  removeDoctarOverlay(kind: 'doctor' | 'facility', doctarId: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(`${this.base}/doctar/overlays/${kind}/${doctarId}`),
    );
  }

  userActivity(id: string) {
    return firstValueFrom(
      this.http.get<{ logins: Doc[]; appointments: Doc[]; orders: Doc[]; interactions: Doc[] }>(
        `${this.base}/users/${encodeURIComponent(id)}/activity`,
      ),
    );
  }

  remove(resource: string, key: string) {
    return firstValueFrom(
      this.http.delete<{ ok: true }>(`${this.base}/${resource}/${encodeURIComponent(key)}`),
    );
  }
}
