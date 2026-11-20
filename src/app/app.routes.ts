import { Routes } from '@angular/router';
import { AdminLogin } from './components/admin-login/admin-login';
import { Dashboard } from './components/dashboard/dashboard';
import { Home } from './components/home/home';
import { adminGuard } from './firebase/admin.guard';

export const routes: Routes = [
  { path: '', component: Home, title: 'Afrik Textile', pathMatch: 'full' },
  { path: 'admin/login', component: AdminLogin, title: 'Connexion admin | Afrik Textile' },
  {
    path: 'admin/textiles',
    component: Dashboard,
    canActivate: [adminGuard],
    data: { section: 'textiles' },
    title: 'Gestion des tissus | Afrik Textile',
  },
  {
    path: 'admin/countries',
    component: Dashboard,
    canActivate: [adminGuard],
    data: { section: 'countries' },
    title: 'Gestion des pays | Afrik Textile',
  },
  {
    path: 'admin',
    component: Dashboard,
    canActivate: [adminGuard],
    title: 'Tableau de bord | Afrik Textile',
  },
  { path: '**', redirectTo: '' },
];
