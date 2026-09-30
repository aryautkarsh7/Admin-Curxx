import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Api, Doc, DoctarKind, DoctarOverlay, DoctarStatus, Meta, Page, errorText } from '../core/api';
import { optionsFor } from '../core/resources';

const TABS: { kind: DoctarKind; label: string }[] = [
  { kind: 'doctors', label: 'Doctors' },
  { kind: 'facilities', label: 'Hospitals & clinics' },
];

const EMPTY: Required<DoctarOverlay> = { rank: 0, featured: false, hidden: false, bookable: true, phone: '', whatsapp: '', photoUrl: '', note: '' };

/**
 * Doctors and hospitals the website reads straight from Doctar's database. Doctar's records can't be
 * edited here; what the team decides (hide, rank, feature, booking, contact numbers) is saved in Curxx
 * and applied on top, immediately. Filters live in the URL.
 */
@Component({
  selector: 'app-doctar',
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Doctar directory</h1>
          <p class="muted">Doctors and hospitals shown on the website come live from Doctar's database (read-only). Hide, rank or adjust a record here; Doctar itself is never changed.</p>
        </div>
      </div>

      @if (status(); as s) {
        <div class="tiles">
          <div class="tile" [class.accent]="s.status !== 'ready'">
            <span class="icon">cloud_sync</span>
            <span class="tile-n">{{ statusLabel(s) }}</span>
            <span class="small">{{ s.builtAt ? 'Updated ' + (s.builtAt | date: 'd MMM, h:mm a') + (s.from === 'cache' ? ' (saved copy)' : '') : 'Not loaded yet' }}</span>
          </div>
          <div class="tile"><span class="icon">stethoscope</span><span class="tile-n">{{ s.doctors | number }}</span><span>doctors on the website</span></div>
          <div class="tile"><span class="icon">local_hospital</span><span class="tile-n">{{ s.facilities | number }}</span><span>hospitals & clinics</span></div>
          <div class="tile"><span class="icon">tune</span><span class="tile-n">{{ s.overlays | number }}</span><span>records adjusted by the team</span></div>
          @if (s.report; as r) {
            <div class="tile"><span class="icon">timer</span><span class="tile-n">{{ r.seconds | number: '1.0-0' }} s</span><span>last read · peak {{ r.peakRssMb }} MB</span></div>
          }
        </div>
        @if (s.error) {
          <p class="alert">Last refresh failed: {{ s.error }}{{ s.builtAt ? ' — the website keeps showing the previous copy.' : '' }}</p>
        }
        <div class="create-bar">
          <span class="muted small">
            @if (s.report; as r) {
              Read {{ r.scanned | number }} Doctar doctors: {{ r.doctors | number }} listed.
              Not listed: @for (e of skipped(r.skippedDoctors); track e[0]; let last = $last) {{{ e[0] }} {{ e[1] | number }}{{ last ? '.' : ', ' }}}
            }
          </span>
          <div class="actions">
            <button class="btn" type="button" [disabled]="!s.enabled || s.status === 'loading' || refreshing()" (click)="refresh()"><span class="icon">sync</span>{{ refreshing() || s.status === 'loading' ? 'Refreshing…' : 'Refresh from Doctar now' }}</button>
          </div>
        </div>
      }

      <nav class="tabs" aria-label="Records">
        @for (t of tabs; track t.kind) {
          <button type="button" class="tab" [class.active]="kind() === t.kind" (click)="go({ kind: t.kind, specialty: null, page: null })">{{ t.label }}</button>
        }
      </nav>

      <div class="toolbar">
        <select [ngModel]="city()" (ngModelChange)="go({ city: $event || null, page: null })" aria-label="City" name="city">
          <option value="">All cities</option>
          @for (c of cities(); track c.value) {
            <option [value]="c.value">{{ c.label }}</option>
          }
        </select>
        <select [ngModel]="specialty()" (ngModelChange)="go({ specialty: $event || null, page: null })" aria-label="Specialty" name="specialty">
          <option value="">All specialties</option>
          @for (s of specialties(); track s.value) {
            <option [value]="s.value">{{ s.label }}</option>
          }
        </select>
        <select [ngModel]="overlay()" (ngModelChange)="go({ overlay: $event === 'any' ? null : $event, page: null })" aria-label="Show" name="overlay">
          <option value="any">All records</option>
          <option value="only">Adjusted by the team</option>
          <option value="hidden">Hidden from the website</option>
        </select>
        <label class="search">
          <span class="icon">search</span>
          <input name="q" [ngModel]="q()" (keyup.enter)="go({ q: $any($event.target).value.trim() || null, page: null })" placeholder="Name, slug or Doctar id (Enter)" />
        </label>
      </div>

      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }
      @if (message()) {
        <p class="ok">{{ message() }}</p>
      }

      <div class="card flush">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>{{ kind() === 'doctors' ? 'Specialty' : 'Type' }}</th>
                <th>Place</th>
                <th>On Curxx</th>
                <th class="right"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of page()?.items ?? []; track row['doctarId']) {
                <tr>
                  <td>
                    <b>{{ row['name'] }}</b>
                    <br /><span class="muted small mono">{{ row['doctarId'] }}</span>
                    @if (row['doctarVerified']) {<span class="badge" data-v="confirmed">Doctar verified</span>}
                  </td>
                  <td class="small">{{ kind() === 'doctors' ? row['specialty'] : row['category'] }}@if (row['qualification']) {<br /><span class="muted">{{ row['qualification'] }}</span>}</td>
                  <td class="small">{{ row['clinicName'] ? row['clinicName'] + ' · ' : '' }}{{ row['area'] }}, {{ row['city'] }}</td>
                  <td class="small">
                    @if (row['overlay']?.hidden) {
                      <span class="badge" data-v="cancelled">Hidden</span>
                    } @else if (row['liveSlug']) {
                      <a [href]="siteUrl + (kind() === 'doctors' ? '/doctor/' : '/clinic/') + row['liveSlug']" target="_blank" rel="noopener">View ↗</a>
                    }
                    @if (row['overlay']?.rank) {<span class="badge">#{{ row['overlay'].rank }}</span>}
                    @if (row['overlay']?.featured) {<span class="badge" data-v="new">Featured</span>}
                    @if (row['overlay']?.bookable === false) {<span class="badge" data-v="rejected">No online booking</span>}
                  </td>
                  <td class="right nowrap">
                    <button class="btn small" type="button" (click)="edit(row)">{{ editing()?.['doctarId'] === row['doctarId'] ? 'Close' : 'Adjust' }}</button>
                  </td>
                </tr>
                @if (editing()?.['doctarId'] === row['doctarId']) {
                  <tr>
                    <td colspan="5">
                      <form class="form-grid" (ngSubmit)="save(row)">
                        <div class="field"><label>Hidden from the website</label><label class="switch"><input type="checkbox" name="hidden" [(ngModel)]="form.hidden" /><span>{{ form.hidden ? 'Hidden' : 'Shown' }}</span></label></div>
                        <div class="field"><label>Online booking</label><label class="switch"><input type="checkbox" name="bookable" [(ngModel)]="form.bookable" /><span>{{ form.bookable ? 'Allowed when bookings are on' : 'Never (Call / Visit only)' }}</span></label></div>
                        <div class="field"><label>Featured</label><label class="switch"><input type="checkbox" name="featured" [(ngModel)]="form.featured" /><span>{{ form.featured ? 'Yes' : 'No' }}</span></label></div>
                        <div class="field"><label for="rank">Position (0 = normal order)</label><input id="rank" type="number" min="0" max="9999" name="rank" [(ngModel)]="form.rank" /><small class="muted">Or use Rankings to order a whole city.</small></div>
                        <div class="field"><label for="phone">Phone shown on Curxx</label><input id="phone" name="phone" [(ngModel)]="form.phone" placeholder="Doctar has none for listings" /></div>
                        <div class="field"><label for="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" [(ngModel)]="form.whatsapp" /></div>
                        <div class="field wide"><label for="photoUrl">Photo URL (https)</label><input id="photoUrl" name="photoUrl" [(ngModel)]="form.photoUrl" /></div>
                        <div class="field wide"><label for="note">Team note (not shown on the website)</label><textarea id="note" name="note" rows="2" [(ngModel)]="form.note"></textarea></div>
                        <div class="form-actions field wide">
                          <div class="actions">
                            <button class="btn primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
                            @if (row['overlay']) {
                              <button class="btn ghost" type="button" [disabled]="saving()" (click)="reset(row)">Back to Doctar's record</button>
                            }
                          </div>
                        </div>
                      </form>
                    </td>
                  </tr>
                }
              } @empty {
                <tr><td colspan="5" class="muted empty">{{ loading() ? 'Loading…' : status()?.enabled === false ? 'The Doctar directory is off (DOCTAR_DB_URL isn’t set on the server).' : 'No records match.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (page(); as p) {
        <div class="pager">
          <span class="muted small">{{ p.total | number }} records · page {{ p.page }} of {{ p.pages }}</span>
          <div>
            <button class="btn small" type="button" [disabled]="p.page <= 1" (click)="go({ page: p.page - 1 })">Previous</button>
            <button class="btn small" type="button" [disabled]="p.page >= p.pages" (click)="go({ page: p.page + 1 })">Next</button>
          </div>
        </div>
      }
    </section>
  `,
})
export class DoctarPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly tabs = TABS;
  protected readonly siteUrl = environment.siteUrl;
  protected readonly meta = signal<Meta | null>(null);
  protected readonly status = signal<DoctarStatus | null>(null);
  protected readonly kind = signal<DoctarKind>('doctors');
  protected readonly city = signal('');
  protected readonly specialty = signal('');
  protected readonly overlay = signal('any');
  protected readonly q = signal('');
  protected readonly page = signal<Page | null>(null);
  protected readonly editing = signal<Doc | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected form: Required<DoctarOverlay> = { ...EMPTY };

  protected readonly cities = computed(() => optionsFor({ meta: 'cities' }, this.meta()));
  protected readonly specialties = computed(() => optionsFor({ meta: 'specialties' }, this.meta()));

  constructor() {
    this.api.meta().then((m) => this.meta.set(m)).catch((e) => this.error.set(errorText(e)));
    void this.loadStatus();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(() => this.sync());
  }

  protected statusLabel(s: DoctarStatus) {
    return !s.enabled ? 'Off' : s.status === 'ready' ? 'Live' : s.status === 'loading' ? 'Loading…' : 'Unavailable';
  }

  protected skipped(counts: Record<string, number>) {
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  private async loadStatus() {
    try {
      this.status.set(await this.api.doctarStatus());
    } catch (e) {
      this.error.set(errorText(e));
    }
  }

  private sync() {
    const p = this.route.snapshot.queryParamMap;
    this.kind.set(p.get('kind') === 'facilities' ? 'facilities' : 'doctors');
    this.city.set(p.get('city') ?? '');
    this.specialty.set(p.get('specialty') ?? '');
    this.overlay.set(p.get('overlay') ?? 'any');
    this.q.set(p.get('q') ?? '');
    this.editing.set(null);
    void this.reload(Number(p.get('page')) || 1);
  }

  protected go(patch: Record<string, string | number | null>) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: patch, queryParamsHandling: 'merge' });
  }

  private async reload(page = this.page()?.page ?? 1) {
    this.loading.set(true);
    this.error.set('');
    try {
      this.page.set(
        await this.api.doctarList(this.kind(), {
          city: this.city() || undefined,
          specialty: this.specialty() || undefined,
          overlay: this.overlay() === 'any' ? undefined : this.overlay(),
          q: this.q() || undefined,
          page,
        }),
      );
    } catch (e) {
      this.page.set(null);
      this.error.set(errorText(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(row: Doc) {
    this.message.set('');
    if (this.editing()?.['doctarId'] === row['doctarId']) {
      this.editing.set(null);
      return;
    }
    this.form = { ...EMPTY, ...Object.fromEntries(Object.entries(row['overlay'] ?? {}).filter(([k]) => k in EMPTY)) };
    this.editing.set(row);
  }

  private get one() {
    return this.kind() === 'doctors' ? ('doctor' as const) : ('facility' as const);
  }

  protected async save(row: Doc) {
    this.saving.set(true);
    this.error.set('');
    try {
      await this.api.saveDoctarOverlay(this.one, row['doctarId'], { ...this.form, rank: Number(this.form.rank) || 0 });
      this.message.set(`Saved “${row['name']}” — the website shows the change straight away.`);
      this.editing.set(null);
      await Promise.all([this.reload(), this.loadStatus()]);
    } catch (e) {
      this.error.set(errorText(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async reset(row: Doc) {
    this.saving.set(true);
    this.error.set('');
    try {
      await this.api.removeDoctarOverlay(this.one, row['doctarId']);
      this.message.set(`“${row['name']}” is back to Doctar's record.`);
      this.editing.set(null);
      await Promise.all([this.reload(), this.loadStatus()]);
    } catch (e) {
      this.error.set(errorText(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async refresh() {
    this.refreshing.set(true);
    this.error.set('');
    try {
      this.status.set(await this.api.doctarRefresh());
      this.message.set('Refreshing from Doctar in the background (about a minute). The website keeps the current copy until it’s done.');
    } catch (e) {
      this.error.set(errorText(e));
    } finally {
      this.refreshing.set(false);
    }
  }
}
