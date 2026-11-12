import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ICONS: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  play: 'M7 4.5v15l12-7.5z',
  lab: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7.5 15h9',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 21h8M9.5 17h5',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  pause: 'M8 5v14M16 5v14',
  next: 'M6 5l8 7-8 7M17 5v14',
  prev: 'M18 5l-8 7 8 7M7 5v14',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5',
  save: 'M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 3v6h7V3M8 21v-7h8v7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  plus: 'M12 5v14M5 12h14',
  graph: 'M6 6m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M18 7m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M12 18m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M8.3 7.2l7.2-.2M7.2 8.3l3.6 7.4M16.8 9.2l-3.6 6.6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M7 7l10 10M17 7L7 17',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  matrix: 'M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  compare: 'M8 4v16M16 4v16M4 8h8M12 16h8',
  tree: 'M12 4v6M12 10l-6 5M12 10l6 5M6 15v4M18 15v4',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
  bot: 'M8 8h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM12 4v4M9.5 13h.01M14.5 13h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  euler: 'M5 18c3-12 11-12 14 0M5 18h14M12 6v12',
};

/** Iconografía propia y consistente (trazos de 24×24). */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="d()" /></svg>`,
  styles: `:host { display: inline-flex; flex-shrink: 0; }`,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly d = computed(() => ICONS[this.name()] ?? ICONS['info']);
}
