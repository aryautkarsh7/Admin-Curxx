import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { Api, Doc, Meta, errorText } from '../core/api';
import {
  Field,
  OptionSource,
  RESOURCE_BY_NAME,
  Resource,
  getPath,
  optionsFor,
  setPath,
} from '../core/resources';

type Session = { start: string; end: string };
type DayHours = { day: number; sessions: Session[] };
type Schedule = {
  days: number[];
  sessions: Session[];
  perDay?: DayHours[];
  step: number;
  video: 'none' | 'mixed' | 'all';
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Monday first, the way clinics write their timings. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const MODE_LABELS: Record<string, string> = {
  clinic: 'Clinic',
  video: 'Video',
  audio: 'Phone',
};
const EMPTY_SCHEDULE: Schedule = {
  days: [1, 2, 3, 4, 5, 6],
  sessions: [
    { start: '10:00', end: '13:30' },
    { start: '17:00', end: '20:30' },
  ],
  step: 30,
  video: 'mixed',
};

/** Create or edit any record. Which fields show, and how, comes from the resource config. */
@Component({
  selector: 'app-resource-form',
  imports: [FormsModule, RouterLink],
  template: `
    @if (resource(); as r) {
      <section class="page">
        <div class="page-head">
          <div>
            <a class="muted small" [routerLink]="['/', r.name]">← {{ r.label }}</a>
            <h1>{{ isNew() ? 'Add ' + r.singular : title() }}</h1>
            @if (!isNew() && doc()['managed']) {
              <p class="muted small">
                Edited in the admin panel — the catalogue sync on deploy will leave this record as
                you set it.
              </p>
            }
          </div>
          <div class="actions">
            @if (!isNew() && r.sitePath) {
              <a class="btn" [href]="siteUrl + r.sitePath(doc())" target="_blank" rel="noopener"
                ><span class="icon">open_in_new</span>View on website</a
              >
            }
            @if (!isNew() && r.canDelete) {
              <button class="btn danger" type="button" (click)="remove()">Delete</button>
            }
          </div>
        </div>

        @if (loading()) {
          <p class="muted">Loading…</p>
        } @else {
          <form (ngSubmit)="save()" novalidate>
            @for (section of r.sections; track section.title) {
              <fieldset class="card">
                <legend>{{ section.title }}</legend>
                <div class="form-grid">
                  @for (f of visible(section.fields); track f.key) {
                    <div
                      class="field"
                      [class.wide]="f.wide || f.type === 'schedule' || f.type === 'multiselect'"
                    >
                      <label [attr.for]="f.key"
                        >{{ f.label }}
                        @if (f.required) {
                          <span class="req"> *</span>
                        }
                      </label>
                      @switch (f.type) {
                        @case ('textarea') {
                          <textarea
                            [id]="f.key"
                            rows="4"
                            [readonly]="f.readonly"
                            [ngModel]="read(f)"
                            (ngModelChange)="write(f, $event)"
                            [name]="f.key"
                          ></textarea>
                        }
                        @case ('number') {
                          <input
                            [id]="f.key"
                            type="number"
                            step="any"
                            [readonly]="f.readonly"
                            [ngModel]="read(f)"
                            (ngModelChange)="write(f, $event)"
                            [name]="f.key"
                          />
                        }
                        @case ('boolean') {
                          <label class="switch"
                            ><input
                              [id]="f.key"
                              type="checkbox"
                              [attr.disabled]="f.readonly ? '' : null"
                              [ngModel]="!!read(f)"
                              (ngModelChange)="write(f, $event)"
                              [name]="f.key"
                            /><span>{{ read(f) ? 'Yes' : 'No' }}</span></label
                          >
                        }
                        @case ('select') {
                          <select
                            [id]="f.key"
                            [attr.disabled]="f.readonly ? '' : null"
                            [ngModel]="selectValue(f)"
                            (ngModelChange)="write(f, $event)"
                            [name]="f.key"
                          >
                            <option value="">—</option>
                            @for (o of options(f.options); track o.value) {
                              <option [value]="o.value">{{ o.label }}</option>
                            }
                          </select>
                        }
                        @case ('multiselect') {
                          <div class="chips">
                            @for (o of options(f.options); track o.value) {
                              <label class="chip" [class.on]="has(f, o.value)"
                                ><input
                                  type="checkbox"
                                  [checked]="has(f, o.value)"
                                  (change)="toggle(f, o.value)"
                                />{{ o.label }}</label
                              >
                            }
                          </div>
                        }
                        @case ('lookup') {
                          <input
                            [id]="f.key"
                            [attr.list]="f.key + '-list'"
                            [ngModel]="read(f) ?? ''"
                            (ngModelChange)="write(f, $event)"
                            [name]="f.key"
                            autocomplete="off"
                          />
                          <datalist [id]="f.key + '-list'">
                            @for (o of options(f.options); track o.value) {
                              <option [value]="o.value">{{ o.label }}</option>
                            }
                          </datalist>
                        }
                        @case ('date') {
                          <input
                            [id]="f.key"
                            type="date"
                            [ngModel]="dateValue(f)"
                            (ngModelChange)="write(f, $event)"
                            [name]="f.key"
                          />
                        }
                        @case ('schedule') {
                          <div class="schedule">
                            <div class="row">
                              <label class="switch small"
                                ><input
                                  type="checkbox"
                                  [checked]="perDay()"
                                  (change)="setPerDay($any($event.target).checked)"
                                  name="perDayMode"
                                />Different hours on different days</label
                              >
                            </div>
                            @if (perDay()) {
                              @for (d of week; track d) {
                                <div class="day-row" [class.off]="!dayHours(d).length">
                                  <label class="chip" [class.on]="dayHours(d).length > 0"
                                    ><input
                                      type="checkbox"
                                      [checked]="dayHours(d).length > 0"
                                      (change)="toggleDayHours(d)"
                                    />{{ fullDays[d] }}</label
                                  >
                                  <div class="day-sessions">
                                    @for (s of dayHours(d); track $index) {
                                      <div class="row">
                                        <input
                                          type="time"
                                          [value]="s.start"
                                          (change)="
                                            setDaySession(
                                              d,
                                              $index,
                                              'start',
                                              $any($event.target).value
                                            )
                                          "
                                          [attr.aria-label]="
                                            fullDays[d] + ' session ' + ($index + 1) + ' starts'
                                          "
                                        />
                                        <span>to</span>
                                        <input
                                          type="time"
                                          [value]="s.end === '24:00' ? '23:59' : s.end"
                                          (change)="
                                            setDaySession(
                                              d,
                                              $index,
                                              'end',
                                              $any($event.target).value
                                            )
                                          "
                                          [attr.aria-label]="
                                            fullDays[d] + ' session ' + ($index + 1) + ' ends'
                                          "
                                        />
                                        <button
                                          class="btn ghost small danger"
                                          type="button"
                                          (click)="removeDaySession(d, $index)"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    } @empty {
                                      <span class="muted small">Closed</span>
                                    }
                                    @if (dayHours(d).length) {
                                      <div class="row">
                                        <button
                                          class="btn ghost small"
                                          type="button"
                                          (click)="addDaySession(d)"
                                        >
                                          + Session
                                        </button>
                                        <button
                                          class="btn ghost small"
                                          type="button"
                                          (click)="copyToAll(d)"
                                          title="Use these hours on every open day"
                                        >
                                          Copy to all open days
                                        </button>
                                      </div>
                                    }
                                  </div>
                                </div>
                              }
                            } @else {
                              <div class="chips">
                                @for (d of days; track $index) {
                                  <label class="chip" [class.on]="schedule().days.includes($index)"
                                    ><input
                                      type="checkbox"
                                      [checked]="schedule().days.includes($index)"
                                      (change)="toggleDay($index)"
                                    />{{ d }}</label
                                  >
                                }
                              </div>
                              @for (s of schedule().sessions; track $index) {
                                <div class="row">
                                  <span class="muted small">Session {{ $index + 1 }}</span>
                                  <input
                                    type="time"
                                    [value]="s.start"
                                    (change)="
                                      setSession($index, 'start', $any($event.target).value)
                                    "
                                    aria-label="Starts"
                                  />
                                  <span>to</span>
                                  <input
                                    type="time"
                                    [value]="s.end === '24:00' ? '23:59' : s.end"
                                    (change)="setSession($index, 'end', $any($event.target).value)"
                                    aria-label="Ends"
                                  />
                                  <button
                                    class="btn ghost small danger"
                                    type="button"
                                    (click)="removeSession($index)"
                                  >
                                    Remove
                                  </button>
                                </div>
                              }
                            }
                            <div class="row">
                              @if (!perDay()) {
                                <button class="btn small" type="button" (click)="addSession()">
                                  + Add session
                                </button>
                              }
                              <label class="small"
                                >Slot length
                                <select
                                  [ngModel]="schedule().step"
                                  (ngModelChange)="patchSchedule({ step: +$event })"
                                  name="step"
                                >
                                  @for (n of [10, 15, 20, 30, 45, 60]; track n) {
                                    <option [ngValue]="n">{{ n }} min</option>
                                  }
                                </select>
                              </label>
                              <label class="small"
                                >Video
                                <select
                                  [ngModel]="schedule().video"
                                  (ngModelChange)="patchSchedule({ video: $event })"
                                  name="video"
                                >
                                  <option value="mixed">Clinic + some video</option>
                                  <option value="all">Video only</option>
                                  <option value="none">Clinic only</option>
                                </select>
                              </label>
                            </div>
                          </div>
                        }
                        @case ('json') {
                          <textarea
                            [id]="f.key"
                            rows="6"
                            class="mono"
                            [readonly]="f.readonly"
                            [ngModel]="texts[f.key]"
                            (ngModelChange)="texts[f.key] = $event"
                            [name]="f.key"
                          ></textarea>
                        }
                        @case ('list') {
                          <textarea
                            [id]="f.key"
                            rows="4"
                            placeholder="One per line"
                            [ngModel]="texts[f.key]"
                            (ngModelChange)="texts[f.key] = $event"
                            [name]="f.key"
                          ></textarea>
                        }
                        @case ('tags') {
                          <input
                            [id]="f.key"
                            [placeholder]="f.placeholder ?? 'Comma-separated'"
                            [ngModel]="texts[f.key]"
                            (ngModelChange)="texts[f.key] = $event"
                            [name]="f.key"
                          />
                        }
                        @default {
                          @if (f.readonly && isDate(read(f))) {
                            <input
                              [id]="f.key"
                              type="text"
                              readonly
                              [value]="when(read(f))"
                              [name]="f.key"
                            />
                          } @else {
                            <input
                              [id]="f.key"
                              [type]="f.type === 'url' ? 'url' : 'text'"
                              [placeholder]="f.placeholder ?? ''"
                              [readonly]="f.readonly"
                              [ngModel]="read(f) ?? ''"
                              (ngModelChange)="write(f, $event)"
                              [name]="f.key"
                            />
                          }
                        }
                      }
                      @if (f.hint) {
                        <small class="muted">{{ f.hint }}</small>
                      }
                    </div>
                  }
                </div>
              </fieldset>
            }

            @if (error()) {
              <p class="alert" role="alert">{{ error() }}</p>
            }
            @if (saved()) {
              <p class="ok" role="status">{{ saved() }}</p>
            }
            <div class="form-actions">
              <a class="btn ghost" [routerLink]="['/', r.name]">Cancel</a>
              @if (canSave()) {
                <button class="btn primary" type="submit" [disabled]="saving()">
                  {{ saving() ? 'Saving…' : isNew() ? 'Create ' + r.singular : 'Save changes' }}
                </button>
              }
            </div>
          </form>

          @if (activity(); as a) {
            <h2 class="section-title">Activity</h2>
            <div class="grid-3">
              <div class="card">
                <div class="card-head">
                  <h2>Sign-ins</h2>
                  <span class="muted small">{{ a.logins.length }}</span>
                </div>
                <table class="table compact">
                  <tbody>
                    @for (l of a.logins; track l['id']) {
                      <tr>
                        <td class="small">{{ when(l['createdAt']) }}</td>
                        <td class="small muted">{{ l['device'] }}</td>
                        <td>
                          @if (l['firstLogin']) {
                            <span class="badge" data-v="new">first</span>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td class="muted">No sign-ins recorded yet.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="card">
                <div class="card-head">
                  <h2>Appointments</h2>
                  <span class="muted small">{{ a.appointments.length }}</span>
                </div>
                <table class="table compact">
                  <tbody>
                    @for (x of a.appointments; track x['id']) {
                      <tr [routerLink]="['/appointments', x['id']]">
                        <td>
                          <b>{{ x['doctorSlug'] }}</b
                          ><br /><span class="muted small">{{ when(x['startsAt']) }}</span>
                        </td>
                        <td>
                          <span class="badge" [attr.data-v]="x['mode']">{{
                            modeLabel(x['mode'])
                          }}</span>
                        </td>
                        <td>
                          <span class="badge" [attr.data-v]="x['status']">{{ x['status'] }}</span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td class="muted">No appointments.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="card">
                <div class="card-head">
                  <h2>Orders</h2>
                  <span class="muted small">{{ a.orders.length }}</span>
                </div>
                <table class="table compact">
                  <tbody>
                    @for (o of a.orders; track o['id']) {
                      <tr [routerLink]="['/orders', o['id']]">
                        <td>
                          <b>{{ o['reference'] }}</b
                          ><br /><span class="muted small"
                            >{{ o['kind'] }} · {{ when(o['createdAt']) }}</span
                          >
                        </td>
                        <td>
                          <span class="badge" [attr.data-v]="o['status']">{{ o['status'] }}</span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td class="muted">No orders.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="card">
                <div class="card-head">
                  <h2>Calls & WhatsApp</h2>
                  <span class="muted small">{{ a.interactions.length }}</span>
                </div>
                <table class="table compact">
                  <tbody>
                    @for (t of a.interactions; track t['id']) {
                      <tr [routerLink]="['/interactions', t['id']]">
                        <td>
                          <b>{{ t['targetName'] }}</b
                          ><br /><span class="muted small">{{ when(t['createdAt']) }}</span>
                        </td>
                        <td>
                          <span class="badge" [attr.data-v]="t['kind']">{{
                            t['kind'] === 'whatsapp' ? 'WhatsApp' : 'Call'
                          }}</span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td class="muted">No taps yet.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      </section>
    }
  `,
})
export class ResourceFormPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pageTitle = inject(Title);
  protected readonly siteUrl = environment.siteUrl;
  protected readonly days = DAYS;
  protected readonly fullDays = FULL_DAYS;
  protected readonly week = WEEK;
  protected readonly resource = signal<Resource | undefined>(undefined);
  protected readonly doc = signal<Doc>({});
  protected readonly schedule = signal<Schedule>(EMPTY_SCHEDULE);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly isNew = signal(true);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal('');
  /** Patients only: sign-ins, bookings, orders and Call/WhatsApp taps. */
  protected readonly activity = signal<{
    logins: Doc[];
    appointments: Doc[];
    orders: Doc[];
    interactions: Doc[];
  } | null>(null);
  /** Text form of tags / list / JSON fields, converted back on save. */
  protected texts: Record<string, string> = {};
  private key = '';

  constructor() {
    this.api
      .meta()
      .then((m) => this.meta.set(m))
      .catch(() => {});
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.resource.set(RESOURCE_BY_NAME.get(params.get('resource') ?? ''));
      this.pageTitle.setTitle(
        `${params.get('key') ? 'Edit' : 'Add'} ${this.resource()?.singular ?? 'record'} · Curxx Admin`,
      );
      this.key = params.get('key') ?? '';
      this.isNew.set(!this.key);
      void this.load();
    });
  }

  private fields(): Field[] {
    return this.resource()?.sections.flatMap((s) => s.fields) ?? [];
  }

  protected visible(fields: Field[]) {
    return fields.filter((f) => !(f.createOnly && !this.isNew()) && !(f.readonly && this.isNew()));
  }

  protected canSave() {
    return this.isNew()
      ? Boolean(this.resource()?.canCreate)
      : this.fields().some((f) => !f.readonly);
  }

  protected title() {
    const d = this.doc();
    return (
      d['name'] ??
      d['title'] ??
      d['label'] ??
      d['reference'] ??
      d['phone'] ??
      this.resource()?.singular ??
      ''
    );
  }

  private async load() {
    const r = this.resource();
    if (!r) return;
    this.error.set('');
    this.saved.set('');
    if (this.isNew()) {
      // Links like /facilities/new?type=clinic preset simple fields.
      const preset = structuredClone(r.defaults ?? {});
      const query = this.route.snapshot.queryParamMap;
      for (const f of this.fields())
        if (query.has(f.key) && ['select', 'text'].includes(f.type))
          setPath(preset, f.key, query.get(f.key));
      this.hydrate(preset);
      return;
    }
    this.loading.set(true);
    this.activity.set(null);
    if (r.name === 'users')
      this.api
        .userActivity(this.key)
        .then((a) => this.activity.set(a))
        .catch(() => {});
    try {
      this.hydrate(await this.api.get(r.name, this.key));
      // Arriving straight from "Create": say so.
      if ((history.state as { created?: boolean } | null)?.created)
        this.saved.set(
          `${r.singular.charAt(0).toUpperCase()}${r.singular.slice(1)} created — it’s live on the website.`,
        );
    } catch (e) {
      this.error.set(errorText(e));
    } finally {
      this.loading.set(false);
    }
  }

  private hydrate(doc: Doc) {
    this.doc.set(doc);
    this.texts = {};
    for (const f of this.fields()) {
      const v = getPath(doc, f.key);
      if (f.type === 'tags') this.texts[f.key] = Array.isArray(v) ? v.join(', ') : '';
      if (f.type === 'list') this.texts[f.key] = Array.isArray(v) ? v.join('\n') : '';
      if (f.type === 'json') this.texts[f.key] = v === undefined ? '' : JSON.stringify(v, null, 2);
      if (f.type === 'schedule') this.schedule.set(structuredClone(v ?? EMPTY_SCHEDULE));
    }
  }

  protected when(v: unknown) {
    return v
      ? new Date(String(v)).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '—';
  }

  protected isDate(v: unknown) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
  }

  protected modeLabel(mode: string) {
    return MODE_LABELS[mode] ?? mode;
  }

  // ---- field access ----
  protected read(f: Field) {
    return getPath(this.doc(), f.key);
  }

  protected write(f: Field, value: unknown) {
    const next = structuredClone(this.doc());
    setPath(
      next,
      f.key,
      f.type === 'number' ? (value === '' || value === null ? undefined : Number(value)) : value,
    );
    this.doc.set(next);
  }

  /** Options are strings; a stored number (tier 2, 5 stars) still shows as selected. */
  protected selectValue(f: Field) {
    const v = this.read(f);
    return v === undefined || v === null ? '' : String(v);
  }

  protected options(source: OptionSource | undefined) {
    return optionsFor(source, this.meta());
  }

  protected has(f: Field, value: string) {
    return ((this.read(f) as string[] | undefined) ?? []).includes(value);
  }

  protected toggle(f: Field, value: string) {
    const current = (this.read(f) as string[] | undefined) ?? [];
    this.write(
      f,
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  protected dateValue(f: Field) {
    const v = this.read(f);
    return v ? String(v).slice(0, 10) : '';
  }

  // ---- schedule ----
  protected patchSchedule(patch: Partial<Schedule>) {
    this.schedule.set({ ...this.schedule(), ...patch });
  }

  protected toggleDay(day: number) {
    const days = this.schedule().days;
    this.patchSchedule({
      days: (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]).sort(),
    });
  }

  protected setSession(i: number, edge: 'start' | 'end', value: string) {
    const sessions = this.schedule().sessions.map((s, k) =>
      k === i ? { ...s, [edge]: value === '23:59' && edge === 'end' ? '24:00' : value } : s,
    );
    this.patchSchedule({ sessions });
  }

  protected addSession() {
    this.patchSchedule({
      sessions: [...this.schedule().sessions, { start: '18:00', end: '20:00' }],
    });
  }

  protected removeSession(i: number) {
    this.patchSchedule({ sessions: this.schedule().sessions.filter((_, k) => k !== i) });
  }

  // ---- per-day hours ----
  protected perDay() {
    return (this.schedule().perDay?.length ?? 0) > 0;
  }

  /** Turning it on starts every consulting day with the common hours; off goes back to one set of hours. */
  protected setPerDay(on: boolean) {
    const s = this.schedule();
    if (on)
      this.patchSchedule({
        perDay: s.days.map((day) => ({ day, sessions: structuredClone(s.sessions) })),
      });
    else {
      const first = WEEK.map((d) => s.perDay?.find((p) => p.day === d)).find(
        (p) => p && p.sessions.length,
      );
      this.patchSchedule({
        perDay: [],
        days: (s.perDay ?? [])
          .filter((p) => p.sessions.length)
          .map((p) => p.day)
          .sort(),
        sessions: first ? structuredClone(first.sessions) : s.sessions,
      });
    }
  }

  protected dayHours(day: number): Session[] {
    return this.schedule().perDay?.find((p) => p.day === day)?.sessions ?? [];
  }

  private setDayHours(day: number, sessions: Session[]) {
    const rest = (this.schedule().perDay ?? []).filter((p) => p.day !== day);
    this.patchSchedule({ perDay: [...rest, { day, sessions }].sort((a, b) => a.day - b.day) });
  }

  protected toggleDayHours(day: number) {
    this.setDayHours(
      day,
      this.dayHours(day).length
        ? []
        : structuredClone(
            this.schedule().sessions.length
              ? this.schedule().sessions
              : [{ start: '10:00', end: '13:00' }],
          ),
    );
  }

  protected setDaySession(day: number, i: number, edge: 'start' | 'end', value: string) {
    this.setDayHours(
      day,
      this.dayHours(day).map((s, k) =>
        k === i ? { ...s, [edge]: value === '23:59' && edge === 'end' ? '24:00' : value } : s,
      ),
    );
  }

  protected addDaySession(day: number) {
    this.setDayHours(day, [...this.dayHours(day), { start: '17:00', end: '20:00' }]);
  }

  protected removeDaySession(day: number, i: number) {
    this.setDayHours(
      day,
      this.dayHours(day).filter((_, k) => k !== i),
    );
  }

  protected copyToAll(from: number) {
    const hours = this.dayHours(from);
    this.patchSchedule({
      perDay: (this.schedule().perDay ?? []).map((p) =>
        p.sessions.length ? { ...p, sessions: structuredClone(hours) } : p,
      ),
    });
  }

  // ---- save ----
  /** Only editable fields go to the API; nested keys keep the rest of their parent object. */
  private payload(): Doc {
    const doc = this.doc();
    const out: Doc = {};
    for (const f of this.fields()) {
      if (f.readonly || (f.createOnly && !this.isNew())) continue;
      let value: unknown;
      if (f.type === 'tags')
        value = (this.texts[f.key] ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      else if (f.type === 'list')
        value = (this.texts[f.key] ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      else if (f.type === 'json') {
        const text = (this.texts[f.key] ?? '').trim();
        if (!text) continue;
        try {
          value = JSON.parse(text);
        } catch {
          throw new Error(`“${f.label}” isn’t valid JSON.`);
        }
      } else if (f.type === 'schedule') {
        const s = this.schedule();
        if (this.perDay()) {
          // Open days are the ones with hours; the common sessions mirror the first open day (older readers use them).
          const open = (s.perDay ?? [])
            .filter((p) => p.sessions.length)
            .sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day));
          if (!open.length) throw new Error('Give at least one day consulting hours.');
          const bad = open.find((p) => p.sessions.some((x) => x.start >= x.end));
          if (bad) throw new Error(`${FULL_DAYS[bad.day]}: each session must end after it starts.`);
          value = {
            ...s,
            days: open.map((p) => p.day).sort(),
            sessions: open[0]!.sessions,
            perDay: open.sort((a, b) => a.day - b.day),
          };
        } else {
          if (!s.days.length) throw new Error('Pick at least one consulting day.');
          if (!s.sessions.length) throw new Error('Add at least one consulting session.');
          if (s.sessions.some((x) => x.start >= x.end))
            throw new Error('Each session must end after it starts.');
          value = { ...s, perDay: [] };
        }
      } else value = getPath(doc, f.key);

      if (f.required && (value === undefined || value === null || value === ''))
        throw new Error(`“${f.label}” is required.`);
      if (value === undefined || (value === '' && f.type !== 'text' && f.type !== 'textarea'))
        continue;
      if (f.type === 'select' && value === '') continue;

      if (f.key.includes('.')) {
        const top = f.key.split('.')[0]!;
        if (!(top in out)) out[top] = structuredClone(doc[top] ?? {});
        setPath(out, f.key, value);
      } else out[f.key] = value;
    }
    return out;
  }

  protected async save() {
    const r = this.resource()!;
    this.error.set('');
    this.saved.set('');
    let body: Doc;
    try {
      body = this.payload();
    } catch (e) {
      this.error.set((e as Error).message);
      return;
    }
    this.saving.set(true);
    try {
      if (this.isNew()) {
        const created = await this.api.create(r.name, body);
        void this.api.meta(true).then((m) => this.meta.set(m));
        await this.router.navigate(
          ['/', r.name, r.key === 'slug' ? created['slug'] : created['id']],
          { replaceUrl: true, state: { created: true } },
        );
      } else {
        this.hydrate(await this.api.update(r.name, this.key, body));
        void this.api.meta(true).then((m) => this.meta.set(m));
        this.saved.set(
          'Saved. The website shows the change within a few minutes (pages are cached briefly).',
        );
      }
    } catch (e) {
      this.error.set(errorText(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove() {
    const r = this.resource()!;
    if (!confirm(`Delete this ${r.singular}? It will be removed from the website.`)) return;
    try {
      await this.api.remove(r.name, this.key);
      await this.router.navigate(['/', r.name]);
    } catch (e) {
      this.error.set(errorText(e));
    }
  }
}
