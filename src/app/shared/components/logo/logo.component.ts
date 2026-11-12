import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Logotipo original: una ficha de dominó cuyos puntos forman un grafo. */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size() * 0.7" viewBox="0 0 64 45" aria-hidden="true">
      <rect x="2" y="2" width="60" height="41" rx="10" fill="#0d1726" stroke="url(#lg)" stroke-width="3" />
      <line x1="32" y1="8" x2="32" y2="37" stroke="#24405f" stroke-width="2" />
      <path d="M13 13 L19 31 M19 31 L45 13 M45 13 L51 22 L45 31" stroke="#318ce7" stroke-width="2.4" fill="none" stroke-linecap="round" />
      <circle cx="13" cy="13" r="4.2" fill="#55c7df" />
      <circle cx="19" cy="31" r="4.2" fill="#55c7df" />
      <circle cx="45" cy="13" r="4.2" fill="#55c7df" />
      <circle cx="51" cy="22" r="4.2" fill="#f5f7fa" />
      <circle cx="45" cy="31" r="4.2" fill="#55c7df" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#55c7df" /><stop offset="1" stop-color="#318ce7" />
        </linearGradient>
      </defs>
    </svg>
  `,
  styles: `:host { display: inline-flex; }`,
})
export class LogoComponent {
  readonly size = input(44);
}
