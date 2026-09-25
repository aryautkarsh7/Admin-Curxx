import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type Doc = Record<string, any>;
export type RankedType = 'doctors' | 'facilities' | 'labs';
export type Page<T = Doc> = { items: T[]; total: number; page: number; limit: number; pages: number };

export type Meta = {
  cities: { slug: string; name: string; localities: string[] }[];
  specialties: { slug: string; name: string; focusAreas: { slug: string; name: string }[] }[];
  specialtyCategories: string[];
  facilityTypes: { name: string; slug: string; group: 'hospital' | 'clinic'; icon: string; description: string }[];
  facilities: { slug: string; name: string; city: string; area: string }[];
  labCategories: { slug: string; name: string }[];
  medicineCategories: { slug: string; name: string }[];
  articleCategories: string[];
  surgeries: { slug: string; name: string; category: string; specialty: string; cost: [number, number] }[];
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
    return firstValueFrom(this.http.post<{ token: string; admin: { email: string } }>(`${this.base}/auth/login`, { email, password }));
  }

  stats() {
    return firstValueFrom(this.http.get<Stats>(`${this.base}/stats`));
  }

  /** Dropdown data; cached for the session, refreshed after catalogue edits. */
  meta(refresh = false) {
    if (!this.metaCache || refresh) this.metaCache = firstValueFrom(this.http.get<Meta>(`${this.base}/meta`)).catch((e) => {
      this.metaCache = null;
      throw e;
    });
    return this.metaCache;
  }

  list(resource: string, query: Record<string, string | number | undefined>) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params = params.set(k, String(v));
    return firstValueFrom(this.http.get<Page>(`${this.base}/${resource}`, { params }));
  }

  get(resource: string, key: string) {
    return firstValueFrom(this.http.get<{ item: Doc }>(`${this.base}/${resource}/${encodeURIComponent(key)}`)).then((r) => r.item);
  }

  create(resource: string, body: Doc) {
    return firstValueFrom(this.http.post<{ item: Doc }>(`${this.base}/${resource}`, body)).then((r) => r.item);
  }

  update(resource: string, key: string, body: Doc) {
    return firstValueFrom(this.http.patch<{ item: Doc }>(`${this.base}/${resource}/${encodeURIComponent(key)}`, body)).then((r) => r.item);
  }

  /** Ranking board for doctors (city + specialty), hospitals/clinics or labs (city). */
  rankings(query: { type: RankedType; city: string; specialty?: string; category?: string; q?: string }) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) if (v) params = params.set(k, v);
    return firstValueFrom(this.http.get<{ items: Doc[]; total: number }>(`${this.base}/rankings`, { params }));
  }

  saveRankings(type: RankedType, ranks: { slug: string; rank: number }[]) {
    return firstValueFrom(this.http.post<{ updated: number }>(`${this.base}/rankings`, { type, ranks }));
  }

  userActivity(id: string) {
    return firstValueFrom(this.http.get<{ logins: Doc[]; appointments: Doc[]; orders: Doc[]; interactions: Doc[] }>(`${this.base}/users/${encodeURIComponent(id)}/activity`));
  }

  remove(resource: string, key: string) {
    return firstValueFrom(this.http.delete<{ ok: true }>(`${this.base}/${resource}/${encodeURIComponent(key)}`));
  }
}
