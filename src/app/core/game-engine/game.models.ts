import { Tile } from '../models/graph.models';

export type PlayerId = 'human' | 'cpu';
export type Side = 'left' | 'right';

/** Regla de salida. */
export type StartRule = 'highest-double' | 'human-first' | 'cpu-first';
/** Comportamiento del pozo cuando un jugador no puede jugar. */
export type DrawRule = 'draw-until-playable' | 'draw-one' | 'no-draw';
export type AiLevel = 'basico' | 'estrategico' | 'experto';

export interface GameRules {
  readonly maxPip: number;
  readonly handSize: number;
  readonly startRule: StartRule;
  readonly drawRule: DrawRule;
}

export const DEFAULT_RULES: GameRules = {
  maxPip: 6,
  handSize: 7,
  startRule: 'highest-double',
  drawRule: 'draw-until-playable',
};

/** Ficha colocada en la mesa, orientada de izquierda a derecha. */
export interface PlacedTile {
  readonly tile: Tile;
  readonly left: number;
  readonly right: number;
  readonly by: PlayerId;
  readonly turn: number;
}

export interface Move {
  readonly tileId: string;
  readonly side: Side;
}

export interface GameEvent {
  readonly turn: number;
  readonly player: PlayerId;
  readonly kind: 'play' | 'draw' | 'pass';
  readonly tileId?: string;
  readonly side?: Side;
  readonly message: string;
}

export interface GameResult {
  readonly winner: PlayerId | null;
  readonly reason: 'domino' | 'blocked';
  /** Suma de puntos que quedaron en cada mano. */
  readonly remaining: Readonly<Record<PlayerId, number>>;
  /** Puntos que obtiene el ganador. */
  readonly score: number;
  readonly message: string;
}

export interface GameState {
  readonly rules: GameRules;
  readonly hands: Readonly<Record<PlayerId, readonly Tile[]>>;
  readonly boneyard: readonly Tile[];
  readonly chain: readonly PlacedTile[];
  readonly current: PlayerId;
  /** Si la partida empieza con una ficha obligatoria (p. ej. el doble más alto). */
  readonly openingTileId: string | null;
  readonly consecutivePasses: number;
  readonly drawsThisTurn: number;
  readonly turn: number;
  readonly status: 'playing' | 'finished';
  readonly result: GameResult | null;
  readonly history: readonly GameEvent[];
  /** Valores que cada jugador demostró no tener (robó o pasó con esos extremos). */
  readonly knownMissing: Readonly<Record<PlayerId, readonly number[]>>;
}
