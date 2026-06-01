import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  readonly currentLang = signal<'en' | 'uk'>('en');

  constructor() {
    const lang = this.resolveInitialLang();
    this.translate.use(lang);
    this.currentLang.set(lang);
  }

  setLanguage(lang: 'en' | 'uk'): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    try { localStorage.setItem('tax-compass-language', lang); } catch {}
  }

  private resolveInitialLang(): 'en' | 'uk' {
    try {
      const stored = localStorage.getItem('tax-compass-language');
      if (stored === 'uk' || stored === 'en') return stored;
    } catch {}
    const nav = navigator?.language ?? '';
    return nav.startsWith('uk') ? 'uk' : 'en';
  }
}
