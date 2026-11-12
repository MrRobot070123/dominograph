import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { fleury, FleuryResult } from '../../../core/algorithms/fleury';
import { hierholzer, HierholzerResult, validateEulerTrail } from '../../../core/algorithms/hierholzer';
import { Trail, VertexId } from '../../../core/models/graph.models';
import { LabStateService } from '../../../core/services/lab-state.service';
import { ProgressService } from '../../../core/services/progress.service';
import { DominoTileComponent } from '../../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';
import { StepControlsComponent } from '../../../shared/components/step-controls/step-controls.component';
import { StepPlayer } from '../../../shared/utils/step-player';

type Algo = 'hierholzer' | 'fleury';

/** 6.9 Laboratorio de Euler: condiciones, Hierholzer animado y Fleury didáctico. */
@Component({
  selector: 'app-euler',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, StepControlsComponent, DominoTileComponent],
  templateUrl: './euler.component.html',
  styleUrl: './euler.component.css',
})
export class EulerComponent {
  readonly lab = inject(LabStateService);
  private readonly progress = inject(ProgressService);
  readonly player = new StepPlayer();
  readonly algo = signal<Algo>('hierholzer');
  readonly start = signal<VertexId | null>(null);
  readonly hResult = signal<HierholzerResult | null>(null);
  readonly fResult = signal<FleuryResult | null>(null);

  readonly analysis = this.lab.euler;
  readonly g = this.lab.graph;
  readonly possible = computed(() => this.analysis().kind === 'circuit' || this.analysis().kind === 'path');
  readonly validStarts = computed(() => {
    const a = this.analysis();
    if (a.kind === 'circuit') return this.g().vertices.filter((v) => this.g().degree(v) > 0);
    if (a.kind === 'path') return [...a.oddVertices];
    return [];
  });

  readonly trail = computed<Trail | null>(() => (this.algo() === 'hierholzer' ? this.hResult()?.trail : this.fResult()?.trail) ?? null);
  readonly validation = computed(() => {
    const t = this.trail();
    return t ? validateEulerTrail(this.g(), t) : null;
  });
  readonly finished = computed(() => this.trail() !== null && this.player.atEnd());

  /** Fichas del recorrido final, orientadas. */
  readonly chain = computed(() => {
    const t = this.trail();
    if (!t) return [];
    return t.edges.map((id, k) => ({ id, from: t.vertices[k], to: t.vertices[k + 1] }));
  });

  readonly stepMessage = computed(() => {
    const i = this.player.index();
    if (i < 0) return null;
    return this.algo() === 'hierholzer' ? this.hResult()?.steps[i]?.message ?? null : this.fResult()?.steps[i]?.message ?? null;
  });

  readonly hState = computed(() => {
    const r = this.hResult();
    const i = this.player.index();
    if (!r || i < 0 || this.algo() !== 'hierholzer') return null;
    return r.steps[i];
  });

  readonly fState = computed(() => {
    const r = this.fResult();
    const i = this.player.index();
    if (!r || i < 0 || this.algo() !== 'fleury') return null;
    return r.steps[i];
  });

  readonly vertexClass = computed(() => {
    const out: Record<number, string> = {};
    const a = this.analysis();
    for (const v of a.oddVertices) out[v] = 'odd';
    for (const v of a.isolatedVertices) out[v] = 'isolated';
    const t = this.trail();
    if (t && this.player.index() < 0) out[t.vertices[0]] = 'start';
    const h = this.hState();
    if (h) out[h.vertex] = (out[h.vertex] ?? '') + ' current';
    const f = this.fState();
    if (f) out[f.to] = (out[f.to] ?? '') + ' current';
    if (this.finished() && t) {
      out[t.vertices[0]] = 'start';
      out[t.vertices[t.vertices.length - 1]] = t.closed ? 'start' : 'endv';
    }
    return out;
  });

  readonly edgeClass = computed(() => {
    const out: Record<string, string> = {};
    const i = this.player.index();
    if (this.algo() === 'hierholzer') {
      const r = this.hResult();
      if (!r || i < 0) return out;
      for (let k = 0; k <= i; k++) {
        const s = r.steps[k];
        if (s.kind === 'advance' && s.edgeId) out[s.edgeId] = 'euler';
      }
      const s = r.steps[i];
      if (s.edgeId) out[s.edgeId] = s.kind === 'advance' ? 'active' : 'euler path';
    } else {
      const r = this.fResult();
      if (!r || i < 0) return out;
      for (let k = 0; k < i; k++) out[r.steps[k].chosen] = 'removed';
      const s = r.steps[i];
      for (const c of s.candidates) if (c.isBridge) out[c.edgeId] = 'bridge';
      out[s.chosen] = 'active';
    }
    return out;
  });

  readonly badges = computed(() => {
    const out: Record<number, string> = {};
    for (const v of this.g().vertices) out[v] = `g=${this.g().degree(v)}`;
    return out;
  });

  run(): void {
    const g = this.g();
    const s = this.start() ?? undefined;
    if (this.algo() === 'hierholzer') {
      const r = hierholzer(g, s);
      this.hResult.set(r);
      this.player.load(r?.steps.length ?? 0, true);
      this.progress.recordAlgorithm('Hierholzer');
    } else {
      const r = fleury(g, s);
      this.fResult.set(r);
      this.player.load(r?.steps.length ?? 0, true);
      this.progress.recordAlgorithm('Fleury');
    }
  }

  setAlgo(a: Algo): void {
    this.algo.set(a);
    this.player.load(0);
    this.hResult.set(null);
    this.fResult.set(null);
  }

  chainState(k: number): string | null {
    if (this.finished()) return 'euler';
    return null;
  }
}
