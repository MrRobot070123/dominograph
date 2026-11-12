import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { degreeMap, degreeTable, handshake } from '../../../core/algorithms/degree';
import { generateTileSet } from '../../../core/algorithms/tiles';
import { Tile } from '../../../core/models/graph.models';
import { LabStateService } from '../../../core/services/lab-state.service';
import { DominoTileComponent } from '../../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';

/** 6.6 Analizador de grados y teorema del apretón de manos. */
@Component({
  selector: 'app-degrees',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, DominoTileComponent],
  templateUrl: './degrees.component.html',
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
    .bars { display: flex; align-items: flex-end; gap: 10px; height: 150px; padding: 8px 4px 0; border-bottom: 1px solid var(--line); }
    .bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4px; }
    .bar div { width: 100%; max-width: 40px; border-radius: 7px 7px 2px 2px; background: linear-gradient(180deg, var(--electric-2), var(--electric)); transition: height 0.3s; }
    .bar.odd div { background: linear-gradient(180deg, #ffb877, var(--odd)); }
    .bar.max div { box-shadow: 0 0 0 2px var(--cyan); }
    .bar span { font: 600 0.8rem var(--mono); color: var(--muted); }
    .xs { display: flex; gap: 10px; padding: 4px; } .xs span { flex: 1; text-align: center; font-weight: 800; }
    .sim { display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 6px; }
    .sim button { background: var(--night-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 6px 3px; cursor: pointer; display: flex; justify-content: center; }
    .sim button.on { border-color: var(--electric); }
    .sim button.pick { border-color: var(--warn); background: rgba(242, 184, 75, 0.12); }
    .delta { color: var(--warn); font-weight: 700; }
    tr.max td:first-child { color: var(--cyan); font-weight: 800; }
    .odd-t { color: var(--odd); font-weight: 700; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class DegreesComponent {
  readonly lab = inject(LabStateService);
  readonly tiles = generateTileSet(6);
  readonly picked = signal<Tile | null>(null);

  readonly table = computed(() => degreeTable(this.lab.graph()));
  readonly hs = computed(() => handshake(this.lab.graph()));
  readonly maxDeg = computed(() => Math.max(1, ...this.table().map((r) => r.degree)));
  readonly loopsTotal = computed(() => this.table().reduce((s, r) => s + r.loops, 0));
  readonly has = computed(() => new Set(this.lab.graph().edges.map((e) => `${e.u}-${e.v}`)));

  /** Simulación: cómo cambian los grados si se agrega o quita la ficha elegida. */
  readonly simulation = computed(() => {
    const t = this.picked();
    if (!t) return null;
    const g = this.lab.graph();
    const existing = g.edgesBetween(t.a, t.b);
    const removing = existing.length > 0;
    const after = removing ? g.removeEdge(existing[existing.length - 1].id) : g.addEdge(t.a, t.b);
    const before = degreeMap(g);
    const aft = degreeMap(after);
    const rows = [...new Set([t.a, t.b])].map((v) => ({ v, before: before.get(v) ?? 0, after: aft.get(v) ?? 0 }));
    return { tile: t, removing, rows, sumBefore: 2 * g.size, sumAfter: 2 * after.size, isDouble: t.a === t.b };
  });

  readonly vertexClass = computed(() => {
    const out: Record<number, string> = {};
    for (const r of this.table()) out[r.vertex] = r.parity === 'impar' ? 'odd' : r.degree === 0 ? 'isolated' : '';
    const s = this.simulation();
    if (s) for (const r of s.rows) out[r.v] = (out[r.v] ?? '') + ' current';
    return out;
  });
  readonly badges = computed(() => {
    const out: Record<number, string> = {};
    for (const r of this.table()) out[r.vertex] = String(r.degree);
    return out;
  });

  pick(t: Tile): void {
    this.picked.set(this.picked()?.id === t.id ? null : t);
  }

  apply(): void {
    const s = this.simulation();
    if (!s) return;
    this.lab.update((g) => {
      const ex = g.edgesBetween(s.tile.a, s.tile.b);
      return s.removing ? g.removeEdge(ex[ex.length - 1].id) : g.addEdge(s.tile.a, s.tile.b);
    });
    this.picked.set(null);
  }
}
