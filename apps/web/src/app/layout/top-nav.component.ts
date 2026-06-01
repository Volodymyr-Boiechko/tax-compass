import { Component, inject } from '@angular/core';
import { LucideGlobe, LucideSearch, LucideX, LucideSun, LucideMoon, LucideMenu, LucideHelpCircle } from '@lucide/angular';
import { AppStore } from '../state/app.store';
import { ThemeService } from '../core/services/theme.service';
import { ShortcutsService } from '../core/services/shortcuts.service';

const SHORTCUTS = [
  { keys: '/', label: 'Focus search' },
  { keys: '⌘K', label: 'Focus search' },
  { keys: 'T', label: 'Table view' },
  { keys: 'M', label: 'Map view' },
  { keys: 'D', label: 'Toggle theme' },
  { keys: '?', label: 'Show shortcuts' },
  { keys: 'Esc', label: 'Close panels' },
];

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [LucideGlobe, LucideSearch, LucideX, LucideSun, LucideMoon, LucideMenu, LucideHelpCircle],
  template: `
    <!-- Skip to content link (a11y) -->
    <a class="skip-link" href="#main-content">Skip to content</a>

    <nav
      class="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-3 gap-2 md:gap-3 sticky top-0 z-50 transition-colors duration-150"
      role="banner"
    >
      <!-- Hamburger (mobile only) -->
      <button
        class="p-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors md:hidden"
        aria-label="Toggle navigation menu"
        (click)="store.toggleSidebar()"
      >
        <svg lucideMenu class="size-5" aria-hidden="true"></svg>
      </button>

      <!-- Logo -->
      <a class="flex items-center gap-2 shrink-0 mr-1 md:mr-2 text-[var(--color-text-primary)] no-underline" href="/" aria-label="TaxCompass home">
        <svg lucideGlobe class="size-5 text-[var(--color-accent)]" [strokeWidth]="1.5" aria-hidden="true"></svg>
        <span class="font-semibold text-sm tracking-tight hidden sm:inline">TaxCompass</span>
      </a>

      <!-- Search (full-width center on desktop) -->
      <div class="flex-1 max-w-sm md:max-w-md relative">
        <svg lucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden="true"></svg>
        <input
          type="text"
          placeholder="Search 147 countries…"
          data-shortcut="search"
          aria-label="Search countries"
          class="w-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md pl-9 pr-8 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          [value]="store.searchQuery()"
          (input)="onSearch($event)"
        />
        @if (store.searchQuery()) {
          <button
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            aria-label="Clear search"
            (click)="store.setSearch('')"
          >
            <svg lucideX class="size-3.5" aria-hidden="true"></svg>
          </button>
        }
      </div>

      <div class="hidden md:block flex-1"></div>

      <!-- Income input (desktop only) -->
      <div class="relative hidden md:block">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] text-sm pointer-events-none">€</span>
        <input
          type="number"
          placeholder="Annual income"
          min="0"
          step="1000"
          aria-label="Your annual income in euros"
          class="w-36 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md pl-7 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          [value]="store.userIncome() ?? ''"
          (input)="onIncomeInput($event)"
        />
      </div>

      <!-- Theme toggle -->
      <button
        class="p-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        [attr.aria-label]="themeService.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        title="Toggle theme (D)"
        (click)="themeService.toggle()"
      >
        @if (themeService.theme() === 'dark') {
          <svg lucideSun class="size-4" aria-hidden="true"></svg>
        } @else {
          <svg lucideMoon class="size-4" aria-hidden="true"></svg>
        }
      </button>

      <!-- Shortcuts help -->
      <button
        class="p-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        aria-label="Keyboard shortcuts (?)"
        title="Keyboard shortcuts (?)"
        (click)="shortcuts.showHelp.set(!shortcuts.showHelp())"
      >
        <svg lucideHelpCircle class="size-4" aria-hidden="true"></svg>
      </button>

      <!-- Lang toggle (desktop) -->
      <div class="hidden sm:flex items-center gap-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md p-0.5"
           role="group" aria-label="Language selection">
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="currentLang() === 'en' ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          [attr.aria-pressed]="currentLang() === 'en'"
          (click)="setLang('en')"
        >EN</button>
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="currentLang() === 'uk' ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          [attr.aria-pressed]="currentLang() === 'uk'"
          (click)="setLang('uk')"
        >UK</button>
      </div>
    </nav>

    <!-- Shortcuts help modal -->
    @if (shortcuts.showHelp()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center anim-fade-in"
        style="background: color-mix(in srgb, var(--color-bg) 80%, transparent)"
        (click)="shortcuts.showHelp.set(false)"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div
          class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 w-72 anim-fade-in-up"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-[var(--color-text-primary)]">Keyboard shortcuts</h2>
            <button
              class="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              aria-label="Close shortcuts"
              (click)="shortcuts.showHelp.set(false)"
            >
              <svg lucideX class="size-4" aria-hidden="true"></svg>
            </button>
          </div>
          <div class="space-y-2">
            @for (s of shortcutsList; track s.keys) {
              <div class="flex items-center justify-between">
                <span class="text-xs text-[var(--color-text-tertiary)]">{{ s.label }}</span>
                <kbd class="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">{{ s.keys }}</kbd>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class TopNavComponent {
  readonly store = inject(AppStore);
  readonly themeService = inject(ThemeService);
  readonly shortcuts = inject(ShortcutsService);
  readonly shortcutsList = SHORTCUTS;

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
