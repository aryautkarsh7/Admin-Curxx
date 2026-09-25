import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, Doc, Meta, RankedType, errorText } from '../core/api';
import { optionsFor } from '../core/resources';

type Row = { slug: string; name: string; sub: string; rating?: number; reviews?: number; rank: number };

const TABS: { type: RankedType; label: string; resource: string }[] = [
  { type: 'doctors', label: 'Doctors', resource: 'doctors' },
  { type: 'facilities', label: 'Hospitals & clinics', resource: 'facilities' },
  { type: 'labs', label: 'Labs & diagnostics', resource: 'labs' },
];

/**
 * Who shows first. Doctors are ranked per city + specialty, hospitals/clinics per city (optionally per
 * type), labs per city. Ranked entries lead every default listing on the website; the rest keep the
 * normal order (rating, distance…). Filters live in the URL.
 */
@Component({
  selector: 'app-rankings',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Rankings</h1>
          <p class="muted">Choose who appears first on the website, by city and specialty. Pin entries, then put them in order with the arrows or by typing a position. Unranked entries follow in the normal order.</p>
        </div>
      </div>

      <nav class="tabs" aria-label="What to rank">
        @for (t of tabs; track t.type) {
          <button type="button" class="tab" [class.active]="type() === t.type" (click)="go({ type: t.type, specialty: null, category: null, q: null })">{{ t.label }}</button>
        }
      </nav>

      <div class="toolbar">
        <select [ngModel]="city()" (ngModelChange)="go({ city: $event })" aria-label="City" name="city">
          @for (c of cities(); track c.value) {
            <option [value]="c.value">{{ c.label }}</option>
          }
        </select>
        @if (type() === 'doctors') {
          <select [ngModel]="specialty()" (ngModelChange)="go({ specialty: $event })" aria-label="Specialty" name="specialty">
            @for (s of specialties(); track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        }
        @if (type() === 'facilities') {
          <select [ngModel]="category()" (ngModelChange)="go({ category: $event || null })" aria-label="Type" name="category">
            <option value="">All hospital & clinic types</option>
            @for (s of facilityTypes(); track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        }
        <label class="search">
          <span class="icon">search</span>
          <input name="q" [ngModel]="q()" (keyup.enter)="go({ q: $any($event.target).value.trim() || null })" placeholder="Find by name (Enter)" />
        </label>
      </div>

      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }

      <div class="card flush">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Position</th>
                <th class="right">Order</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.slug; let i = $index) {
                <tr class="rank-row" [class.ranked]="row.rank > 0">
                  <td class="rank-pos">{{ row.rank > 0 ? row.rank : '' }}</td>
                  <td>
                    <a [routerLink]="['/', resourceName(), row.slug]"><b>{{ row.name }}</b></a>
                    <br /><span class="muted small">{{ row.sub }}</span>
                  </td>
                  <td class="small nowrap">{{ row.rating ? row.rating.toFixed(1) + ' ★' : '—' }}@if (row.reviews) {<span class="muted"> · {{ row.reviews }}</span>}</td>
                  <td>
                    <input class="rank-input" type="number" min="0" [value]="row.rank || ''" placeholder="—" (change)="moveTo(row, +$any($event.target).value)" [attr.aria-label]="'Position of ' + row.name" />
                  </td>
                  <td class="right nowrap">
                    @if (row.rank > 0) {
                      <button class="btn ghost small" type="button" [disabled]="row.rank === 1" (click)="moveTo(row, row.rank - 1)" aria-label="Move up"><span class="icon">arrow_upward</span></button>
                      <button class="btn ghost small" type="button" [disabled]="row.rank === pinnedCount()" (click)="moveTo(row, row.rank + 1)" aria-label="Move down"><span class="icon">arrow_downward</span></button>
                      <button class="btn ghost small" type="button" (click)="moveTo(row, 0)">Unpin</button>
                    } @else {
                      <button class="btn small" type="button" (click)="moveTo(row, pinnedCount() + 1)"><span class="icon">keep</span>Pin</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted empty">{{ loading() ? 'Loading…' : 'Nothing here for this city.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="sticky-bar">
        <span class="muted small">
          {{ pinnedCount() }} pinned · {{ total() }} in this list@if (total() > rows().length) {<span> (first {{ rows().length }} shown — search to find others)</span>}
          @if (saved()) {<span class="ok-text"> · {{ saved() }}</span>}
        </span>
        <div class="actions">
          <button class="btn ghost" type="button" [disabled]="!dirty()" (click)="reload()">Discard</button>
          <button class="btn primary" type="button" [disabled]="!dirty() || saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save order' }}</button>
        </div>
      </div>
    </section>
  `,
})
export class RankingsPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly tabs = TABS;
  protected readonly meta = signal<Meta | null>(null);
  protected readonly type = signal<RankedType>('doctors');
  protected readonly city = signal('');
  protected readonly specialty = signal('');
  protected readonly category = signal('');
  protected readonly q = signal('');
  protected readonly rows = signal<Row[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal('');
  /** Ranks as loaded, to send only what changed. */
  private original = new Map<string, number>();

  protected readonly cities = computed(() => optionsFor({ meta: 'cities' }, this.meta()));
  protected readonly specialties = computed(() => optionsFor({ meta: 'specialties' }, this.meta()));
  protected readonly facilityTypes = computed(() => optionsFor({ meta: 'facilityTypes' }, this.meta()));
  protected readonly pinnedCount = computed(() => this.rows().filter((r) => r.rank > 0).length);
  protected readonly dirty = computed(() => this.rows().some((r) => (this.original.get(r.slug) ?? 0) !== r.rank));
  protected readonly resourceName = computed(() => TABS.find((t) => t.type === this.type())!.resource);

  constructor() {
    this.api
      .meta()
      .then((m) => {
        this.meta.set(m);
        this.sync();
      })
      .catch((e) => this.error.set(errorText(e)));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(() => this.sync());
  }

  /** URL → state (with defaults once the city/specialty lists are known) → load. */
  private sync() {
    const m = this.meta();
    if (!m) return;
    const p = this.route.snapshot.queryParamMap;
    const type = (TABS.some((t) => t.type === p.get('type')) ? p.get('type') : 'doctors') as RankedType;
    this.type.set(type);
    this.city.set(p.get('city') ?? (m.cities.find((c) => c.slug === 'bangalore') ?? m.cities[0])?.slug ?? '');
    this.specialty.set(p.get('specialty') ?? m.specialties[0]?.slug ?? '');
    this.category.set(p.get('category') ?? '');
    this.q.set(p.get('q') ?? '');
    void this.reload();
  }

  protected go(patch: Record<string, string | null>) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: patch, queryParamsHandling: 'merge' });
  }

  protected async reload() {
    if (!this.city()) return;
    this.loading.set(true);
    this.error.set('');
    this.saved.set('');
    try {
      const type = this.type();
      const res = await this.api.rankings({
        type,
        city: this.city(),
        specialty: type === 'doctors' ? this.specialty() : undefined,
        category: type === 'facilities' ? this.category() || undefined : undefined,
        q: this.q() || undefined,
      });
      const rows = res.items.map((d: Doc) => this.toRow(d));
      this.original = new Map(rows.map((r) => [r.slug, r.rank]));
      this.rows.set(this.normalise(rows));
      this.total.set(res.total);
    } catch (e) {
      this.rows.set([]);
      this.error.set(errorText(e));
    } finally {
      this.loading.set(false);
    }
  }

  private toRow(d: Doc): Row {
    const sub =
      this.type() === 'doctors' ? [d['clinicName'], d['area']].filter(Boolean).join(' · ') : [d['category'] ?? d['type'], d['area']].filter(Boolean).join(' · ');
    return { slug: d['slug'], name: d['name'], sub, rating: d['rating'], reviews: d['reviewCount'], rank: Number(d['rank']) || 0 };
  }

  /** Pinned rows first, numbered 1…n with no gaps; the rest keep their loaded order. */
  private normalise(rows: Row[]): Row[] {
    const pinned = rows.filter((r) => r.rank > 0).sort((a, b) => a.rank - b.rank);
    const rest = rows.filter((r) => r.rank <= 0);
    return [...pinned.map((r, i) => ({ ...r, rank: i + 1 })), ...rest.map((r) => ({ ...r, rank: 0 }))];
  }

  /** Put a row at a 1-based position among the pinned ones; 0 unpins it. */
  protected moveTo(row: Row, position: number) {
    this.saved.set('');
    const others = this.rows().filter((r) => r.slug !== row.slug);
    const pinned = others.filter((r) => r.rank > 0);
    const rest = others.filter((r) => r.rank <= 0);
    if (!Number.isFinite(position) || position <= 0) {
      this.rows.set(this.normalise([...pinned, { ...row, rank: 0 }, ...rest]));
      return;
    }
    const at = Math.min(Math.floor(position), pinned.length + 1) - 1;
    pinned.splice(at, 0, { ...row, rank: 1 });
    this.rows.set([...pinned.map((r, i) => ({ ...r, rank: i + 1 })), ...rest]);
  }

  protected async save() {
    const ranks = this.rows()
      .filter((r) => (this.original.get(r.slug) ?? 0) !== r.rank)
      .map((r) => ({ slug: r.slug, rank: r.rank }));
    if (!ranks.length) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.api.saveRankings(this.type(), ranks);
      this.original = new Map(this.rows().map((r) => [r.slug, r.rank]));
      this.rows.set([...this.rows()]);
      this.saved.set('Saved — the website uses the new order within a few minutes.');
    } catch (e) {
      this.error.set(errorText(e));
    } finally {
      this.saving.set(false);
    }
  }
}
