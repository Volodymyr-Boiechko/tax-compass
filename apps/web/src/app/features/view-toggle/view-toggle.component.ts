import { Component, inject } from '@angular/core';
import { LucideTable2, LucideMap } from '@lucide/angular';
import { AppStore } from '../../state/app.store';

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  imports: [LucideTable2, LucideMap],
  template: `
    <div class="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
        [class]="store.activeView() === 'table' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
        (click)="store.setActiveView('table')"
      >
        <svg lucideTable2 class="size-3.5"></svg>
        Table
      </button>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
        [class]="store.activeView() === 'map' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
        (click)="store.setActiveView('map')"
      >
        <svg lucideMap class="size-3.5"></svg>
        Map
      </button>
    </div>
  `,
})
export class ViewToggleComponent {
  readonly store = inject(AppStore);
}
