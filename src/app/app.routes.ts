import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    canActivate: [authGuard],
    loadChildren: () => import('./pages/tabs/tabs.routes').then(m => m.tabsRoutes),
  },
  {
    path: 'clienti/:id',
    loadComponent: () => import('./features/clienti/cliente-dettaglio/cliente-dettaglio.page').then(m => m.ClienteDettaglioPage),
    canActivate: [authGuard],
  },
  {
    path: 'lavori/:id',
    loadComponent: () => import('./features/lavori/lavoro-dettaglio/lavoro-dettaglio.page').then(m => m.LavoroDettaglioPage),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
