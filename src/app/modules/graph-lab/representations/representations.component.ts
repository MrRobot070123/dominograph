import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { adjacencyList, adjacencyMatrix, degreeFromMatrix } from '../../../core/algorithms/adjacency';
import { LabStateService, PRESETS } from '../../../core/services/lab-state.service';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';

type View = 'grafo' | 'matriz' | 'lista';

/** 6.4 Matriz de adyacencia y 6.5 lista de adyacencia, con vista alternable. */
@Component({
  selector: 'app-representations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent],
  templateUrl: './representations.component.html',
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
    .matrix td, .matrix th { text-align: center; font-family: var(--mono); padding: 7px 6px; min-width: 34px; }
    .matrix td { cursor: pointer; border-radius: 6px; }
    .matrix td.z { color: #4a6280; }
    .matrix td.diag { background: rgba(157, 140, 242, 0.12); color: #cbbfff; }
    .matrix td.hot { background: rgba(242, 184, 75, 0.25); color: #fff; outline: 1px solid var(--warn); }
    .matrix td.diff { background: rgba(227, 93, 106, 0.22); color: #ffd2d6; }
    .matrix th.rowh { color: var(--cyan); }
    .matrix td.deg { color: var(--cyan); font-weight: 700; }
    .list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .list li { display: flex; gap: 10px; align-items: baseline; padding: 8px 10px; border-radius: 9px; background: var(--night-2); border: 1px solid var(--line-soft); }
    .list .v { font: 800 1rem var(--font-head); color: var(--cyan); min-width: 74px; }
    .entry { display: inline-flex; gap: 4px; align-items: baseline; margin: 2px 8px 2px 0; padding: 2px 8px; border-radius: 7px; background: rgba(49, 140, 231, 0.1); font-family: var(--mono); font-size: 0.85rem; cursor: pointer; border: 1px solid transparent; }
    .entry.loop { background: rgba(143, 169, 201, 0.15); }
    .entry.hot { border-color: var(--warn); }
    .entry small { color: var(--muted); }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 1100px) { .layout, .two { grid-template-columns: 1fr; } }
  `,
})
export class RepresentationsComponent {
  readonly lab = inject(LabStateService);
  readonly presets = PRESETS;
  readonly view = signal<View>('matriz');
  readonly hot = signal<{ i: number; j: number } | null>(null);
  readonly hotEdge = signal<string | null>(null);
  readonly compareId = signal<string>('');

  readonly matrix = computed(() => adjacencyMatrix(this.lab.graph()));
  readonly list = computed(() => adjacencyList(this.lab.graph()));
  readonly degrees = computed(() => this.matrix().labels.map((_, i) => degreeFromMatrix(this.matrix(), i)));
  readonly other = computed(() => {
    const p = PRESETS.find((x) => x.id === this.compareId());
    return p ? { name: p.name, m: adjacencyMatrix(p.build()) } : null;
  });

  readonly edgeClass = computed(() => {
    const out: Record<string, string> = {};
    const h = this.hot();
    const he = this.hotEdge();
    const g = this.lab.graph();
    if (!h && !he) return out;
    for (const e of g.edges) out[e.id] = 'dim';
    if (h) {
      const [u, v] = [this.matrix().labels[h.i], this.matrix().labels[h.j]];
      for (const e of g.edgesBetween(u, v)) out[e.id] = 'active';
    }
    if (he) out[he] = 'active';
    return out;
  });

  readonly explanation = computed(() => {
    const h = this.hot();
    if (!h) return null;
    const m = this.matrix();
    const u = m.labels[h.i];
    const v = m.labels[h.j];
    const n = m.matrix[h.i][h.j];
    if (u === v) return `A[${u}][${u}] = ${n}: hay ${n} bucle(s) en el vértice ${u}. En el grado, cada bucle cuenta 2, por eso grado(${u}) = suma de la fila + A[${u}][${u}] = ${m.matrix[h.i].reduce((s, x) => s + x, 0)} + ${n} = ${this.degrees()[h.i]}.`;
    return `A[${u}][${v}] = ${n}: hay ${n} ficha(s) que unen ${u} y ${v}${n > 1 ? ' (aristas paralelas)' : ''}. La matriz es simétrica: A[${v}][${u}] = ${n}.`;
  });

  isDiff(i: number, j: number): boolean {
    const o = this.other();
    if (!o) return false;
    const a = this.matrix();
    const li = o.m.labels.indexOf(a.labels[i]);
    const lj = o.m.labels.indexOf(a.labels[j]);
    const ov = li >= 0 && lj >= 0 ? o.m.matrix[li][lj] : 0;
    return ov !== a.matrix[i][j];
  }

  isOtherDiff(i: number, j: number): boolean {
    const o = this.other()!;
    const a = this.matrix();
    const ai = a.labels.indexOf(o.m.labels[i]);
    const aj = a.labels.indexOf(o.m.labels[j]);
    const av = ai >= 0 && aj >= 0 ? a.matrix[ai][aj] : 0;
    return av !== o.m.matrix[i][j];
  }
}
