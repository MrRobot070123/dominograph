import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BacktrackResult, ChainLink, findChains } from '../../../core/algorithms/backtracking';
import { VertexId } from '../../../core/models/graph.models';
import { LabStateService } from '../../../core/services/lab-state.service';
import { ProgressService } from '../../../core/services/progress.service';
import { DominoTileComponent } from '../../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';
import { StepControlsComponent } from '../../../shared/components/step-controls/step-controls.component';
import { StepPlayer } from '../../../shared/utils/step-player';

/** 6.10 Laboratorio de backtracking: búsqueda de cadenas de fichas. */
@Component({
  selector: 'app-backtracking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, StepControlsComponent, DominoTileComponent],
  templateUrl: './backtracking.component.html',
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 1fr); gap: 16px; align-items: start; }
    .opts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .stat { background: var(--night-2); border: 1px solid var(--line-soft); border-radius: 10px; padding: 8px; text-align: center; }
    .stat b { display: block; font: 800 1.2rem var(--font-head); color: var(--cyan); }
    .stat span { font-size: 0.75rem; color: var(--muted); }
    .partial { display: flex; flex-wrap: wrap; gap: 3px; min-height: 30px; align-items: center; }
    .msg { min-height: 44px; }
    .msg.place { border-color: var(--electric); } .msg.backtrack { border-color: var(--warn); background: rgba(242, 184, 75, 0.08); }
    .msg.solution { border-color: var(--success); background: rgba(41, 180, 122, 0.1); } .msg.dead-end { border-color: var(--error); background: rgba(227, 93, 106, 0.08); }
    .sols { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; max-height: 260px; overflow: auto; }
    .sols button { width: 100%; text-align: left; background: var(--night-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 6px 10px; color: var(--text); font: 0.82rem var(--mono); cursor: pointer; }
    .sols button.on { border-color: var(--success); }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class BacktrackingComponent {
  readonly lab = inject(LabStateService);
  private readonly progress = inject(ProgressService);
  readonly player = new StepPlayer();
  readonly mode = signal<'all' | 'length'>('length');
  readonly length = signal(4);
  readonly maxSolutions = signal(10);
  readonly start = signal<VertexId>(this.firstWithEdge());
  readonly result = signal<BacktrackResult | null>(null);
  readonly selected = signal<number | null>(null);

  readonly g = this.lab.graph;
  readonly step = computed(() => {
    const r = this.result();
    const i = this.player.index();
    return r && i >= 0 ? r.steps[i] : null;
  });

  /** Cadena que se muestra: la solución elegida o la cadena parcial del paso actual. */
  readonly shownChain = computed<{ from: number; to: number; id: string }[]>(() => {
    const r = this.result();
    const sel = this.selected();
    if (r && sel !== null) return r.solutions[sel].map((l) => ({ from: l.from, to: l.to, id: l.edgeId }));
    const s = this.step();
    if (!s) return [];
    return s.chain.map((lbl, k) => {
      const [from, to] = lbl.split('|').map(Number);
      return { from, to, id: `${k}` };
    });
  });

  readonly edgeClass = computed(() => {
    const out: Record<string, string> = {};
    const r = this.result();
    const sel = this.selected();
    if (r && sel !== null) {
      for (const l of r.solutions[sel]) out[l.edgeId] = 'euler';
      return out;
    }
    const s = this.step();
    if (!s) return out;
    // reconstruir ids a partir de la cadena parcial
    const used = new Set<string>();
    for (const lbl of s.chain) {
      const [a, b] = lbl.split('|').map(Number);
      const e = this.g().edgesBetween(a, b).find((x) => !used.has(x.id));
      if (e) {
        used.add(e.id);
        out[e.id] = 'path';
      }
    }
    return out;
  });

  readonly vertexClass = computed(() => {
    const out: Record<number, string> = { [this.start()]: 'start' };
    const c = this.shownChain();
    if (c.length) out[c[c.length - 1].to] = 'current';
    return out;
  });

  run(): void {
    const r = findChains(this.g(), this.start(), {
      mode: this.mode(),
      targetLength: this.length(),
      maxSolutions: Math.max(1, Math.min(200, this.maxSolutions())),
      maxNodes: 300_000,
      maxLoggedSteps: 600,
    });
    this.selected.set(null);
    this.result.set(r);
    this.player.load(r.steps.length, true);
    this.progress.recordAlgorithm('Backtracking');
  }

  chainText(c: readonly ChainLink[]): string {
    return c.map((l) => `${l.from}|${l.to}`).join(' ');
  }

  private firstWithEdge(): VertexId {
    const g = this.lab.graph();
    return g.vertices.find((v) => g.degree(v) > 0) ?? g.vertices[0] ?? 0;
  }
}
