import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { bfs } from '../../../core/algorithms/bfs';
import { connectedComponents, edgeComponents } from '../../../core/algorithms/components';
import { dfs } from '../../../core/algorithms/dfs';
import { TraversalResult, VertexId } from '../../../core/models/graph.models';
import { LabStateService } from '../../../core/services/lab-state.service';
import { ProgressService } from '../../../core/services/progress.service';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';
import { StepControlsComponent } from '../../../shared/components/step-controls/step-controls.component';
import { StepPlayer } from '../../../shared/utils/step-player';

/** 6.7 Analizador de conectividad: BFS y DFS paso a paso y componentes conexas. */
@Component({
  selector: 'app-connectivity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, StepControlsComponent],
  templateUrl: './connectivity.component.html',
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr); gap: 16px; align-items: start; }
    .seq { display: flex; flex-wrap: wrap; gap: 6px; min-height: 34px; align-items: center; }
    .pill { display: inline-flex; align-items: center; justify-content: center; min-width: 30px; height: 30px; padding: 0 8px; border-radius: 15px; background: var(--electric); color: #fff; font: 700 0.9rem var(--mono); }
    .pill.q { background: rgba(157, 140, 242, 0.25); border: 1px solid var(--violet); color: #e2dcff; }
    .pill.u { background: rgba(227, 93, 106, 0.2); border: 1px solid var(--error); color: #ffc4ca; }
    .msg { min-height: 48px; font-size: 0.95rem; }
    .comp { display: flex; flex-wrap: wrap; gap: 8px; }
    .comp span { padding: 4px 10px; border-radius: 8px; font-family: var(--mono); font-size: 0.85rem; color: #fff; }
    .c0 { background: #1b5fa8; } .c1 { background: #157a63; } .c2 { background: #8a4fb3; } .c3 { background: #a35a22; } .c4 { background: #a33a4a; } .c5 { background: #5a6b1e; } .c6 { background: #2f4a6b; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class ConnectivityComponent {
  readonly lab = inject(LabStateService);
  private readonly progress = inject(ProgressService);
  readonly player = new StepPlayer();
  readonly start = signal<VertexId>(this.lab.graph().vertices[0] ?? 0);
  readonly result = signal<TraversalResult | null>(null);
  readonly showComponents = signal(false);

  readonly components = computed(() => connectedComponents(this.lab.graph()));
  readonly withEdges = computed(() => edgeComponents(this.lab.graph()).length);
  readonly step = computed(() => {
    const r = this.result();
    const i = this.player.index();
    return r && i >= 0 ? r.steps[i] : null;
  });
  readonly done = computed(() => this.step()?.kind === 'done');
  /** Orden de visita conocido hasta el paso actual. */
  readonly orderSoFar = computed(() => {
    const r = this.result();
    if (!r) return [];
    const i = this.player.index();
    const seen: VertexId[] = [];
    for (let k = 0; k <= i; k++) {
      const s = r.steps[k];
      const v = r.algorithm === 'BFS' ? (s.kind === 'visit' ? s.vertex : null) : s.kind === 'start' || s.kind === 'discover' ? s.vertex : null;
      if (v !== null && !seen.includes(v)) seen.push(v);
    }
    return seen;
  });

  readonly vertexClass = computed(() => {
    const out: Record<number, string> = {};
    if (this.showComponents()) {
      this.components().forEach((c, i) => c.forEach((v) => (out[v] = `c${i % 7}`)));
      return out;
    }
    const s = this.step();
    const r = this.result();
    if (!s || !r) {
      out[this.start()] = 'start';
      return out;
    }
    for (const v of s.visited) out[v] = 'visited';
    for (const v of s.frontier) out[v] = (out[v] ?? '') + ' frontier';
    out[s.vertex] = (out[s.vertex] ?? '') + ' current';
    if (s.kind === 'done') {
      for (const v of r.unreachable) out[v] = 'unreach';
      out[r.start] = 'visited start';
    }
    return out;
  });

  readonly edgeClass = computed(() => {
    const out: Record<string, string> = {};
    const r = this.result();
    const i = this.player.index();
    if (!r || i < 0 || this.showComponents()) return out;
    for (let k = 0; k <= i; k++) {
      const s = r.steps[k];
      if (s.kind === 'discover' && s.edgeId) out[s.edgeId] = 'tree';
    }
    const s = r.steps[i];
    if (s.edgeId && (s.kind === 'discover' || s.kind === 'skip')) out[s.edgeId] = 'active';
    return out;
  });

  readonly badges = computed(() => {
    const out: Record<number, string> = {};
    const r = this.result();
    if (!r || this.player.index() < 0 || this.showComponents()) return out;
    this.orderSoFar().forEach((v, i) => (out[v] = `#${i + 1}`));
    return out;
  });

  run(kind: 'BFS' | 'DFS'): void {
    const g = this.lab.graph();
    if (!g.hasVertex(this.start())) this.start.set(g.vertices[0]);
    if (!g.vertices.length) return;
    this.showComponents.set(false);
    const r = kind === 'BFS' ? bfs(g, this.start()) : dfs(g, this.start());
    this.result.set(r);
    this.player.load(r.steps.length, true);
    this.progress.recordAlgorithm(kind);
  }

  pickStart(v: VertexId): void {
    this.start.set(v);
    this.result.set(null);
    this.player.load(0);
  }
}
