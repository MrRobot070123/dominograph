import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { connectedComponents } from '../../../core/algorithms/components';
import { degreeMap, evenVertices, oddVertices } from '../../../core/algorithms/degree';
import { analyzeEuler } from '../../../core/algorithms/euler';
import { MultiGraph } from '../../../core/graph-engine/multigraph';

/** Panel de propiedades matemáticas calculadas en tiempo real por el motor. */
@Component({
  selector: 'app-graph-properties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="props">
      <div class="kv"><span>Vértices</span><b>{{ g().order }}</b></div>
      <div class="kv"><span>Aristas (fichas)</span><b>{{ g().size }}</b></div>
      <div class="kv"><span>Bucles (dobles)</span><b>{{ loops() }}</b></div>
      <div class="kv"><span>Aristas paralelas</span><b>{{ parallel() }}</b></div>
      <div class="kv"><span>Componentes conexas</span><b>{{ comps().length }}</b></div>
      <div class="kv"><span>Conexo</span><b [class.ok]="comps().length === 1" [class.bad]="comps().length !== 1">{{ comps().length === 1 ? 'Sí' : 'No' }}</b></div>
    </div>
    <div class="degrees" aria-label="Grado de cada vértice">
      @for (d of degrees(); track d.v) {
        <span class="deg" [class.odd]="d.d % 2 === 1"><b>{{ d.v }}</b><small>{{ d.d }}</small></span>
      }
    </div>
    <div class="row small">
      <span class="muted">Pares:</span> <span class="mono">{{ even().join(', ') || '—' }}</span>
      <span class="muted" style="margin-left:10px">Impares:</span> <span class="mono odd-text">{{ odd().join(', ') || '—' }}</span>
    </div>
    <div class="euler" [class.ok]="euler().kind === 'circuit' || euler().kind === 'path'" [class.bad]="euler().kind === 'none'">
      <div class="row"><b>Camino euleriano:</b> {{ euler().kind === 'path' || euler().kind === 'circuit' ? 'Sí' : 'No' }}
        <span class="spacer"></span><b>Circuito euleriano:</b> {{ euler().kind === 'circuit' ? 'Sí' : 'No' }}</div>
      <div class="small muted">{{ euler().reasons[euler().reasons.length - 1] }}</div>
    </div>
  `,
  styles: `
    .props { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; margin-bottom: 12px; }
    .kv { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--line-soft); font-size: 0.88rem; }
    .kv span { color: var(--muted); }
    .kv b { font-family: var(--mono); }
    .ok { color: #7ee0b5; } .bad { color: #ff9ba5; }
    .degrees { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }
    .deg { display: inline-flex; flex-direction: column; align-items: center; min-width: 42px; padding: 4px 6px; border-radius: 9px; background: var(--night-2); border: 1px solid var(--line-soft); }
    .deg b { font-size: 0.95rem; } .deg small { font: 600 0.75rem var(--mono); color: var(--cyan); }
    .deg.odd { border-color: var(--odd); } .deg.odd small { color: var(--odd); }
    .odd-text { color: var(--odd); }
    .euler { margin-top: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line-soft); background: var(--night-2); font-size: 0.9rem; }
    .euler.ok { border-color: rgba(41, 180, 122, 0.5); } .euler.bad { border-color: rgba(227, 93, 106, 0.5); }
  `,
})
export class GraphPropertiesComponent {
  readonly g = input.required<MultiGraph>({ alias: 'graph' });
  readonly loops = computed(() => this.g().loops().length);
  readonly parallel = computed(() => this.g().parallelEdgeCount());
  readonly comps = computed(() => connectedComponents(this.g()));
  readonly degrees = computed(() => [...degreeMap(this.g())].map(([v, d]) => ({ v, d })));
  readonly odd = computed(() => oddVertices(this.g()));
  readonly even = computed(() => evenVertices(this.g()));
  readonly euler = computed(() => analyzeEuler(this.g()));
}
