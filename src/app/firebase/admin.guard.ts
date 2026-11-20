import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  try {
    if (await auth.hasAdminAccess()) {
      return true;
    }
  } catch (error) {
    console.error('Impossible de vérifier les droits administrateur.', error);
    return router.createUrlTree(['/admin/login'], {
      queryParams: { returnUrl: state.url, reason: 'verification' },
    });
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
