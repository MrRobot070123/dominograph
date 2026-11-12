import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { generateTileSet } from '../../core/algorithms/tiles';
import { MultiGraph } from '../../core/graph-engine/multigraph';
import { ProgressService } from '../../core/services/progress.service';
import { GraphViewComponent } from '../../shared/components/graph-view/graph-view.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { circleLayout } from '../../shared/utils/layout';
import { CHALLENGES, LEVELS } from '../challenges/challenge-bank';

/** Módulo 1: panel principal de navegación, progreso y actividad. */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LogoComponent, GraphViewComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  readonly progress = inject(ProgressService);
  readonly full = MultiGraph.fromTiles(generateTileSet(6));
  readonly positions = circleLayout(this.full.vertices);
  readonly data = this.progress.data;

  readonly winRate = computed(() => {
    const g = this.data().games;
    return g.played ? Math.round((g.won / g.played) * 100) : 0;
  });
  readonly levels = computed(() => {
    const done = this.data().challenges;
    return LEVELS.map((l) => {
      const items = CHALLENGES.filter((c) => c.level === l.level);
      const solved = items.filter((c) => done[c.id]).length;
      return { ...l, solved, total: items.length, pct: Math.round((solved / items.length) * 100) };
    });
  });
  readonly nextChallenge = computed(() => CHALLENGES.find((c) => !this.data().challenges[c.id]) ?? null);
  readonly concepts = computed(() => {
    const a = this.data().algorithms;
    const used = (k: string) => (a[k] ?? 0) > 0;
    return [
      { name: 'Modelo multigrafo', ok: Object.keys(this.data().challenges).some((k) => k.startsWith('n1')) },
      { name: 'Grados y paridad', ok: Object.keys(this.data().challenges).some((k) => k.startsWith('n2')) },
      { name: 'BFS / DFS', ok: used('BFS') || used('DFS') },
      { name: 'Caminos y ciclos', ok: used('Análisis de caminos') || Object.keys(this.data().challenges).some((k) => k.startsWith('n4')) },
      { name: 'Hierholzer', ok: used('Hierholzer') || used('Experimento dominó completo') },
      { name: 'Backtracking', ok: used('Backtracking') },
    ];
  });

  ago(t: number): string {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'hace un momento';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return `hace ${Math.round(s / 86400)} d`;
  }
}
