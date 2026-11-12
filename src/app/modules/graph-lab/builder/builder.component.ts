import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { oddVertices } from '../../../core/algorithms/degree';
import { generateTileSet, parseTiles } from '../../../core/algorithms/tiles';
import { MultiGraph } from '../../../core/graph-engine/multigraph';
import { Tile, VertexId } from '../../../core/models/graph.models';
import { LabStateService, PRESETS, SavedConfig } from '../../../core/services/lab-state.service';
import { DominoTileComponent } from '../../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../../shared/components/graph-view/graph-view.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { GraphPropertiesComponent } from '../components/graph-properties.component';

/** 6.1 Constructor de grafos + 6.2 visualizador + 6.3 panel de propiedades. */
@Component({
  selector: 'app-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, GraphPropertiesComponent, DominoTileComponent, IconComponent],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.css',
})
export class BuilderComponent {
  readonly lab = inject(LabStateService);
  readonly presets = PRESETS;
  readonly tiles = generateTileSet(6);
  readonly connectMode = signal(false);
  readonly connectFrom = signal<VertexId | null>(null);
  readonly allowRepeats = signal(false);
  readonly tileText = signal('');
  readonly newVertex = signal<number | null>(null);
  readonly saveName = signal('');
  readonly message = signal<{ text: string; kind: 'ok' | 'bad' | 'info' } | null>(null);
  readonly confirmDelete = signal<VertexId | null>(null);

  readonly g = this.lab.graph;
  readonly vertexClass = computed(() => {
    const out: Record<number, string> = {};
    for (const v of oddVertices(this.g())) out[v] = 'odd';
    for (const v of this.g().vertices) if (this.g().degree(v) === 0) out[v] = 'isolated';
    const f = this.connectFrom();
    if (f !== null) out[f] = (out[f] ?? '') + ' current';
    return out;
  });
  readonly badges = computed(() => {
    const out: Record<number, string> = {};
    for (const v of this.g().vertices) out[v] = `g=${this.g().degree(v)}`;
    return out;
  });
  readonly tileCount = computed(() => {
    const m = new Map<string, number>();
    for (const e of this.g().edges) {
      const k = `${e.u}-${e.v}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  });
  readonly selectedEdgeInfo = computed(() => {
    const id = this.lab.selectedEdge();
    return id ? this.g().edge(id) ?? null : null;
  });
  readonly selectedVertexInfo = computed(() => {
    const v = this.lab.selectedVertex();
    if (v === null || !this.g().hasVertex(v)) return null;
    return { v, degree: this.g().degree(v), neighbors: this.g().neighbors(v), incident: this.g().incidentEdges(v).map((e) => e.id) };
  });

  onVertexClick(v: VertexId): void {
    if (this.connectMode()) {
      const from = this.connectFrom();
      if (from === null) {
        this.connectFrom.set(v);
        this.flash(`Origen ${v}. Elige el otro extremo (el mismo vértice crea un bucle).`, 'info');
        return;
      }
      this.addEdge(from, v);
      this.connectFrom.set(null);
      return;
    }
    this.lab.selectedEdge.set(null);
    this.lab.selectedVertex.set(this.lab.selectedVertex() === v ? null : v);
  }

  onEdgeClick(id: string): void {
    this.lab.selectedVertex.set(null);
    this.lab.selectedEdge.set(this.lab.selectedEdge() === id ? null : id);
  }

  toggleTile(t: Tile): void {
    const existing = this.g().edgesBetween(t.a, t.b);
    if (existing.length && !this.allowRepeats()) {
      this.lab.update((g) => g.removeEdge(existing[existing.length - 1].id));
      this.flash(`Se quitó la ficha ${t.id}.`, 'info');
    } else {
      this.addEdge(t.a, t.b);
    }
  }

  addEdge(u: VertexId, v: VertexId): void {
    const id = this.g().nextEdgeId(u, v);
    this.lab.update((g) => g.addEdge(u, v));
    this.flash(u === v ? `Bucle ${id} agregado: suma 2 al grado de ${u}.` : id.includes('#') ? `Arista paralela ${id} agregada.` : `Ficha ${id} agregada.`, 'ok');
  }

  addFromText(): void {
    try {
      const tiles = parseTiles(this.tileText());
      if (!tiles.length) return;
      let g = this.g();
      for (const t of tiles) g = g.addEdge(t.a, t.b);
      this.lab.setGraph(g, 'Configuración personalizada');
      this.tileText.set('');
      this.flash(`${tiles.length} ficha(s) agregada(s).`, 'ok');
    } catch (e) {
      this.flash((e as Error).message, 'bad');
    }
  }

  addVertex(): void {
    const v = this.newVertex() ?? (this.g().vertices.length ? Math.max(...this.g().vertices) + 1 : 0);
    if (!Number.isInteger(v) || v < 0 || v > 30) {
      this.flash('El vértice debe ser un entero entre 0 y 30.', 'bad');
      return;
    }
    if (this.g().hasVertex(v)) {
      this.flash(`El vértice ${v} ya existe.`, 'bad');
      return;
    }
    this.lab.update((g) => g.addVertex(v));
    this.newVertex.set(null);
    this.flash(`Vértice ${v} agregado.`, 'ok');
  }

  requestDeleteVertex(): void {
    const v = this.lab.selectedVertex();
    if (v === null) return;
    if (this.g().incidentEdges(v).length === 0) this.deleteVertex(v);
    else this.confirmDelete.set(v);
  }

  deleteVertex(v: VertexId): void {
    const n = this.g().incidentEdges(v).length;
    this.lab.update((g) => g.removeVertex(v));
    this.lab.selectedVertex.set(null);
    this.confirmDelete.set(null);
    this.flash(`Vértice ${v} eliminado junto con sus ${n} arista(s) incidente(s).`, 'info');
  }

  deleteEdge(): void {
    const id = this.lab.selectedEdge();
    if (!id) return;
    this.lab.update((g) => g.removeEdge(id));
    this.lab.selectedEdge.set(null);
    this.flash(`Arista ${id} eliminada.`, 'info');
  }

  clearEdges(): void {
    this.lab.setGraph(MultiGraph.withVertices(this.g().vertices), 'Grafo sin aristas');
    this.flash('Se eliminaron todas las aristas; los vértices se conservan.', 'info');
  }

  loadPreset(id: string): void {
    this.lab.loadPreset(id);
    this.connectFrom.set(null);
    this.flash(`Configuración cargada: ${PRESETS.find((p) => p.id === id)?.name}.`, 'ok');
  }

  save(): void {
    this.lab.saveConfig(this.saveName());
    this.saveName.set('');
    this.flash('Configuración guardada en este navegador.', 'ok');
  }

  load(cfg: SavedConfig): void {
    this.lab.loadConfig(cfg);
    this.flash(`Se cargó "${cfg.name}".`, 'ok');
  }

  toggleConnect(): void {
    this.connectMode.set(!this.connectMode());
    this.connectFrom.set(null);
    this.flash(this.connectMode() ? 'Modo conectar: haz clic en dos vértices para crear una arista.' : 'Modo selección.', 'info');
  }

  private flash(text: string, kind: 'ok' | 'bad' | 'info'): void {
    this.message.set({ text, kind });
  }
}
