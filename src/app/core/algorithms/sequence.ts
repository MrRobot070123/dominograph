import { MultiGraph } from '../graph-engine/multigraph';
import { Tile, VertexId } from '../models/graph.models';
import { ChainLink } from './backtracking';

export interface SequenceValidation {
  readonly valid: boolean;
  readonly links: readonly ChainLink[];
  readonly errors: readonly string[];
  readonly closed: boolean;
  readonly usesAllEdges: boolean;
}

/**
 * Valida una secuencia de fichas como cadena de dominó dentro de un grafo.
 * Orienta cada ficha para que su primer valor coincida con el extremo libre
 * de la anterior y verifica que no se repitan fichas.
 * Complejidad: O(k) para k fichas.
 */
export function validateTileSequence(g: MultiGraph, tiles: readonly Tile[], start?: VertexId): SequenceValidation {
  const errors: string[] = [];
  const links: ChainLink[] = [];
  const used = new Set<string>();
  let end: VertexId | undefined = start;

  tiles.forEach((t, k) => {
    const e = g.edge(t.id);
    if (!e) {
      errors.push(`La ficha ${t.id} no pertenece al conjunto.`);
      return;
    }
    if (used.has(t.id)) errors.push(`La ficha ${t.id} se usa más de una vez.`);
    used.add(t.id);
    if (end === undefined) {
      // La primera ficha se orienta según la siguiente, si es posible.
      const next = tiles[k + 1];
      const flip = next !== undefined && !(next.a === t.b || next.b === t.b) && (next.a === t.a || next.b === t.a);
      const from = flip ? t.b : t.a;
      const to = flip ? t.a : t.b;
      links.push({ edgeId: t.id, from, to });
      end = to;
      return;
    }
    if (t.a === end) {
      links.push({ edgeId: t.id, from: t.a, to: t.b });
      end = t.b;
    } else if (t.b === end) {
      links.push({ edgeId: t.id, from: t.b, to: t.a });
      end = t.a;
    } else {
      errors.push(`La ficha ${t.id} no encaja con el extremo ${end} (posición ${k + 1}).`);
    }
  });

  const closed = links.length > 0 && links[0].from === links[links.length - 1].to;
  return { valid: errors.length === 0 && links.length > 0, links, errors, closed, usesAllEdges: used.size === g.size };
}
