import { Component, inject } from '@angular/core';
import { LucideGlobe, LucideSearch, LucideX, LucideSun, LucideMoon, LucideMenu, LucideHelpCircle } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore } from '../state/app.store';
import { ThemeService } from '../core/services/theme.service';
import { ShortcutsService } from '../core/services/shortcuts.service';
import { LanguageService } from '../core/services/language.service';

const SHORTCUTS = [
  { keys: '/',   labelKey: 'shortcuts.search' },
  { keys: '⌘K', labelKey: 'shortcuts.search' },
  { keys: 'T',   labelKey: 'shortcuts.table' },
  { keys: 'M',   labelKey: 'shortcuts.map' },
  { keys: 'D',   labelKey: 'shortcuts.theme' },
  { keys: '?',   labelKey: 'shortcuts.shortcuts' },
  { keys: 'Esc', labelKey: 'shortcuts.close' },
];

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [LucideGlobe, LucideSearch, LucideX, LucideSun, LucideMoon, LucideMenu, LucideHelpCircle, TranslatePipe],
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
          [placeholder]="'topNav.searchPlaceholder' | translate:{ count: 147 }"
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
          [placeholder]="'topNav.incomeLabel' | translate"
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
        [attr.aria-label]="themeService.theme() === 'dark' ? ('topNav.themeToggleDark' | translate) : ('topNav.themeToggleLight' | translate)"
        [title]="themeService.theme() === 'dark' ? ('topNav.themeToggleDark' | translate) : ('topNav.themeToggleLight' | translate)"
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
        [attr.aria-label]="'topNav.shortcuts' | translate"
        [title]="'topNav.shortcuts' | translate"
        (click)="shortcuts.showHelp.set(!shortcuts.showHelp())"
      >
        <svg lucideHelpCircle class="size-4" aria-hidden="true"></svg>
      </button>

      <!-- Lang toggle (desktop) -->
      <div class="hidden sm:flex items-center gap-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md p-0.5"
           role="group" aria-label="Language selection">
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="langService.currentLang() === 'en' ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          [attr.aria-pressed]="langService.currentLang() === 'en'"
          (click)="langService.setLanguage('en')"
        >EN</button>
        <button
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          [class]="langService.currentLang() === 'uk' ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          [attr.aria-pressed]="langService.currentLang() === 'uk'"
          (click)="langService.setLanguage('uk')"
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
        [attr.aria-label]="'shortcuts.title' | translate"
      >
        <div
          class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 w-72 anim-fade-in-up"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-[var(--color-text-primary)]">{{ 'shortcuts.title' | translate }}</h2>
            <button
              class="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              [attr.aria-label]="'shortcuts.closeBtn' | translate"
              (click)="shortcuts.showHelp.set(false)"
            >
              <svg lucideX class="size-4" aria-hidden="true"></svg>
            </button>
          </div>
          <div class="space-y-2">
            @for (s of shortcutsList; track s.keys) {
              <div class="flex items-center justify-between">
                <span class="text-xs text-[var(--color-text-tertiary)]">{{ s.labelKey | translate }}</span>
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
  readonly langService = inject(LanguageService);
  readonly shortcutsList = SHORTCUTS;

  private incomeTimer: ReturnType<typeof setTimeout> | null = null;

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
