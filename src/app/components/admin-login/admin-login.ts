import { Component, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AdminAuthService } from '../../firebase/admin-auth.service';

@Component({
  imports: [RouterLink],
  selector: 'app-admin-login',
  styleUrl: './admin-login.css',
  templateUrl: './admin-login.html',
})
export class AdminLogin {
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  constructor(
    private readonly auth: AdminAuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    if (this.route.snapshot.queryParamMap.get('reason') === 'verification') {
      this.errorMessage.set('Impossible de vérifier les droits admin. Réessayez dans un instant.');
    }
  }

  protected updateEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value.trim());
  }

  protected updatePassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');

    const email = this.email();
    const password = this.password();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      this.errorMessage.set('Saisissez une adresse e-mail valide et un mot de passe d’au moins 6 caractères.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.auth.signIn(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const destination =
        returnUrl?.startsWith('/admin') && !returnUrl.startsWith('/admin/login')
          ? returnUrl
          : '/admin';
      await this.router.navigateByUrl(destination);
    } catch (error) {
      if (error instanceof Error && error.message === 'ADMIN_ACCESS_DENIED') {
        this.errorMessage.set('Ce compte n’a pas les droits administrateur.');
      } else {
        const code = this.getFirebaseErrorCode(error);
        this.errorMessage.set(
          code === 'auth/invalid-credential' ||
            code === 'auth/user-not-found' ||
            code === 'auth/wrong-password'
            ? 'Adresse e-mail ou mot de passe incorrect.'
            : code === 'auth/too-many-requests'
              ? 'Trop de tentatives. Réessayez plus tard.'
              : 'Connexion impossible. Vérifiez vos identifiants et réessayez.',
        );
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private getFirebaseErrorCode(error: unknown): string | null {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      return error.code;
    }

    return null;
  }
}
