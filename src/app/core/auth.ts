import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const TOKEN_KEY = 'curxx_admin_token';
const EMAIL_KEY = 'curxx_admin_email';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Admin session: a 12-hour JWT from /admin/auth/login, kept in localStorage. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly router = inject(Router);
  readonly token = signal<string | null>(read(TOKEN_KEY));
  readonly email = signal<string | null>(read(EMAIL_KEY));
  readonly signedIn = computed(() => Boolean(this.token()) && !expired(this.token()!));

  signIn(token: string, email: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EMAIL_KEY, email);
    } catch {
      // Storage blocked: the session lasts for this tab only.
    }
    this.token.set(token);
    this.email.set(email);
  }

  signOut(redirect = true) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch {
      // nothing stored
    }
    this.token.set(null);
    this.email.set(null);
    if (redirect) void this.router.navigate(['/login']);
  }
}

/** True when the JWT's exp has passed (checked client-side so the UI can bounce early). */
function expired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const token = auth.token();
  const withToken = token && !request.url.endsWith('/auth/login') ? request.clone({ setHeaders: { authorization: `Bearer ${token}` } }) : request;
  return next(withToken).pipe(
    catchError((error: unknown) => {
      // An expired or revoked session sends the admin back to sign in.
      if (error instanceof HttpErrorResponse && error.status === 401 && token) auth.signOut();
      return throwError(() => error);
    }),
  );
};

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  if (auth.signedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: state.url !== '/' ? { next: state.url } : {} });
};
