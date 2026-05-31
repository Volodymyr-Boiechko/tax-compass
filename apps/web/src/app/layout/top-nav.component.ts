import { Component, inject } from '@angular/core';
import { LucideGlobe, LucideSearch, LucideX } from '@lucide/angular';
import { AppStore } from '../state/app.store';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [LucideGlobe, LucideSearch, LucideX],
  template: `
    <nav class="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 gap-3 sticky top-0 z-50">

      <!-- Logo -->
      <a class="flex items-center gap-2 shrink-0 mr-2 text-zinc-100 no-underline" href="/">
        <svg lucideGlobe class="size-5 text-lime-400" [strokeWidth]="1.5"></svg>
        <span class="font-semibold text-sm tracking-tight">TaxCompass</span>
      </a>

      <!-- Search -->
      <div class="flex-1 max-w-md relative">
        <svg lucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none"></svg>
        <input
          type="text"
          placeholder="Search 147 countries…"
          class="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-9 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-lime-400 focus:border-lime-400 transition-colors"
          [value]="store.searchQuery()"
          (input)="onSearch($event)"
        />
        @if (store.searchQuery()) {
          <button
            class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            (click)="store.setSearch('')"
          >
            <svg lucideX class="size-4"></svg>
          </button>
        }
      </div>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Income input -->
      <div class="relative hidden sm:block">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">€</span>
        <input
          type="number"
          placeholder="Annual income"
          min="0"
          step="1000"
          class="w-36 bg-zinc-900 border border-zinc-800 rounded-md pl-7 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-lime-400 focus:border-lime-400 transition-colors"
          [value]="store.userIncome() ?? ''"
          (input)="onIncomeInput($event)"
        />
      </div>

      <!-- Lang toggle -->
      <div class="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-0.5 hidden sm:flex">
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="currentLang() === 'en' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
          (click)="setLang('en')"
        >EN</button>
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="currentLang() === 'uk' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
          (click)="setLang('uk')"
        >UK</button>
      </div>

    </nav>
  `,
})
export class TopNavComponent {
  readonly store = inject(AppStore);

  private incomeTimer: ReturnType<typeof setTimeout> | null = null;

  currentLang(): 'en' | 'uk' {
    return document.documentElement.lang === 'uk' ? 'uk' : 'en';
  }

  setLang(lang: string): void {
    if (lang === 'uk') {
      window.location.href = '/uk/';
    } else {
      window.location.href = '/';
    }
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
