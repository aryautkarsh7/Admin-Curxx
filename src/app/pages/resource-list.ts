import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { environment } from '../../environments/environment';
import { Api, Doc, Meta, Page, errorText } from '../core/api';
import { cell } from '../core/format';
import { Column, RESOURCE_BY_NAME, Resource, getPath, optionsFor } from '../core/resources';

/** Any section's table: search, filters, paging, and links into the edit form. All state lives in the URL. */
@Component({
  selector: 'app-resource-list',
  imports: [RouterLink, FormsModule],
  template: `
    @if (resource(); as r) {
      <section class="page">
        <div class="page-head">
          <div>
            <h1>{{ r.label }}</h1>
            <p class="muted">{{ r.description }}</p>
          </div>
          @if (r.canCreate) {
            <a class="btn primary" [routerLink]="['/', r.name, 'new']"
              ><span class="icon">add</span>Add {{ r.singular }}</a
            >
          }
        </div>

        @for (f of tabFilters(r); track f.key) {
          <nav class="tabs" [attr.aria-label]="f.label">
            <button
              type="button"
              class="tab"
              [class.active]="!filterValue(f.key)"
              (click)="setFilter(f.key, '')"
            >
              All
            </button>
            @for (o of options(f.options); track o.value) {
              <button
                type="button"
                class="tab"
                [class.active]="filterValue(f.key) === o.value"
                (click)="setFilter(f.key, o.value)"
              >
                {{ o.label }}
              </button>
            }
          </nav>
        }

        <form class="toolbar" (ngSubmit)="search()">
          <label class="search">
            <span class="icon">search</span>
            <input name="q" [(ngModel)]="q" [placeholder]="'Search ' + r.label.toLowerCase()" />
          </label>
          @for (f of selectFilters(r); track f.key) {
            <select
              [name]="f.key"
              [ngModel]="filterValue(f.key)"
              (ngModelChange)="setFilter(f.key, $event)"
              [attr.aria-label]="f.label"
            >
              <option value="">{{ f.label }}: all</option>
              @for (o of options(f.options); track o.value) {
                <option [value]="o.value">{{ o.label }}</option>
              }
            </select>
          }
          <button class="btn" type="submit">Search</button>
          @if (hasFilters()) {
            <button class="btn ghost" type="button" (click)="clear()">Clear</button>
          }
        </form>

        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }

        <div class="card flush">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  @for (c of r.columns; track c.key) {
                    <th>{{ c.label }}</th>
                  }
                  <th class="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (doc of page()?.items ?? []; track doc['id']) {
                  <tr class="clickable" (click)="open(doc)">
                    @for (c of r.columns; track c.key; let first = $first) {
                      <td>
                        @if (c.format === 'badge') {
                          <span class="badge" [attr.data-v]="raw(doc, c)">{{ value(doc, c) }}</span>
                        } @else if (first) {
                          <b>{{ value(doc, c) }}</b>
                          @if (doc['managed']) {
                            <span class="dot" title="Edited in the admin panel"></span>
                          }
                        } @else {
                          {{ value(doc, c) }}
                        }
                      </td>
                    }
                    <td class="right nowrap" (click)="$event.stopPropagation()">
                      @if (r.sitePath) {
                        <a
                          class="btn ghost small"
                          [href]="siteUrl + r.sitePath(doc)"
                          target="_blank"
                          rel="noopener"
                          title="View on website"
                          ><span class="icon">open_in_new</span></a
                        >
                      }
                      <a class="btn ghost small" [routerLink]="['/', r.name, keyOf(doc)]">Edit</a>
                      @if (r.canDelete) {
                        <button class="btn ghost small danger" type="button" (click)="remove(doc)">
                          Delete
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="r.columns.length + 1" class="muted empty">
                      {{ loading() ? 'Loading…' : 'Nothing matches.' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (page(); as p) {
          <div class="pager">
            <span class="muted small"
              >{{ p.total.toLocaleString('en-IN') }}
              {{ p.total === 1 ? r.singular : r.label.toLowerCase() }} · page {{ p.page }} of
              {{ p.pages }}</span
            >
            <div>
              <button
                class="btn small"
                type="button"
                [disabled]="p.page <= 1"
                (click)="goTo(p.page - 1)"
              >
                Previous
              </button>
              <button
                class="btn small"
                type="button"
                [disabled]="p.page >= p.pages"
                (click)="goTo(p.page + 1)"
              >
                Next
              </button>
            </div>
          </div>
        }
      </section>
    } @else {
      <section class="page"><p class="alert">Unknown section.</p></section>
    }
  `,
})
export class ResourceListPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  protected readonly siteUrl = environment.siteUrl;
  protected readonly resource = signal<Resource | undefined>(undefined);
  protected readonly page = signal<Page | null>(null);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private query: Record<string, string> = {};
  protected q = '';

  constructor() {
    this.api
      .meta()
      .then((m) => this.meta.set(m))
      .catch(() => {});
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        this.resource.set(RESOURCE_BY_NAME.get(params.get('resource') ?? ''));
        this.title.setTitle(`${this.resource()?.label ?? 'Not found'} · Curxx Admin`);
        this.query = Object.fromEntries(query.keys.map((k) => [k, query.get(k) ?? '']));
        this.q = this.query['q'] ?? '';
        void this.load();
      });
  }

  private async load() {
    const r = this.resource();
    if (!r) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.page.set(await this.api.list(r.name, { ...this.query, limit: 25 }));
    } catch (e) {
      this.page.set(null);
      this.error.set(errorText(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected options = (source: Parameters<typeof optionsFor>[0]) => optionsFor(source, this.meta());
  protected value = (doc: Doc, column: Column) => cell(doc, column);
  protected raw = (doc: Doc, column: Column) => String(getPath(doc, column.key) ?? '');
  protected tabFilters = (r: Resource) => (r.filters ?? []).filter((f) => f.tabs);
  protected selectFilters = (r: Resource) => (r.filters ?? []).filter((f) => !f.tabs);
  protected filterValue = (key: string) => this.query[key] ?? '';
  protected hasFilters = () => Object.keys(this.query).some((k) => k !== 'page');
  protected keyOf = (doc: Doc) => (this.resource()!.key === 'slug' ? doc['slug'] : doc['id']);

  private navigate(patch: Record<string, string | null>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...patch, page: patch['page'] ?? null },
      queryParamsHandling: 'merge',
    });
  }

  protected search() {
    this.navigate({ q: this.q.trim() || null });
  }

  protected setFilter(key: string, value: string) {
    this.navigate({ [key]: value || null });
  }

  protected clear() {
    this.q = '';
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected goTo(n: number) {
    this.navigate({ page: String(n) });
  }

  protected open(doc: Doc) {
    void this.router.navigate(['/', this.resource()!.name, this.keyOf(doc)]);
  }

  protected async remove(doc: Doc) {
    const r = this.resource()!;
    const name = doc['name'] ?? doc['title'] ?? doc['label'] ?? doc['reference'] ?? this.keyOf(doc);
    if (!confirm(`Delete ${r.singular} "${name}"? This removes it from the website.`)) return;
    try {
      await this.api.remove(r.name, this.keyOf(doc));
      await this.load();
    } catch (e) {
      this.error.set(errorText(e));
    }
  }
}
