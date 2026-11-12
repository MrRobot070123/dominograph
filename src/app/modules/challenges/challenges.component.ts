import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressService } from '../../core/services/progress.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CHALLENGES, LEVELS } from './challenge-bank';

/** Módulo 7: catálogo de desafíos por niveles con progreso. */
@Component({
  selector: 'app-challenges',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">Desafíos educativos</div>
          <h1>Pon a prueba lo que aprendiste</h1>
          <p>Seis niveles progresivos. Cada respuesta se valida con el motor matemático y viene con su explicación.</p>
        </div>
        <div class="score card flat">
          <div><b>{{ progress.challengePoints() }}</b><span>/ {{ maxPoints }} pts</span></div>
          <div class="bar"><div [style.width.%]="(progress.challengesDone() / total) * 100"></div></div>
          <span class="small muted">{{ progress.challengesDone() }} de {{ total }} resueltos</span>
        </div>
      </div>
      <div class="levels">
        @for (l of levels(); track l.level) {
          <section class="card level">
            <div class="lhead">
              <span class="num">{{ l.level }}</span>
              <div><h2>{{ l.name }}</h2><p class="small muted">{{ l.description }}</p></div>
              <span class="chip" [class.ok]="l.done === l.items.length">{{ l.done }}/{{ l.items.length }}</span>
            </div>
            <ul>
              @for (c of l.items; track c.id) {
                <li>
                  <a [routerLink]="['/desafios', c.id]" [class.done]="c.score !== null">
                    <app-icon [name]="c.score !== null ? 'check' : 'arrow'" [size]="16" />
                    <span class="t">{{ c.title }}</span>
                    <span class="pts mono">{{ c.score !== null ? c.score + '/' : '' }}{{ c.points }} pts</span>
                  </a>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    .score { min-width: 240px; display: flex; flex-direction: column; gap: 6px; }
    .score b { font: 800 1.6rem var(--font-head); color: var(--cyan); margin-right: 4px; }
    .bar { height: 6px; border-radius: 4px; background: var(--line-soft); overflow: hidden; }
    .bar div { height: 100%; background: linear-gradient(90deg, var(--electric), var(--success)); }
    .levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
    .lhead { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
    .lhead h2 { margin: 0; } .lhead p { margin: 0; } .lhead .chip { margin-left: auto; }
    .num { display: inline-flex; width: 38px; height: 38px; flex-shrink: 0; border-radius: 11px; align-items: center; justify-content: center; font: 800 1.1rem var(--font-head); background: rgba(49, 140, 231, 0.18); color: var(--cyan); }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    a { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 9px; color: var(--text); text-decoration: none; background: var(--night-2); border: 1px solid var(--line-soft); }
    a:hover { border-color: var(--electric); }
    a.done { border-color: rgba(41, 180, 122, 0.45); } a.done app-icon { color: var(--success); }
    .t { flex: 1; font-weight: 600; font-size: 0.92rem; }
    .pts { font-size: 0.78rem; color: var(--muted); }
  `,
})
export class ChallengesComponent {
  readonly progress = inject(ProgressService);
  readonly total = CHALLENGES.length;
  readonly maxPoints = CHALLENGES.reduce((s, c) => s + c.points, 0);
  readonly levels = computed(() => {
    const data = this.progress.data();
    return LEVELS.map((l) => {
      const items = CHALLENGES.filter((c) => c.level === l.level).map((c) => ({ id: c.id, title: c.title, points: c.points, score: data.challenges[c.id]?.score ?? null }));
      return { ...l, items, done: items.filter((i) => i.score !== null).length };
    });
  });
}
