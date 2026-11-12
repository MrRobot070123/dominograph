import { VertexId } from '../../core/models/graph.models';

export interface Point {
  x: number;
  y: number;
}

export type Positions = Record<number, Point>;

/** Tamaño lógico del lienzo SVG del visualizador. */
export const CANVAS = { width: 600, height: 440 } as const;

/** Distribución circular (por defecto los vértices 0..6 forman un heptágono). */
export function circleLayout(vertices: readonly VertexId[], w = CANVAS.width, h = CANVAS.height): Positions {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.34;
  const n = Math.max(vertices.length, 1);
  const out: Positions = {};
  vertices.forEach((v, i) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    out[v] = { x: round(cx + r * Math.cos(ang)), y: round(cy + r * Math.sin(ang)) };
  });
  return out;
}

/** Distribución en rejilla, alternativa para reorganizar el grafo. */
export function gridLayout(vertices: readonly VertexId[], w = CANVAS.width, h = CANVAS.height): Positions {
  const cols = Math.ceil(Math.sqrt(vertices.length));
  const rows = Math.ceil(vertices.length / cols);
  const out: Positions = {};
  vertices.forEach((v, i) => {
    out[v] = { x: round(((i % cols) + 1) * (w / (cols + 1))), y: round((Math.floor(i / cols) + 1) * (h / (rows + 1))) };
  });
  return out;
}

/** Completa posiciones faltantes sin mover las existentes. */
export function ensurePositions(vertices: readonly VertexId[], current: Positions): Positions {
  const missing = vertices.filter((v) => !current[v]);
  if (!missing.length) return current;
  const base = circleLayout(vertices);
  const out: Positions = { ...current };
  for (const v of missing) out[v] = base[v];
  return out;
}

function round(x: number): number {
  return Math.round(x * 10) / 10;
}
