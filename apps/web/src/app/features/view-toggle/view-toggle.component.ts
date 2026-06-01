import { Component, inject } from '@angular/core';
import { LucideTable2, LucideMap } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore } from '../../state/app.store';

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  imports: [LucideTable2, LucideMap, TranslatePipe],
  template: `
    <div class="flex items-center gap-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md p-0.5">
      <button
        class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
        [class]="store.activeView() === 'table'
          ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
        (click)="store.setActiveView('table')"
      >
        <svg lucideTable2 class="size-3.5"></svg>
        {{ 'sidebar.table' | translate }}
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
        [class]="store.activeView() === 'map'
          ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
        (click)="store.setActiveView('map')"
      >
        <svg lucideMap class="size-3.5"></svg>
        {{ 'sidebar.map' | translate }}
      </button>
    </div>
  `,
})
export class ViewToggleComponent {
  readonly store = inject(AppStore);
}
