import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      { path: 'ipos', loadComponent: () => import('../ipos/ipos.page').then((m) => m.IposPage) },
      { path: 'ipos/:id', loadComponent: () => import('../ipos/ipo-detail.page').then((m) => m.IpoDetailPage) },
      { path: 'analyze', loadComponent: () => import('../screener/screener.page').then((m) => m.ScreenerPage) },
      { path: 'analyze/:symbol', loadComponent: () => import('../screener/stock-detail.page').then((m) => m.StockDetailPage) },
      { path: 'watchlist', loadComponent: () => import('../watchlist/watchlist.page').then((m) => m.WatchlistPage) },
      { path: 'settings', loadComponent: () => import('../settings/settings.page').then((m) => m.SettingsPage) },
      { path: '', redirectTo: '/tabs/ipos', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: '/tabs/ipos', pathMatch: 'full' },
  { path: '**', redirectTo: '/tabs/ipos' },
];
