import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../environments/environment';
import { Auth } from '../core/auth';
import { GROUPS, RESOURCES } from '../core/resources';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout" [class.nav-open]="navOpen()">
      <aside class="sidebar">
        <a routerLink="/" class="brand" (click)="navOpen.set(false)"><span>cur</span><b>xx</b> <small>Admin</small></a>
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="navOpen.set(false)">
            <span class="icon">dashboard</span>Dashboard
          </a>
          <a routerLink="/rankings" routerLinkActive="active" (click)="navOpen.set(false)"><span class="icon">leaderboard</span>Rankings</a>
          <a routerLink="/doctar" routerLinkActive="active" (click)="navOpen.set(false)"><span class="icon">cloud_sync</span>Doctar directory</a>
          @for (group of groups; track group) {
            <p class="nav-group">{{ group }}</p>
            @for (r of resourcesIn(group); track r.name) {
              <a [routerLink]="['/', r.name]" routerLinkActive="active" (click)="navOpen.set(false)"><span class="icon">{{ r.icon }}</span>{{ r.label }}</a>
            }
          }
        </nav>
        <div class="sidebar-foot">
          <a class="muted small" [href]="siteUrl" target="_blank" rel="noopener">Open website ↗</a>
          <p class="muted small">{{ auth.email() }}</p>
          <button class="btn ghost small" type="button" (click)="auth.signOut()">Sign out</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="btn ghost icon-btn" type="button" aria-label="Menu" (click)="navOpen.set(!navOpen())"><span class="icon">menu</span></button>
          <span class="muted small">Curxx admin · changes go live on the website immediately</span>
        </header>
        <router-outlet />
      </div>
    </div>
  `,
})
export class Shell {
  protected readonly auth = inject(Auth);
  protected readonly groups = GROUPS;
  protected readonly navOpen = signal(false);
  protected readonly siteUrl = environment.siteUrl;
  protected resourcesIn(group: string) {
    return RESOURCES.filter((r) => r.group === group);
  }
}
