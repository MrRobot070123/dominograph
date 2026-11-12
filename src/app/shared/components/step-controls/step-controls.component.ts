import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StepPlayer } from '../../utils/step-player';
import { IconComponent } from '../icon/icon.component';

/** Controles de reproducción paso a paso para las animaciones de algoritmos. */
@Component({
  selector: 'app-step-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="controls" role="toolbar" aria-label="Controles de animación">
      <button class="btn sm" (click)="player().reset()" aria-label="Reiniciar"><app-icon name="reset" [size]="16" /></button>
      <button class="btn sm" (click)="player().prev()" [disabled]="player().index() < 0" aria-label="Paso anterior"><app-icon name="prev" [size]="16" /></button>
      @if (player().playing()) {
        <button class="btn sm primary" (click)="player().pause()" aria-label="Pausar"><app-icon name="pause" [size]="16" /> Pausa</button>
      } @else {
        <button class="btn sm primary" (click)="player().play()" [disabled]="player().total() === 0" aria-label="Reproducir"><app-icon name="play" [size]="16" /> Reproducir</button>
      }
      <button class="btn sm" (click)="player().next()" [disabled]="player().atEnd()" aria-label="Siguiente paso"><app-icon name="next" [size]="16" /></button>
      <button class="btn sm ghost" (click)="player().end()" [disabled]="player().atEnd()">Final</button>
      <label class="speed">
        <span class="sr-only">Velocidad</span>
        <select [value]="player().speed()" (change)="player().setSpeed(+$any($event.target).value)" aria-label="Velocidad">
          <option value="1200">Lento</option>
          <option value="700">Normal</option>
          <option value="300">Rápido</option>
        </select>
      </label>
      <span class="count mono">{{ player().index() + 1 }} / {{ player().total() }}</span>
    </div>
    <div class="bar"><div [style.width.%]="player().progress()"></div></div>
  `,
  styles: `
    .controls { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .count { margin-left: auto; color: var(--muted); font-size: 0.85rem; }
    select { min-height: 32px; padding: 4px 8px; font-size: 0.82rem; }
    .bar { height: 4px; background: var(--line-soft); border-radius: 4px; margin-top: 8px; overflow: hidden; }
    .bar div { height: 100%; background: linear-gradient(90deg, var(--electric), var(--cyan)); transition: width 0.2s; }
  `,
})
export class StepControlsComponent {
  readonly player = input.required<StepPlayer>();
}
