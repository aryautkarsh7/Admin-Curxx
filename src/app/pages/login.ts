import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Api, errorText } from '../core/api';
import { Auth } from '../core/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="login">
      <form class="card login-card" (ngSubmit)="submit()">
        <div class="brand"><span>cur</span><b>xx</b> <small>Admin</small></div>
        <h1>Sign in</h1>
        <p class="muted">Manage doctors, hospitals, labs, medicines, content and bookings.</p>
        @if (error()) {
          <p class="alert" role="alert">{{ error() }}</p>
        }
        <label class="field">
          <span>Email</span>
          <input name="email" type="email" autocomplete="username" required [(ngModel)]="email" />
        </label>
        <label class="field">
          <span>Password</span>
          <input name="password" type="password" autocomplete="current-password" required [(ngModel)]="password" />
        </label>
        <button class="btn primary block" type="submit" [disabled]="busy() || !email || !password">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </main>
  `,
})
export class LoginPage {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');

  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const { token, admin } = await this.api.login(this.email.trim(), this.password);
      this.auth.signIn(token, admin.email);
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (e) {
      this.error.set(errorText(e));
    } finally {
      this.busy.set(false);
    }
  }
}
