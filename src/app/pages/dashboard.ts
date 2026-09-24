import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, Stats, errorText } from '../core/api';
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
        <div class="actions">
          <a class="btn primary" routerLink="/doctors/new"><span class="icon">person_add</span>Add doctor</a>
          <a class="btn" routerLink="/facilities/new"><span class="icon">add_business</span>Add hospital / clinic</a>
        </div>
      </div>
      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }
      @if (stats(); as s) {
        <div class="tiles">
          <a class="tile accent" routerLink="/appointments"><span class="tile-n">{{ s.appointmentsToday }}</span><span>Appointments today</span></a>
          <a class="tile accent" routerLink="/leads" [queryParams]="{ status: 'new' }"><span class="tile-n">{{ s.newLeads }}</span><span>New leads</span></a>
          <a class="tile" routerLink="/doctors" [queryParams]="{ managed: 'true' }"><span class="tile-n">{{ s.adminDoctors }}</span><span>Doctors added/edited here</span></a>
          @for (r of resources; track r.name) {
            <a class="tile" [routerLink]="['/', r.name]"><span class="icon">{{ r.icon }}</span><span class="tile-n">{{ (s.counts[r.name] ?? 0).toLocaleString('en-IN') }}</span><span>{{ r.label }}</span></a>
          }
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-head"><h2>Latest appointments</h2><a routerLink="/appointments">All</a></div>
            <table class="table compact">
              <tbody>
                @for (a of s.recentAppointments; track a['id']) {
                  <tr [routerLink]="['/appointments', a['id']]">
                    <td><b>{{ a['patient']?.name }}</b><br /><span class="muted small">{{ a['doctorSlug'] }}</span></td>
                    <td class="small">{{ when(a['startsAt']) }}</td>
                    <td><span class="badge" [attr.data-v]="a['status']">{{ a['status'] }}</span></td>
                  </tr>
                } @empty {
                  <tr><td class="muted">No appointments yet.</td></tr>
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

  protected money(o: Record<string, unknown>) {
    return cell(o, { key: 'total', label: '', format: 'money' });
  }
}
