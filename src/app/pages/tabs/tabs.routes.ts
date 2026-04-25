import { Routes } from '@angular/router';

export const tabsRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('../../features/home/home.page').then(m => m.HomePage),
  },
  {
    path: 'agenda',
    loadComponent: () => import('../../features/agenda/agenda.page').then(m => m.AgendaPage),
  },
  {
    path: 'clienti',
    loadComponent: () => import('../../features/clienti/clienti.page').then(m => m.ClientiPage),
  },
  {
    path: 'pagamenti',
    loadComponent: () => import('../../features/pagamenti/pagamenti.page').then(m => m.PagamentiPage),
  },
  {
    path: 'lavori',
    loadComponent: () => import('../../features/lavori/lavori.page').then(m => m.LavoriPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
