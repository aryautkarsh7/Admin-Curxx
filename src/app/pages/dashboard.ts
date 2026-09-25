import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, Doc, Stats, errorText } from '../core/api';
import { MODE_LABELS } from './resource-form';
import { cell } from '../core/format';
import { RESOURCES } from '../core/resources';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">Everything on the Curxx website, in one place.</p>
        </div>
      </div>
      <div class="card create-bar">
        <div>
          <h2>Create an account</h2>
          <p class="muted small">Add a new partner. It gets a public profile page on the website as soon as you save.</p>
        </div>
        <div class="actions">
          <a class="btn primary" routerLink="/doctors/new"><span class="icon">person_add</span>Doctor</a>
          <a class="btn" routerLink="/facilities/new" [queryParams]="{ type: 'hospital' }"><span class="icon">local_hospital</span>Hospital</a>
          <a class="btn" routerLink="/facilities/new" [queryParams]="{ type: 'clinic' }"><span class="icon">add_business</span>Clinic</a>
          <a class="btn" routerLink="/labs/new"><span class="icon">biotech</span>Diagnostic centre / lab</a>
        </div>
      </div>
      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }
      @if (stats(); as s) {
        <div class="tiles">
          <a class="tile accent" routerLink="/appointments"><span class="tile-n">{{ s.appointmentsToday }}</span><span>Appointments today</span></a>
          <a class="tile" routerLink="/appointments" [queryParams]="{ mode: 'clinic' }"><span class="icon">stethoscope</span><span class="tile-n">{{ s.appointmentsTodayByMode.clinic }}</span><span>Clinic visits today</span></a>
          <a class="tile" routerLink="/appointments" [queryParams]="{ mode: 'video' }"><span class="icon">videocam</span><span class="tile-n">{{ s.appointmentsTodayByMode.video }}</span><span>Video today</span></a>
          <a class="tile" routerLink="/appointments" [queryParams]="{ mode: 'audio' }"><span class="icon">call</span><span class="tile-n">{{ s.appointmentsTodayByMode.audio }}</span><span>Teleconsultation (phone) today</span></a>
          <a class="tile" routerLink="/interactions" [queryParams]="{ kind: 'call' }"><span class="icon">phone_in_talk</span><span class="tile-n">{{ s.callsToday }}</span><span>Call taps today</span></a>
          <a class="tile" routerLink="/interactions" [queryParams]="{ kind: 'whatsapp' }"><span class="icon">chat</span><span class="tile-n">{{ s.whatsappToday }}</span><span>WhatsApp taps today</span></a>
          <a class="tile" routerLink="/login-events"><span class="icon">login</span><span class="tile-n">{{ s.loginsToday }}</span><span>Sign-ins today</span></a>
          <a class="tile" routerLink="/users"><span class="icon">group</span><span class="tile-n">{{ s.activeUsers7d }}</span><span>Active patients (7 days)</span></a>
          <a class="tile" [class.accent]="s.newReports > 0" routerLink="/reports" [queryParams]="{ status: 'new' }"><span class="icon">report</span><span class="tile-n">{{ s.newReports }}</span><span>New wrong-info reports</span></a>
          <a class="tile accent" routerLink="/leads" [queryParams]="{ status: 'new' }"><span class="tile-n">{{ s.newLeads }}</span><span>New leads</span></a>
          <a class="tile" routerLink="/doctors" [queryParams]="{ managed: 'true' }"><span class="tile-n">{{ s.adminDoctors }}</span><span>Doctors added/edited here</span></a>
          @for (r of resources; track r.name) {
            <a class="tile" [routerLink]="['/', r.name]"><span class="icon">{{ r.icon }}</span><span class="tile-n">{{ (s.counts[r.name] ?? 0).toLocaleString('en-IN') }}</span><span>{{ r.label }}</span></a>
          }
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-head"><h2>Latest appointments</h2><a routerLink="/appointments">All</a></div>
            <nav class="tabs compact-tabs" aria-label="Appointment mode">
              @for (m of modes; track m.value) {
                <button type="button" class="tab" [class.active]="mode() === m.value" (click)="mode.set(m.value)">{{ m.label }}</button>
              }
            </nav>
            <table class="table compact">
              <tbody>
                @for (a of appointments(); track a['id']) {
                  <tr [routerLink]="['/appointments', a['id']]">
                    <td><b>{{ a['patient']?.name }}</b><br /><span class="muted small">{{ a['doctorSlug'] }}</span></td>
                    <td class="small">{{ when(a['startsAt']) }}<br /><span class="badge" [attr.data-v]="a['mode']">{{ modeLabel(a['mode']) }}</span></td>
                    <td><span class="badge" [attr.data-v]="a['status']">{{ a['status'] }}</span></td>
                  </tr>
                } @empty {
                  <tr><td class="muted">{{ mode() ? 'No recent ' + modeLabel(mode()).toLowerCase() + ' appointments.' : 'No appointments yet.' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="card">
            <div class="card-head"><h2>Latest leads</h2><a routerLink="/leads">All</a></div>
            <table class="table compact">
              <tbody>
                @for (l of s.recentLeads; track l['id']) {
                  <tr [routerLink]="['/leads', l['id']]">
                    <td><b>{{ l['name'] || l['phone'] || l['email'] }}</b><br /><span class="muted small">{{ l['surgery'] || l['city'] }}</span></td>
                    <td><span class="badge">{{ l['kind'] }}</span></td>
                    <td><span class="badge" [attr.data-v]="l['status']">{{ l['status'] }}</span></td>
                  </tr>
                } @empty {
                  <tr><td class="muted">No leads yet.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="card">
            <div class="card-head"><h2>Latest orders</h2><a routerLink="/orders">All</a></div>
            <table class="table compact">
              <tbody>
                @for (o of s.recentOrders; track o['id']) {
                  <tr [routerLink]="['/orders', o['id']]">
                    <td><b>{{ o['reference'] }}</b><br /><span class="muted small">{{ o['kind'] }}</span></td>
                    <td class="small">{{ money(o) }}</td>
                    <td><span class="badge" [attr.data-v]="o['status']">{{ o['status'] }}</span></td>
                  </tr>
                } @empty {
                  <tr><td class="muted">No orders yet.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else if (!error()) {
        <p class="muted">Loading…</p>
      }
    </section>
  `,
})
export class DashboardPage implements OnInit {
  private readonly api = inject(Api);
  protected readonly resources = RESOURCES;
  protected readonly stats = signal<Stats | null>(null);
  protected readonly error = signal('');
  protected readonly modes = [
    { value: '', label: 'All' },
    { value: 'clinic', label: 'Clinic' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Phone' },
  ];
  protected readonly mode = signal('');
  /** Latest appointments of the chosen mode (loaded per mode, so a quiet mode still shows its own latest). */
  protected readonly byMode = signal<Record<string, Doc[]>>({});
  protected readonly appointments = computed(() => (this.mode() ? this.byMode()[this.mode()] ?? [] : this.stats()?.recentAppointments ?? []));

  constructor() {
    for (const m of ['clinic', 'video', 'audio'])
      this.api
        .list('appointments', { mode: m, limit: 8, sort: '-createdAt' })
        .then((p) => this.byMode.update((all) => ({ ...all, [m]: p.items })))
        .catch(() => {});
  }

  async ngOnInit() {
    try {
      this.stats.set(await this.api.stats());
    } catch (e) {
      this.error.set(errorText(e));
    }
  }

  protected when(v: string) {
    return cell({ v }, { key: 'v', label: '', format: 'datetime' });
  }

  protected modeLabel(mode: string) {
    return MODE_LABELS[mode] ?? mode ?? '';
  }

  protected money(o: Record<string, unknown>) {
    return cell(o, { key: 'total', label: '', format: 'money' });
  }
}
