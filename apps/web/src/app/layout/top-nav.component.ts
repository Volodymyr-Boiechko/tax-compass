import { Component, inject } from '@angular/core';
import { LucideGlobe, LucideSearch, LucideX, LucideSun, LucideMoon } from '@lucide/angular';
import { AppStore } from '../state/app.store';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [LucideGlobe, LucideSearch, LucideX, LucideSun, LucideMoon],
  template: `
    <nav class="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-4 gap-3 sticky top-0 z-50 transition-colors duration-150">

      <!-- Logo -->
      <a class="flex items-center gap-2 shrink-0 mr-2 text-[var(--color-text-primary)] no-underline" href="/">
        <svg lucideGlobe class="size-5 text-[var(--color-accent)]" [strokeWidth]="1.5"></svg>
        <span class="font-semibold text-sm tracking-tight">TaxCompass</span>
      </a>

      <!-- Search -->
      <div class="flex-1 max-w-md relative">
        <svg lucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-tertiary)] pointer-events-none"></svg>
        <input
          type="text"
          placeholder="Search 147 countries…"
          class="w-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md pl-9 pr-9 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          [value]="store.searchQuery()"
          (input)="onSearch($event)"
        />
        @if (store.searchQuery()) {
          <button
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            (click)="store.setSearch('')"
          >
            <svg lucideX class="size-4"></svg>
          </button>
        }
      </div>

      <div class="flex-1"></div>

      <!-- Income input -->
      <div class="relative hidden sm:block">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] text-sm pointer-events-none">€</span>
        <input
          type="number"
          placeholder="Annual income"
          min="0"
          step="1000"
          class="w-36 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md pl-7 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          [value]="store.userIncome() ?? ''"
          (input)="onIncomeInput($event)"
        />
      </div>

      <!-- Theme toggle -->
      <button
        class="p-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        title="Toggle theme"
        (click)="themeService.toggle()"
      >
        @if (themeService.theme() === 'dark') {
          <svg lucideSun class="size-4"></svg>
        } @else {
          <svg lucideMoon class="size-4"></svg>
        }
      </button>

      <!-- Lang toggle -->
      <div class="flex items-center gap-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md p-0.5 hidden sm:flex">
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="currentLang() === 'en' ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          (click)="setLang('en')"
        >EN</button>
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="currentLang() === 'uk' ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          (click)="setLang('uk')"
        >UK</button>
      </div>

    </nav>
  `,
})
export class TopNavComponent {
  readonly store = inject(AppStore);
  readonly themeService = inject(ThemeService);

  private incomeTimer: ReturnType<typeof setTimeout> | null = null;

  currentLang(): 'en' | 'uk' {
    return document.documentElement.lang === 'uk' ? 'uk' : 'en';
  }

  setLang(lang: string): void {
    window.location.href = lang === 'uk' ? '/uk/' : '/';
  }

  onSearch(e: Event): void {
    this.store.setSearch((e.target as HTMLInputElement).value);
  }

  onIncomeInput(e: Event): void {
    if (this.incomeTimer) clearTimeout(this.incomeTimer);
    const raw = (e.target as HTMLInputElement).value;
    this.incomeTimer = setTimeout(() => {
      const n = Number(raw);
      this.store.setIncome(!raw || isNaN(n) || n <= 0 ? null : n);
    }, 300);
  }
}
