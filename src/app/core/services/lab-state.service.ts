import { computed, inject, Injectable, signal } from '@angular/core';
import { analyzeEuler } from '../algorithms/euler';
import { generateTileSet } from '../algorithms/tiles';
import { MultiGraph } from '../graph-engine/multigraph';
import { GraphData, VertexId } from '../models/graph.models';
import { circleLayout, ensurePositions, gridLayout, Positions } from '../../shared/utils/layout';
import { StorageService } from './storage.service';

export interface SavedConfig {
  readonly name: string;
  readonly data: GraphData;
  readonly positions: Positions;
  readonly at: number;
}

export interface Preset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly build: () => MultiGraph;
}

const STD = [0, 1, 2, 3, 4, 5, 6];

export const PRESETS: readonly Preset[] = [
  { id: 'full', name: 'Dominó completo (28)', description: 'Las 28 fichas del doble-seis.', build: () => MultiGraph.fromTiles(generateTileSet(6)) },
  { id: 'empty', name: 'Siete vértices sin fichas', description: 'Punto de partida para construir.', build: () => MultiGraph.withVertices(STD) },
  { id: 'doubles', name: 'Solo dobles', description: 'Siete bucles: grados pares pero grafo no conexo.', build: () => MultiGraph.fromTiles(generateTileSet(6).filter((t) => t.a === t.b), STD) },
  { id: 'no-doubles', name: 'Sin dobles (21)', description: 'Grafo completo K7: todos los grados son 6.', build: () => MultiGraph.fromTiles(generateTileSet(6).filter((t) => t.a !== t.b), STD) },
  { id: 'path', name: 'Camino abierto', description: 'Exactamente dos vértices impares.', build: () => MultiGraph.fromData({ vertices: STD, edges: e(['0-1', '1-2', '2-3', '3-1', '2-2']) }) },
  { id: 'star', name: 'Estrella (sin Euler)', description: 'Cuatro vértices de grado impar.', build: () => MultiGraph.fromData({ vertices: STD, edges: e(['0-1', '0-2', '0-3', '0-0']) }) },
  { id: 'parallel', name: 'Conjunto con repetidas', description: 'Incluye dos fichas 1-3 (aristas paralelas).', build: () => MultiGraph.fromData({ vertices: STD, edges: e(['1-3', '1-3#2', '3-3', '1-5', '3-5', '5-5']) }) },
  { id: 'two-parts', name: 'Dos componentes', description: 'Grados pares pero aristas desconectadas.', build: () => MultiGraph.fromData({ vertices: STD, edges: e(['0-1', '1-2', '2-0', '4-5', '5-6', '6-4']) }) },
];

function e(ids: string[]): GraphData['edges'] {
  return ids.map((id) => {
    const [a, b] = id.split('#')[0].split('-').map(Number);
    return { id, u: a, v: b };
  });
}

/**
 * Estado compartido del laboratorio: el grafo activo, las posiciones
 * visuales y las configuraciones guardadas. Los resultados matemáticos
 * se calculan siempre con el motor, nunca se almacenan como valores fijos.
 */
@Injectable({ providedIn: 'root' })
export class LabStateService {
  private readonly storage = inject(StorageService);

  readonly graph = signal<MultiGraph>(this.restoreGraph());
  readonly positions = signal<Positions>(this.storage.read<Positions>('lab.positions', circleLayout(STD)));
  readonly source = signal<string>(this.storage.read('lab.source', 'Dominó completo (28)'));
  readonly saved = signal<SavedConfig[]>(this.storage.read<SavedConfig[]>('lab.saved', []));
  readonly selectedVertex = signal<VertexId | null>(null);
  readonly selectedEdge = signal<string | null>(null);
  /** Secuencia de vértices enviada desde otro módulo (p. ej. la cadena de una partida). */
  readonly pendingWalk = signal<{ vertices: VertexId[]; edges: string[] } | null>(null);

  readonly euler = computed(() => analyzeEuler(this.graph()));
  readonly layout = computed(() => ensurePositions(this.graph().vertices, this.positions()));

  setGraph(g: MultiGraph, source?: string): void {
    this.graph.set(g);
    if (source) this.source.set(source);
    this.positions.set(ensurePositions(g.vertices, this.positions()));
    this.selectedEdge.set(null);
    if (this.selectedVertex() !== null && !g.hasVertex(this.selectedVertex()!)) this.selectedVertex.set(null);
    this.persist();
  }

  update(fn: (g: MultiGraph) => MultiGraph, source = 'Configuración personalizada'): void {
    this.setGraph(fn(this.graph()), source);
  }

  loadPreset(id: string): void {
    const p = PRESETS.find((x) => x.id === id);
    if (p) this.setGraph(p.build(), p.name);
  }

  moveVertex(v: VertexId, x: number, y: number): void {
    this.positions.update((p) => ({ ...p, [v]: { x, y } }));
    this.storage.write('lab.positions', this.positions());
  }

  relayout(kind: 'circle' | 'grid'): void {
    const vs = this.graph().vertices;
    this.positions.set(kind === 'circle' ? circleLayout(vs) : gridLayout(vs));
    this.storage.write('lab.positions', this.positions());
  }

  saveConfig(name: string): void {
    const cfg: SavedConfig = { name: name.trim() || `Configuración ${this.saved().length + 1}`, data: this.graph().toData(), positions: this.layout(), at: Date.now() };
    this.saved.update((s) => [cfg, ...s.filter((x) => x.name !== cfg.name)].slice(0, 12));
    this.storage.write('lab.saved', this.saved());
  }

  loadConfig(cfg: SavedConfig): void {
    this.positions.set(cfg.positions);
    this.setGraph(MultiGraph.fromData(cfg.data), cfg.name);
  }

  deleteConfig(cfg: SavedConfig): void {
    this.saved.update((s) => s.filter((x) => x !== cfg));
    this.storage.write('lab.saved', this.saved());
  }

  private persist(): void {
    this.storage.write('lab.graph', this.graph().toData());
    this.storage.write('lab.positions', this.positions());
    this.storage.write('lab.source', this.source());
  }

  private restoreGraph(): MultiGraph {
    try {
      const d = this.storage.read<GraphData | null>('lab.graph', null);
      return d ? MultiGraph.fromData(d) : MultiGraph.fromTiles(generateTileSet(6));
    } catch {
      return MultiGraph.fromTiles(generateTileSet(6));
    }
  }
}
