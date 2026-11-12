/**
 * Modelos fundamentales del motor matemático de DOMINOGRAPH.
 * No dependen de Angular ni del DOM.
 */

/** Identificador de un vértice (en el dominó, el valor de una mitad de ficha). */
export type VertexId = number;

/** Ficha de dominó. Se normaliza para que a <= b. */
export interface Tile {
  /** Identificador único, p. ej. "2-5" o "1-3#2" para una ficha repetida. */
  readonly id: string;
  readonly a: number;
  readonly b: number;
}

/** Arista de un multigrafo no dirigido. Cada arista conserva su identidad. */
export interface GraphEdge {
  readonly id: string;
  readonly u: VertexId;
  readonly v: VertexId;
}

/** Representación serializable de un multigrafo. */
export interface GraphData {
  readonly vertices: readonly VertexId[];
  readonly edges: readonly GraphEdge[];
}

/** Matriz de adyacencia: A[i][j] = nº de aristas entre i y j; A[i][i] = nº de bucles en i. */
export interface AdjacencyMatrix {
  readonly labels: readonly VertexId[];
  readonly matrix: readonly (readonly number[])[];
}

export interface AdjacencyEntry {
  readonly neighbor: VertexId;
  readonly edgeId: string;
  readonly isLoop: boolean;
}

export interface AdjacencyListRow {
  readonly vertex: VertexId;
  readonly entries: readonly AdjacencyEntry[];
}

/** Paso de un recorrido BFS/DFS, usado para la animación paso a paso. */
export interface TraversalStep {
  readonly kind: 'start' | 'visit' | 'discover' | 'skip' | 'backtrack' | 'done';
  readonly vertex: VertexId;
  readonly from?: VertexId;
  readonly edgeId?: string;
  /** Contenido de la cola (BFS) o pila (DFS) después del paso. */
  readonly frontier: readonly VertexId[];
  readonly visited: readonly VertexId[];
  readonly message: string;
}

export interface TraversalResult {
  readonly algorithm: 'BFS' | 'DFS';
  readonly start: VertexId;
  readonly order: readonly VertexId[];
  readonly treeEdges: readonly string[];
  readonly unreachable: readonly VertexId[];
  readonly steps: readonly TraversalStep[];
  /** Distancia (en aristas) desde el origen; solo significativa en BFS. */
  readonly distance: ReadonlyMap<VertexId, number>;
}

/** Recorrido euleriano: secuencia de vértices y de aristas utilizadas. */
export interface Trail {
  readonly vertices: readonly VertexId[];
  readonly edges: readonly string[];
  readonly closed: boolean;
}

export type EulerKind = 'circuit' | 'path' | 'none' | 'empty';

export interface EulerAnalysis {
  readonly kind: EulerKind;
  readonly oddVertices: readonly VertexId[];
  readonly degrees: ReadonlyMap<VertexId, number>;
  /** Componentes conexas que contienen al menos una arista. */
  readonly edgeComponents: number;
  readonly isolatedVertices: readonly VertexId[];
  readonly edgesConnected: boolean;
  /** Vértice recomendado para iniciar el recorrido. */
  readonly start: VertexId | null;
  readonly end: VertexId | null;
  /** Explicación matemática paso a paso. */
  readonly reasons: readonly string[];
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
