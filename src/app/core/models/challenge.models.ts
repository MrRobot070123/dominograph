import { MultiGraph } from '../graph-engine/multigraph';
import { Tile, VertexId } from './graph.models';

/** Respuesta del usuario según el tipo de desafío. */
export type ChallengeAnswer =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'choice'; readonly value: string }
  | { readonly kind: 'vertex-set'; readonly value: readonly VertexId[] }
  | { readonly kind: 'vertex-seq'; readonly value: readonly VertexId[] }
  | { readonly kind: 'tile-seq'; readonly value: readonly Tile[] };

export type ChallengeKind = ChallengeAnswer['kind'];

export interface ChallengeCheck {
  readonly correct: boolean;
  readonly feedback: string;
}

export interface Challenge {
  readonly id: string;
  readonly level: number;
  readonly title: string;
  readonly statement: string;
  readonly instructions: string;
  readonly kind: ChallengeKind;
  readonly points: number;
  /** Tiempo sugerido para el modo contrarreloj (segundos). */
  readonly seconds: number;
  /** Fichas de referencia (texto "a-b, …"). */
  readonly tiles: string;
  /** Vértices del grafo (por defecto, los valores que aparecen en las fichas). */
  readonly vertices?: readonly VertexId[];
  readonly options?: readonly string[];
  /** Valida la respuesta usando el motor matemático (nunca valores escritos a mano). */
  readonly check: (g: MultiGraph, a: ChallengeAnswer) => ChallengeCheck;
  /** Explicación matemática del resultado, calculada a partir del grafo. */
  readonly explain: (g: MultiGraph) => readonly string[];
}

export interface ChallengeLevel {
  readonly level: number;
  readonly name: string;
  readonly description: string;
}
