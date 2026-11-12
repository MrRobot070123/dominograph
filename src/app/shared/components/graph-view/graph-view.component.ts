import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { MultiGraph, pairKey } from '../../../core/graph-engine/multigraph';
import { VertexId } from '../../../core/models/graph.models';
import { CANVAS, ensurePositions, Point, Positions } from '../../utils/layout';

interface EdgeShape {
  readonly id: string;
  readonly d: string;
  readonly lx: number;
  readonly ly: number;
  readonly loop: boolean;
  readonly parallel: boolean;
  readonly label: string;
}

/**
 * Visualizador SVG de multigrafos.
 * - Bucles como curvas hacia el exterior.
 * - Aristas paralelas como curvas separadas.
 * - Vértices arrastrables sin alterar las relaciones matemáticas.
 * Solo dibuja: los cálculos llegan ya hechos desde el motor.
 */
@Component({
  selector: 'app-graph-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './graph-view.component.html',
  styleUrl: './graph-view.component.css',
})
export class GraphViewComponent {
  readonly graph = input.required<MultiGraph>();
  readonly positions = input<Positions>({});
  readonly vertexClass = input<Record<number, string>>({});
  readonly edgeClass = input<Record<string, string>>({});
  readonly vertexBadge = input<Record<number, string>>({});
  readonly selectedVertex = input<VertexId | null>(null);
  readonly selectedEdge = input<string | null>(null);
  readonly showEdgeLabels = input<boolean | null>(null);
  readonly draggable = input(true);
  readonly ariaLabel = input('Visualización del grafo');

  readonly vertexClick = output<VertexId>();
  readonly edgeClick = output<string>();
  readonly vertexMove = output<{ vertex: VertexId; x: number; y: number }>();

  readonly W = CANVAS.width;
  readonly H = CANVAS.height;
  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly drag = signal<{ v: VertexId; start: Point; moved: boolean } | null>(null);
  private readonly dragPos = signal<{ v: VertexId; p: Point } | null>(null);

  readonly pos = computed<Positions>(() => {
    const base = ensurePositions(this.graph().vertices, this.positions());
    const d = this.dragPos();
    return d ? { ...base, [d.v]: d.p } : base;
  });

  readonly labelsOn = computed(() => this.showEdgeLabels() ?? this.graph().size <= 16);

  readonly vertices = computed(() => {
    const g = this.graph();
    const p = this.pos();
    return g.vertices.map((v) => ({ v, x: p[v].x, y: p[v].y, degree: g.degree(v) }));
  });

  readonly shapes = computed<EdgeShape[]>(() => {
    const g = this.graph();
    const p = this.pos();
    const groups = new Map<string, string[]>();
    for (const e of g.edges) {
      const k = pairKey(e.u, e.v);
      groups.set(k, [...(groups.get(k) ?? []), e.id]);
    }
    const cx = this.W / 2;
    const cy = this.H / 2;
    return g.edges.map((e) => {
      const group = groups.get(pairKey(e.u, e.v))!;
      const i = group.indexOf(e.id);
      const n = group.length;
      const a = p[e.u];
      const label = e.id.replace('#', ' #');
      if (e.u === e.v) {
        let dx = a.x - cx;
        let dy = a.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        [dx, dy] = len < 1 ? [0, -1] : [dx / len, dy / len];
        const s = 48 + i * 18;
        const rot = (ang: number): Point => ({ x: dx * Math.cos(ang) - dy * Math.sin(ang), y: dx * Math.sin(ang) + dy * Math.cos(ang) });
        const r1 = rot(-0.55);
        const r2 = rot(0.55);
        const d = `M${a.x},${a.y} C${a.x + r1.x * s * 1.25},${a.y + r1.y * s * 1.25} ${a.x + r2.x * s * 1.25},${a.y + r2.y * s * 1.25} ${a.x},${a.y}`;
        return { id: e.id, d, lx: a.x + dx * s * 0.98, ly: a.y + dy * s * 0.98, loop: true, parallel: n > 1, label };
      }
      const b = p[e.v];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const off = (i - (n - 1) / 2) * 30;
      const d = `M${a.x},${a.y} Q${mx + nx * off * 2},${my + ny * off * 2} ${b.x},${b.y}`;
      return { id: e.id, d, lx: mx + nx * off, ly: my + ny * off, loop: false, parallel: n > 1, label };
    });
  });

  edgeCls(s: EdgeShape): string {
    const extra = this.edgeClass()[s.id] ?? '';
    return `edge ${s.loop ? 'loop' : ''} ${s.parallel ? 'parallel' : ''} ${extra} ${this.selectedEdge() === s.id ? 'sel' : ''}`;
  }

  vertexCls(v: VertexId): string {
    return `vertex ${this.vertexClass()[v] ?? ''} ${this.selectedVertex() === v ? 'sel' : ''} ${this.draggable() ? 'drag' : ''}`;
  }

  // ------------------------------------------------------------- interacción

  onVertexDown(ev: PointerEvent, v: VertexId): void {
    ev.stopPropagation();
    this.drag.set({ v, start: this.toSvg(ev), moved: false });
    this.svg().nativeElement.setPointerCapture(ev.pointerId);
  }

  onMove(ev: PointerEvent): void {
    const d = this.drag();
    if (!d || !this.draggable()) return;
    const p = this.toSvg(ev);
    if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) < 4) return;
    if (!d.moved) this.drag.set({ ...d, moved: true });
    this.dragPos.set({ v: d.v, p: { x: clamp(p.x, 22, this.W - 22), y: clamp(p.y, 22, this.H - 22) } });
  }

  onUp(): void {
    const d = this.drag();
    const dp = this.dragPos();
    this.drag.set(null);
    if (!d) return;
    if (d.moved && dp) this.vertexMove.emit({ vertex: d.v, x: Math.round(dp.p.x), y: Math.round(dp.p.y) });
    else this.vertexClick.emit(d.v);
    this.dragPos.set(null);
  }

  onKey(ev: KeyboardEvent, kind: 'v' | 'e', id: VertexId | string): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    if (kind === 'v') this.vertexClick.emit(id as VertexId);
    else this.edgeClick.emit(id as string);
  }

  private toSvg(ev: PointerEvent): Point {
    const svg = this.svg().nativeElement;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  }
}

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}
