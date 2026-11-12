import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { compareGraphs } from '../../../core/algorithms/compare';
import { oddVertices } from '../../../core/algorithms/degree';
import { generateTileSet } from '../../../core/algorithms/tiles';
import { MultiGraph } from '../../../core/graph-engine/multigraph';
import { EulerKind, Tile } from '../../../core/models/graph.models';
import { LabStateService, PRESETS } from '../../../core/services/lab-state.service';
import { DominoTileComponent } from '../../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';

/** 6.11 Comparador de dos configuraciones de fichas. */
@Component({
  selector: 'app-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, DominoTileComponent],
  template: `
    <div class="two">
      <section class="card stack">
        <div class="card-title"><h2>A · Grafo activo</h2><span class="chip neutral">{{ lab.source() }}</span></div>
        <app-graph-view [graph]="a()" [positions]="lab.layout()" [vertexClass]="oddClass(a())" [edgeClass]="onlyA()" [draggable]="false" />
      </section>
      <section class="card stack">
        <div class="card-title"><h2>B · Configuración a comparar</h2>
          <select [value]="sourceB()" (change)="setB($any($event.target).value)" aria-label="Configuración B">
            <option value="copy">Copia editable de A</option>
            @for (p of presets; track p.id) { <option [value]="'p:' + p.id">{{ p.name }}</option> }
            @for (s of lab.saved(); track s.at) { <option [value]="'s:' + s.name">Guardada: {{ s.name }}</option> }
          </select>
        </div>
        <app-graph-view [graph]="b()" [positions]="lab.layout()" [vertexClass]="oddClass(b())" [edgeClass]="onlyB()" [draggable]="false" />
        <p class="small muted" style="margin:0">Haz clic en una ficha para agregarla o quitarla de B:</p>
        <div class="palette">
          @for (t of tiles; track t.id) {
            <button [class.on]="inB().has(t.id)" (click)="toggleB(t)" [attr.aria-label]="'Ficha ' + t.id + ' en B'"><app-domino-tile [a]="t.a" [b]="t.b" [size]="14" /></button>
          }
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:16px">
      <h2>Diferencias</h2>
      <table class="table">
        <thead><tr><th>Propiedad</th><th class="num">A</th><th class="num">B</th><th>Cambio</th></tr></thead>
        <tbody>
          <tr><td>Vértices</td><td class="num">{{ a().order }}</td><td class="num">{{ b().order }}</td><td class="small">{{ diffList(cmp().verticesOnlyA, cmp().verticesOnlyB) }}</td></tr>
          <tr><td>Aristas (fichas)</td><td class="num">{{ a().size }}</td><td class="num">{{ b().size }}</td><td class="small">{{ diffList(cmp().edgesOnlyA, cmp().edgesOnlyB) }}</td></tr>
          <tr><td>Componentes conexas</td><td class="num">{{ cmp().components.a }}</td><td class="num">{{ cmp().components.b }}</td><td>{{ cmp().components.a === cmp().components.b ? 'igual' : 'cambia la conectividad' }}</td></tr>
          <tr><td>Vértices de grado impar</td><td class="num">{{ cmp().oddCount.a }}</td><td class="num">{{ cmp().oddCount.b }}</td><td>{{ cmp().oddCount.a === cmp().oddCount.b ? 'igual' : (cmp().oddCount.b - cmp().oddCount.a > 0 ? '+' : '') + (cmp().oddCount.b - cmp().oddCount.a) }}</td></tr>
          <tr [class.hl]="cmp().euler.a !== cmp().euler.b"><td>Recorrido euleriano</td><td class="num small">{{ eulerName(cmp().euler.a) }}</td><td class="num small">{{ eulerName(cmp().euler.b) }}</td><td>{{ cmp().euler.a === cmp().euler.b ? 'igual' : 'cambia' }}</td></tr>
        </tbody>
      </table>
      @if (cmp().degreeChanges.length) {
        <h3 style="margin-top:14px">Grados que cambian</h3>
        <div class="row">@for (d of cmp().degreeChanges; track d.vertex) { <span class="chip" [class.warn]="(d.a % 2) !== (d.b % 2)">grado({{ d.vertex }}): {{ d.a }} → {{ d.b }}</span> }</div>
        <p class="small muted" style="margin-top:8px">En naranja, los vértices que cambian de paridad: son los que deciden si aparece o desaparece el recorrido euleriano.</p>
      } @else { <p class="muted small" style="margin-top:10px">Los grados son idénticos.</p> }
    </section>
  `,
  styles: `
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    .palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 4px; }
    .palette button { background: var(--night-2); border: 1px solid var(--line-soft); border-radius: 7px; padding: 4px 2px; cursor: pointer; opacity: 0.4; display: flex; justify-content: center; }
    .palette button.on { opacity: 1; border-color: var(--electric); }
    @media (max-width: 1000px) { .two { grid-template-columns: 1fr; } }
  `,
})
export class CompareComponent {
  readonly lab = inject(LabStateService);
  readonly presets = PRESETS;
  readonly tiles = generateTileSet(6);
  readonly sourceB = signal('copy');
  readonly b = signal<MultiGraph>(this.lab.graph());
  readonly a = this.lab.graph;

  readonly cmp = computed(() => compareGraphs(this.a(), this.b()));
  readonly inB = computed(() => new Set(this.b().edges.map((e) => `${e.u}-${e.v}`)));
  readonly onlyA = computed(() => this.markOnly(this.a(), this.cmp().edgesOnlyA));
  readonly onlyB = computed(() => this.markOnly(this.b(), this.cmp().edgesOnlyB));

  setB(v: string): void {
    this.sourceB.set(v);
    if (v === 'copy') this.b.set(this.a());
    else if (v.startsWith('p:')) this.b.set(PRESETS.find((p) => p.id === v.slice(2))!.build());
    else {
      const s = this.lab.saved().find((x) => x.name === v.slice(2));
      if (s) this.b.set(MultiGraph.fromData(s.data));
    }
  }

  toggleB(t: Tile): void {
    const ex = this.b().edgesBetween(t.a, t.b);
    this.b.set(ex.length ? this.b().removeEdge(ex[ex.length - 1].id) : this.b().addEdge(t.a, t.b));
  }

  oddClass(g: MultiGraph): Record<number, string> {
    const out: Record<number, string> = {};
    for (const v of oddVertices(g)) out[v] = 'odd';
    return out;
  }

  diffList(onlyA: readonly (string | number)[], onlyB: readonly (string | number)[]): string {
    const parts: string[] = [];
    if (onlyA.length) parts.push(`solo en A: ${onlyA.join(', ')}`);
    if (onlyB.length) parts.push(`solo en B: ${onlyB.join(', ')}`);
    return parts.join(' · ') || 'igual';
  }

  eulerName(k: EulerKind): string {
    return { circuit: 'Circuito', path: 'Camino', none: 'No existe', empty: 'Sin aristas' }[k];
  }

  private markOnly(g: MultiGraph, keys: readonly string[]): Record<string, string> {
    const out: Record<string, string> = {};
    const pending = [...keys];
    for (const e of [...g.edges].reverse()) {
      const i = pending.indexOf(`${e.u}-${e.v}`);
      if (i >= 0) {
        out[e.id] = 'active';
        pending.splice(i, 1);
      }
    }
    return out;
  }
}
