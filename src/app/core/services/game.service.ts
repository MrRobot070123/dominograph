import { computed, inject, Injectable, signal } from '@angular/core';
import { AiDecision, chooseMove } from '../game-engine/ai';
import { canDraw, canPass, chainEnds, createGame, drawTile, legalMoves, passTurn, playMove } from '../game-engine/game-engine';
import { AiLevel, DEFAULT_RULES, GameRules, GameState, Move, Side } from '../game-engine/game.models';
import { ProgressService } from './progress.service';
import { StorageService } from './storage.service';

export interface GameSettings extends GameRules {
  readonly aiLevel: AiLevel;
}

/**
 * Lógica de aplicación del juego: mantiene el estado, coordina los turnos de
 * la computadora y registra estadísticas. Las reglas viven en el motor puro.
 * Es un servicio raíz para que la partida sobreviva al navegar al laboratorio.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly progress = inject(ProgressService);
  private readonly storage = inject(StorageService);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly settings = signal<GameSettings>(this.storage.read('game.settings', { ...DEFAULT_RULES, aiLevel: 'estrategico' as AiLevel }));
  readonly state = signal<GameState>(createGame(this.settings()));
  readonly lastDecision = signal<AiDecision | null>(null);
  readonly cpuThinking = signal(false);
  readonly selectedTile = signal<string | null>(null);
  readonly hint = signal<AiDecision | null>(null);
  readonly lastPlayedId = signal<string | null>(null);

  readonly ends = computed(() => chainEnds(this.state()));
  readonly humanTurn = computed(() => this.state().status === 'playing' && this.state().current === 'human' && !this.cpuThinking());
  readonly humanMoves = computed(() => (this.humanTurn() ? legalMoves(this.state(), 'human') : []));
  readonly playableIds = computed(() => new Set(this.humanMoves().map((m) => m.tileId)));
  readonly selectedSides = computed<Side[]>(() => {
    const id = this.selectedTile();
    return id ? this.humanMoves().filter((m) => m.tileId === id).map((m) => m.side) : [];
  });
  readonly canDraw = computed(() => this.humanTurn() && canDraw(this.state()));
  readonly canPass = computed(() => this.humanTurn() && canPass(this.state()));

  constructor() {
    this.scheduleCpu();
  }

  newGame(settings?: GameSettings): void {
    this.clearTimer();
    if (settings) {
      this.settings.set(settings);
      this.storage.write('game.settings', settings);
    }
    this.state.set(createGame(this.settings()));
    this.lastDecision.set(null);
    this.selectedTile.set(null);
    this.hint.set(null);
    this.lastPlayedId.set(null);
    this.cpuThinking.set(false);
    this.scheduleCpu();
  }

  select(tileId: string): void {
    this.selectedTile.set(this.selectedTile() === tileId ? null : tileId);
  }

  cancelSelection(): void {
    this.selectedTile.set(null);
  }

  playHuman(side: Side): void {
    const id = this.selectedTile();
    if (!id || !this.humanTurn()) return;
    this.apply(playMove(this.state(), { tileId: id, side }));
    this.lastPlayedId.set(id);
    this.selectedTile.set(null);
    this.hint.set(null);
  }

  /** Coloca directamente una jugada (usado al hacer doble clic o arrastrar). */
  playMoveHuman(m: Move): void {
    if (!this.humanTurn()) return;
    this.apply(playMove(this.state(), m));
    this.lastPlayedId.set(m.tileId);
    this.selectedTile.set(null);
    this.hint.set(null);
  }

  drawHuman(): void {
    if (this.canDraw()) this.apply(drawTile(this.state()));
  }

  passHuman(): void {
    if (this.canPass()) this.apply(passTurn(this.state()));
  }

  showHint(): void {
    if (!this.humanTurn() || !this.humanMoves().length) return;
    const d = chooseMove(this.state(), 'estrategico');
    this.hint.set(d);
    if (d) this.selectedTile.set(d.move.tileId);
  }

  private apply(next: GameState): void {
    const wasPlaying = this.state().status === 'playing';
    this.state.set(next);
    if (wasPlaying && next.status === 'finished' && next.result) {
      this.progress.recordGame(next.result.winner, next.result.score);
    }
    this.scheduleCpu();
  }

  /** Programa el turno de la computadora con una pausa para que sea visible. */
  private scheduleCpu(): void {
    const s = this.state();
    if (s.status !== 'playing' || s.current !== 'cpu') return;
    this.clearTimer();
    this.cpuThinking.set(true);
    this.timer = setTimeout(() => this.cpuStep(), 750);
  }

  private cpuStep(): void {
    const s = this.state();
    if (s.status !== 'playing' || s.current !== 'cpu') {
      this.cpuThinking.set(false);
      return;
    }
    const decision = chooseMove(s, this.settings().aiLevel);
    if (decision) {
      this.lastDecision.set(decision);
      this.lastPlayedId.set(decision.move.tileId);
      this.cpuThinking.set(false);
      this.apply(playMove(s, decision.move));
    } else if (canDraw(s)) {
      this.state.set(drawTile(s));
      this.timer = setTimeout(() => this.cpuStep(), 450);
    } else {
      this.cpuThinking.set(false);
      this.apply(passTurn(s));
    }
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
