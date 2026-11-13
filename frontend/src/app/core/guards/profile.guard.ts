import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProfileStore } from '../services/profile.store';

/**
 * Le catalogue a besoin d'un profil pour scorer : si l'utilisateur n'en a pas,
 * on l'invite à compléter le formulaire (sans le bloquer définitivement).
 */
export const profileGuard: CanActivateFn = () => {
  const profileStore = inject(ProfileStore);
  const router = inject(Router);

  if (profileStore.profile()) return true;
  profileStore.load().subscribe({ error: () => undefined });
  return true;
};
