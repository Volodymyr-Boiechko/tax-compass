import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/smoke-test/smoke-test.component').then(
        m => m.SmokeTestComponent
      ),
  },
];
