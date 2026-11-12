import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Posiciones de puntos en una celda de 3×3 (coordenadas 0..1). */
const P: Record<string, [number, number]> = {
  tl: [0.25, 0.25], tm: [0.5, 0.25], tr: [0.75, 0.25],
  ml: [0.25, 0.5], c: [0.5, 0.5], mr: [0.75, 0.5],
  bl: [0.25, 0.75], bm: [0.5, 0.75], br: [0.75, 0.75],
};
const PIPS: string[][] = [
  [], ['c'], ['tl', 'br'], ['tl', 'c', 'br'], ['tl', 'tr', 'bl', 'br'], ['tl', 'tr', 'c', 'bl', 'br'],
  ['tl', 'tr', 'ml', 'mr', 'bl', 'br'], ['tl', 'tr', 'ml', 'c', 'mr', 'bl', 'br'],
  ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br'], ['tl', 'tm', 'tr', 'ml', 'c', 'mr', 'bl', 'bm', 'br'],
];

/** Ficha de dominó dibujada en SVG (horizontal o vertical, boca arriba o abajo). */
@Component({
  selector: 'app-domino-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="vertical() ? '0 0 100 200' : '0 0 200 100'" [attr.width]="w()" [attr.height]="h()"
         [class]="'tile ' + (faceDown() ? 'down ' : '') + (state() ?? '')" role="img"
         [attr.aria-label]="faceDown() ? 'Ficha oculta' : 'Ficha ' + a() + '-' + b()">
      <rect x="3" y="3" [attr.width]="vertical() ? 94 : 194" [attr.height]="vertical() ? 194 : 94" rx="16" class="face" />
      @if (!faceDown()) {
        @if (vertical()) { <line x1="16" y1="100" x2="84" y2="100" class="div" /> }
        @else { <line x1="100" y1="16" x2="100" y2="84" class="div" /> }
        @for (p of pips(); track $index) { <circle [attr.cx]="p[0]" [attr.cy]="p[1]" r="8.5" class="pip" /> }
      } @else {
        <path [attr.d]="vertical() ? 'M30 70 L70 130 M70 70 L30 130' : 'M70 30 L130 70 M130 30 L70 70'" class="mark" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-block; line-height: 0; }
    .tile { display: block; transition: transform 0.15s, filter 0.15s; }
    .face { fill: #f5f7fa; stroke: #c9d3df; stroke-width: 3; }
    .div { stroke: #9aa8b8; stroke-width: 4; stroke-linecap: round; }
    .pip { fill: #101c2c; }
    .down .face { fill: #1b3a5e; stroke: #318ce7; }
    .mark { stroke: #55c7df; stroke-width: 5; stroke-linecap: round; opacity: 0.6; }
    .playable .face { stroke: #55c7df; stroke-width: 7; }
    .selected .face { fill: #dff3ff; stroke: #318ce7; stroke-width: 9; }
    .disabled { opacity: 0.45; }
    .last .face { stroke: #f2b84b; stroke-width: 8; }
    .euler .face { stroke: #29b47a; stroke-width: 8; }
  `,
})
export class DominoTileComponent {
  readonly a = input.required<number>();
  readonly b = input.required<number>();
  readonly vertical = input(false);
  readonly faceDown = input(false);
  /** Tamaño del lado corto en píxeles. */
  readonly size = input(34);
  readonly state = input<string | null>(null);

  readonly w = computed(() => (this.vertical() ? this.size() : this.size() * 2));
  readonly h = computed(() => (this.vertical() ? this.size() * 2 : this.size()));

  readonly pips = computed(() => {
    const out: [number, number][] = [];
    const put = (n: number, ox: number, oy: number) => {
      for (const k of PIPS[Math.min(Math.max(n, 0), 9)]) out.push([ox + P[k][0] * 100, oy + P[k][1] * 100]);
    };
    put(this.a(), 0, 0);
    if (this.vertical()) put(this.b(), 0, 100);
    else put(this.b(), 100, 0);
    return out;
  });
}
