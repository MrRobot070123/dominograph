import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LabStateService } from '../../core/services/lab-state.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** Contenedor del laboratorio: resumen del grafo activo y navegación entre herramientas. */
@Component({
  selector: 'app-lab-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">Laboratorio de teoría de grafos</div>
          <h1>Experimenta con el multigrafo del dominó</h1>
          <p>Todas las herramientas trabajan sobre el mismo grafo activo y usan el mismo motor matemático que el juego.</p>
        </div>
        <div class="summary" aria-live="polite">
          <span class="chip neutral" title="Origen del grafo activo">{{ lab.source() }}</span>
          <span class="chip">|V| = {{ lab.graph().order }}</span>
          <span class="chip">|E| = {{ lab.graph().size }}</span>
          <span class="chip" [class.ok]="euler().kind === 'circuit' || euler().kind === 'path'" [class.bad]="euler().kind === 'none'">{{ eulerLabel() }}</span>
        </div>
      </div>
      <nav class="lab-nav" aria-label="Herramientas del laboratorio">
        @for (t of tools; track t.path) {
          <a [routerLink]="t.path" routerLinkActive="active"><app-icon [name]="t.icon" [size]="16" />{{ t.label }}</a>
        }
      </nav>
      <router-outlet />
    </div>
  `,
  styles: `
    .summary { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    .lab-nav { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 10px; margin-bottom: 16px; border-bottom: 1px solid var(--line-soft); scrollbar-width: thin; }
    .lab-nav a { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; padding: 7px 12px; border-radius: 9px; color: var(--muted); text-decoration: none; font-weight: 600; font-size: 0.87rem; border: 1px solid transparent; }
    .lab-nav a:hover { color: var(--text); background: rgba(49, 140, 231, 0.08); }
    @media (max-width: 760px) { .lab-nav { flex-wrap: nowrap; overflow-x: auto; } .summary { justify-content: flex-start; } }
    .lab-nav a.active { color: #fff; background: rgba(49, 140, 231, 0.16); border-color: rgba(49, 140, 231, 0.4); }
  `,
})
export class LabShellComponent {
  readonly lab = inject(LabStateService);
  readonly euler = this.lab.euler;
  readonly eulerLabel = computed(() => ({ circuit: 'Circuito euleriano', path: 'Camino euleriano', none: 'Sin recorrido euleriano', empty: 'Sin aristas' })[this.euler().kind]);
  readonly tools = [
    { path: 'constructor', label: 'Constructor', icon: 'graph' },
    { path: 'representaciones', label: 'Matriz y lista', icon: 'matrix' },
    { path: 'grados', label: 'Grados', icon: 'chart' },
    { path: 'conectividad', label: 'BFS / DFS', icon: 'tree' },
    { path: 'caminos', label: 'Caminos y ciclos', icon: 'route' },
    { path: 'euler', label: 'Euler', icon: 'euler' },
    { path: 'backtracking', label: 'Backtracking', icon: 'layers' },
    { path: 'comparador', label: 'Comparador', icon: 'compare' },
    { path: 'experimento', label: 'Dominó completo', icon: 'bolt' },
  ];
}
