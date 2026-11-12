import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { analyzeWalk } from '../../../core/algorithms/walk';
import { VertexId } from '../../../core/models/graph.models';
import { LabStateService } from '../../../core/services/lab-state.service';
import { ProgressService } from '../../../core/services/progress.service';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';

/** 6.8 Laboratorio de caminos y ciclos. */
@Component({
  selector: 'app-walks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent],
  templateUrl: './walks.component.html',
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr); gap: 16px; align-items: start; }
    .seq { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 36px; font-family: var(--mono); }
    .seq .v { display: inline-flex; width: 32px; height: 32px; border-radius: 50%; align-items: center; justify-content: center; background: #155e74; border: 2px solid var(--cyan); font-weight: 700; }
    .seq .arrow { color: var(--muted); font-size: 0.75rem; }
    .verdict { font: 800 1.2rem var(--font-head); }
    .defs td:first-child { font-weight: 700; white-space: nowrap; }
    .defs td { vertical-align: top; }
    .defs tr.cur td { background: rgba(85, 199, 223, 0.1); }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class WalksComponent {
  readonly lab = inject(LabStateService);
  private readonly progress = inject(ProgressService);
  readonly seq = signal<VertexId[]>([]);
  /** Aristas fijadas cuando la secuencia viene de una partida (respeta qué ficha se usó). */
  private readonly fixedEdges = signal<string[] | null>(null);
  readonly fromGame = signal(false);
  readonly analysis = computed(() => (this.seq().length ? analyzeWalk(this.lab.graph(), this.seq(), this.fixedEdges() ?? undefined) : null));

  constructor() {
    const w = this.lab.pendingWalk();
    if (w && w.vertices.length) {
      this.seq.set(w.vertices);
      this.fixedEdges.set(w.edges);
      this.fromGame.set(true);
    }
    this.lab.pendingWalk.set(null);
  }

  readonly defs = [
    { type: 'camino', name: 'Camino (recorrido)', def: 'Secuencia de vértices donde cada par consecutivo está unido por una arista. Puede repetir vértices y aristas.' },
    { type: 'camino-sin-aristas-repetidas', name: 'Camino sin aristas repetidas', def: 'No usa dos veces la misma ficha, aunque pase varias veces por un vértice. Es lo que forma una cadena de dominó.' },
    { type: 'camino-simple', name: 'Camino simple', def: 'No repite vértices (y por tanto tampoco aristas).' },
    { type: 'circuito', name: 'Circuito', def: 'Camino cerrado (termina donde empieza) sin aristas repetidas.' },
    { type: 'ciclo', name: 'Ciclo', def: 'Circuito que no repite vértices salvo el inicial al final. Un bucle es un ciclo de longitud 1; dos fichas paralelas forman un ciclo de longitud 2.' },
    { type: 'euler', name: 'Recorrido euleriano', def: 'Camino o circuito que usa TODAS las aristas exactamente una vez.' },
  ];

  readonly vertexClass = computed(() => {
    const out: Record<number, string> = {};
    for (const v of this.seq()) out[v] = 'inpath';
    const s = this.seq();
    if (s.length) {
      out[s[0]] = 'inpath start';
      out[s[s.length - 1]] = (out[s[s.length - 1]] ?? '') + ' current';
    }
    return out;
  });

  readonly edgeClass = computed(() => {
    const out: Record<string, string> = {};
    const a = this.analysis();
    if (!a?.valid) return out;
    for (const id of a.edges) out[id] = 'path';
    for (const id of a.repeatedEdges) out[id] = 'repeat';
    return out;
  });

  readonly badges = computed(() => {
    const out: Record<number, string> = {};
    this.seq().forEach((v, i) => (out[v] = out[v] ? `${out[v]},${i + 1}` : `${i + 1}`));
    return out;
  });

  add(v: VertexId): void {
    this.clearFixed();
    this.seq.update((s) => [...s, v]);
    if (this.seq().length === 2) this.progress.recordAlgorithm('Análisis de caminos');
  }

  undo(): void {
    this.clearFixed();
    this.seq.update((s) => s.slice(0, -1));
  }

  close(): void {
    this.clearFixed();
    const s = this.seq();
    if (s.length > 1) this.seq.set([...s, s[0]]);
  }

  example(kind: 'simple' | 'ciclo' | 'rep'): void {
    this.clearFixed();
    const g = this.lab.graph();
    const vs = g.vertices.filter((v) => g.degree(v) > 0);
    if (vs.length < 2) return;
    const a = vs[0];
    const n = g.neighbors(a).filter((x) => x !== a);
    if (!n.length) return;
    const b = n[0];
    if (kind === 'rep') {
      this.seq.set([a, b, a, b]);
      return;
    }
    const c = g.neighbors(b).find((x) => x !== a && x !== b);
    if (c === undefined) {
      this.seq.set([a, b]);
      return;
    }
    this.seq.set(kind === 'simple' ? [a, b, c] : g.edgesBetween(c, a).length ? [a, b, c, a] : [a, b, c]);
  }

  clear(): void {
    this.clearFixed();
    this.seq.set([]);
  }

  private clearFixed(): void {
    this.fixedEdges.set(null);
    this.fromGame.set(false);
  }
}
