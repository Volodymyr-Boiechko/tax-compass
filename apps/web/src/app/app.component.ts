import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShortcutsService } from './core/services/shortcuts.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  private readonly shortcuts = inject(ShortcutsService);

  ngOnInit(): void {
    this.shortcuts.init();
  }
}
