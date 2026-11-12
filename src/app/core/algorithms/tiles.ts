import { Tile } from '../models/graph.models';

/**
 * Genera el conjunto completo de fichas de un dominó doble-n.
 * Cada ficha se produce una sola vez mediante 0 <= a <= b <= n.
 *
 * Entrada: maxPip (6 para doble-seis). Salida: (n+1)(n+2)/2 fichas.
 * Complejidad: O(n²) tiempo y espacio.
 */
export function generateTileSet(maxPip = 6): Tile[] {
  if (!Number.isInteger(maxPip) || maxPip < 0 || maxPip > 18) {
    throw new Error('maxPip debe ser un entero entre 0 y 18.');
  }
  const tiles: Tile[] = [];
  for (let a = 0; a <= maxPip; a++) {
    for (let b = a; b <= maxPip; b++) tiles.push(makeTile(a, b));
  }
  return tiles;
}

/** Crea una ficha normalizada (a <= b). */
export function makeTile(x: number, y: number, id?: string): Tile {
  const a = Math.min(x, y);
  const b = Math.max(x, y);
  return { id: id ?? `${a}-${b}`, a, b };
}

export function isDouble(t: Tile): boolean {
  return t.a === t.b;
}

export function pipSum(t: Tile): number {
  return t.a + t.b;
}

export function tileLabel(t: Tile): string {
  return `${t.a}-${t.b}`;
}

/** Número teórico de fichas de un dominó doble-n. */
export function expectedTileCount(maxPip: number): number {
  return ((maxPip + 1) * (maxPip + 2)) / 2;
}

/**
 * Interpreta un texto como "0-1, 1-2, 3-3" y devuelve las fichas.
 * Las fichas repetidas reciben ids únicos (1-3, 1-3#2…).
 */
export function parseTiles(text: string): Tile[] {
  const out: Tile[] = [];
  const seen = new Map<string, number>();
  for (const raw of text.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d{1,2})[-|:](\d{1,2})$/.exec(raw.trim());
    if (!m) throw new Error(`Ficha no válida: "${raw}". Usa el formato a-b.`);
    const t = makeTile(Number(m[1]), Number(m[2]));
    const n = (seen.get(t.id) ?? 0) + 1;
    seen.set(t.id, n);
    out.push(n === 1 ? t : makeTile(t.a, t.b, `${t.id}#${n}`));
  }
  return out;
}
