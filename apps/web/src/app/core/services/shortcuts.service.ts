import { Injectable, inject, signal } from '@angular/core';
import { AppStore } from '../../state/app.store';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class ShortcutsService {
  private readonly store = inject(AppStore);
  private readonly themeService = inject(ThemeService);

  readonly showHelp = signal<boolean>(false);

  private readonly handler = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Always allow Esc from input (blur), everything else: skip when in input
    if (inInput) {
      if (e.key === 'Escape') { target.blur(); }
      return;
    }

    switch (true) {
      // ⌘K or / — focus search
      case (e.key === 'k' && (e.metaKey || e.ctrlKey)):
      case (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey):
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-shortcut="search"]')?.focus();
        break;

      // T — table view
      case (e.key === 't' && !e.metaKey && !e.ctrlKey):
        this.store.setActiveView('table');
        break;

      // M — map view
      case (e.key === 'm' && !e.metaKey && !e.ctrlKey):
        this.store.setActiveView('map');
        break;

      // D — toggle dark/light
      case (e.key === 'd' && !e.metaKey && !e.ctrlKey):
        this.themeService.toggle();
        break;

      // ? — show keyboard shortcuts help
      case (e.key === '?'):
        e.preventDefault();
        this.showHelp.update(v => !v);
        break;

      // Esc — close panels
      case (e.key === 'Escape'):
        if (this.showHelp()) {
          this.showHelp.set(false);
        } else if (this.store.showComparison()) {
          this.store.closeComparison();
        } else if (this.store.selectedCountry()) {
          this.store.selectCountry(null);
        } else if (this.store.sidebarOpen()) {
          this.store.closeSidebar();
        }
        break;
    }
  };

  init(): void {
    document.addEventListener('keydown', this.handler);
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handler);
  }
}
