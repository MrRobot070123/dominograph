import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { bfs } from '../../../core/algorithms/bfs';
import { isConnected } from '../../../core/algorithms/components';
import { degreeTable, handshake } from '../../../core/algorithms/degree';
import { analyzeEuler } from '../../../core/algorithms/euler';
import { hierholzer } from '../../../core/algorithms/hierholzer';
import { expectedTileCount, generateTileSet, isDouble } from '../../../core/algorithms/tiles';
import { MultiGraph } from '../../../core/graph-engine/multigraph';
import { LabStateService } from '../../../core/services/lab-state.service';
import { ProgressService } from '../../../core/services/progress.service';
import { DominoTileComponent } from '../../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';
import { StepControlsComponent } from '../../../shared/components/step-controls/step-controls.component';
import { circleLayout } from '../../../shared/utils/layout';
import { StepPlayer } from '../../../shared/utils/step-player';

/** 6.12 Experimento guiado: el dominó doble-seis completo admite un circuito euleriano. */
@Component({
  selector: 'app-experiment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, DominoTileComponent, StepControlsComponent],
  templateUrl: './experiment.component.html',
  styleUrl: './experiment.component.css',
})
export class ExperimentComponent {
  private readonly lab = inject(LabStateService);
  private readonly router = inject(Router);
  private readonly progress = inject(ProgressService);
  readonly player = new StepPlayer();

  readonly tiles = generateTileSet(6);
  readonly graph = MultiGraph.fromTiles(this.tiles);
  readonly positions = circleLayout(this.graph.vertices);
  readonly table = degreeTable(this.graph);
  readonly hs = handshake(this.graph);
  readonly euler = analyzeEuler(this.graph);
  readonly connected = isConnected(this.graph);
  readonly bfsOrder = bfs(this.graph, 0).order;
  readonly hier = hierholzer(this.graph, 0)!;
  readonly doubles = this.tiles.filter(isDouble);
  readonly nonDoubles = this.tiles.filter((t) => !isDouble(t));
  readonly expected = expectedTileCount(6);

  readonly step = signal(0);
  readonly titles = ['Las 28 fichas', 'Siete vértices', '28 aristas', 'Grado 8', 'Conectividad', 'Condición de Euler', 'Construcción con Hierholzer'];

  /** Cantidad de fichas ya recorridas en la animación de Hierholzer. */
  readonly walked = computed(() => {
    const i = this.player.index();
    if (i < 0) return 0;
    let n = 0;
    for (let k = 0; k <= i; k++) if (this.hier.steps[k].kind === 'advance') n++;
    return n;
  });

  readonly vertexClass = computed(() => {
    const out: Record<number, string> = {};
    const s = this.step();
    if (s === 1 || s === 3) for (const v of this.graph.vertices) out[v] = 'inpath';
    if (s === 4) for (const v of this.graph.vertices) out[v] = 'visited';
    if (s === 6) {
      const i = this.player.index();
      if (i >= 0) out[this.hier.steps[i].vertex] = 'current';
      out[0] = (out[0] ?? '') + ' start';
    }
    return out;
  });

  readonly edgeClass = computed(() => {
    const out: Record<string, string> = {};
    const s = this.step();
    if (s === 1) for (const e of this.graph.edges) out[e.id] = 'dim';
    if (s === 2) for (const e of this.graph.edges) out[e.id] = e.u === e.v ? 'active' : 'path';
    if (s === 4) for (const id of bfs(this.graph, 0).treeEdges) out[id] = 'tree';
    if (s === 6) {
      const i = this.player.index();
      for (let k = 0; k <= i; k++) {
        const st = this.hier.steps[k];
        if (st.kind === 'advance' && st.edgeId) out[st.edgeId] = 'euler';
      }
      const st = i >= 0 ? this.hier.steps[i] : null;
      if (st?.edgeId && st.kind === 'advance') out[st.edgeId] = 'active';
    }
    return out;
  });

  readonly badges = computed(() => {
    const out: Record<number, string> = {};
    if (this.step() >= 3) for (const r of this.table) out[r.vertex] = `g=${r.degree}`;
    return out;
  });

  readonly chain = this.hier.trail.edges.map((id, k) => ({ id, from: this.hier.trail.vertices[k], to: this.hier.trail.vertices[k + 1] }));

  go(i: number): void {
    this.step.set(Math.max(0, Math.min(this.titles.length - 1, i)));
    if (this.step() === 6) {
      this.player.load(this.hier.steps.length, true);
      this.progress.recordAlgorithm('Experimento dominó completo');
    } else this.player.load(0);
  }

  openInLab(): void {
    this.lab.loadPreset('full');
    this.router.navigateByUrl('/laboratorio/euler');
  }
}
