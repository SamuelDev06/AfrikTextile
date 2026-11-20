import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { Home } from './components/home/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'Afrik Textile', pathMatch: 'full' },
  { path: 'admin', component: Dashboard, title: 'Tableau de bord | Afrik Textile' },
  { path: '**', redirectTo: '' },
];
