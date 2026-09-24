import { Component, OnInit, inject, signal } from '@angular/core';
import { Api, Meta, errorText } from '../core/api';
import { money } from '../core/format';

/** Surgeries, conditions and cities live in the codebase (they drive URLs), so they are read-only here. */
@Component({
  selector: 'app-reference',
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Surgeries, conditions & cities</h1>
          <p class="muted">These drive public URLs (/city/surgery/…, /city/treatment-for-…) and are defined in the backend code
            (<code>backend/src/db/data</code>). Ask a developer to add one; everything else can be edited in the other sections.</p>
        </div>
      </div>
      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }
      @if (meta(); as m) {
        <div class="card">
          <h2>Surgeries ({{ m.surgeries.length }})</h2>
          <table class="table">
            <thead><tr><th>Surgery</th><th>Category</th><th>Specialty</th><th>Metro cost</th></tr></thead>
            <tbody>
              @for (s of m.surgeries; track s.slug) {
                <tr><td>{{ s.name }}</td><td><span class="badge">{{ s.category }}</span></td><td>{{ s.specialty }}</td><td>{{ fmt(s.cost[0]) }} – {{ fmt(s.cost[1]) }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="card">
          <h2>Conditions ({{ m.conditions.length }})</h2>
          <div class="chips">
            @for (c of m.conditions; track c.slug) {
              <span class="badge">{{ c.name }} · {{ c.specialty }}</span>
            }
          </div>
        </div>
        <div class="card">
          <h2>Cities ({{ m.cities.length }})</h2>
          <table class="table">
            <thead><tr><th>City</th><th>Localities</th></tr></thead>
            <tbody>
              @for (c of m.cities; track c.slug) {
                <tr><td><b>{{ c.name }}</b></td><td class="small">{{ c.localities.join(', ') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class ReferencePage implements OnInit {
  private readonly api = inject(Api);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly error = signal('');
  protected readonly fmt = money;

  async ngOnInit() {
    try {
      this.meta.set(await this.api.meta());
    } catch (e) {
      this.error.set(errorText(e));
    }
  }
}
