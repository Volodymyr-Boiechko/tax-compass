import { effect, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'dark' | 'light'>('dark');

  constructor() {
    try {
      const stored = localStorage.getItem('tax-compass-theme');
      if (stored === 'light' || stored === 'dark') {
        this.theme.set(stored);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.theme.set(prefersDark ? 'dark' : 'light');
      }
    } catch {}

    effect(() => {
      const t = this.theme();
      document.documentElement.classList.toggle('light', t === 'light');
      document.documentElement.classList.toggle('dark', t === 'dark');
      try { localStorage.setItem('tax-compass-theme', t); } catch {}
    });
  }

  toggle(): void {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }
}
