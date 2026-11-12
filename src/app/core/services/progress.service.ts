import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export interface Activity {
  readonly at: number;
  readonly kind: 'juego' | 'laboratorio' | 'desafio';
  readonly text: string;
}

export interface ProgressData {
  games: { played: number; won: number; lost: number; drawn: number; points: number };
  challenges: Record<string, { score: number; at: number }>;
  algorithms: Record<string, number>;
  activity: Activity[];
}

const EMPTY: ProgressData = {
  games: { played: 0, won: 0, lost: 0, drawn: 0, points: 0 },
  challenges: {},
  algorithms: {},
  activity: [],
};

/** Estadísticas, progreso de aprendizaje y actividad reciente del usuario. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<ProgressData>(this.load());

  readonly data = this.state.asReadonly();
  readonly challengePoints = computed(() => Object.values(this.state().challenges).reduce((s, c) => s + c.score, 0));
  readonly challengesDone = computed(() => Object.keys(this.state().challenges).length);
  readonly algorithmsRun = computed(() => Object.values(this.state().algorithms).reduce((s, n) => s + n, 0));

  recordGame(winner: 'human' | 'cpu' | null, points: number): void {
    this.update((d) => {
      d.games.played++;
      if (winner === 'human') {
        d.games.won++;
        d.games.points += points;
      } else if (winner === 'cpu') d.games.lost++;
      else d.games.drawn++;
      this.push(d, 'juego', winner === 'human' ? `Ganaste una partida (+${points} puntos)` : winner === 'cpu' ? 'Perdiste una partida contra la CPU' : 'Partida empatada');
    });
  }

  recordChallenge(id: string, title: string, score: number): void {
    this.update((d) => {
      const prev = d.challenges[id]?.score ?? 0;
      d.challenges[id] = { score: Math.max(prev, score), at: Date.now() };
      this.push(d, 'desafio', `Desafío resuelto: ${title} (${score} pts)`);
    });
  }

  recordAlgorithm(name: string): void {
    this.update((d) => {
      d.algorithms[name] = (d.algorithms[name] ?? 0) + 1;
      this.push(d, 'laboratorio', `Ejecutaste ${name} en el laboratorio`);
    });
  }

  challengeScore(id: string): number | null {
    return this.state().challenges[id]?.score ?? null;
  }

  reset(): void {
    this.state.set(structuredClone(EMPTY));
    this.storage.write('progress', this.state());
  }

  private push(d: ProgressData, kind: Activity['kind'], text: string): void {
    const last = d.activity[0];
    if (last && last.text === text && Date.now() - last.at < 60_000) return;
    d.activity.unshift({ at: Date.now(), kind, text });
    d.activity = d.activity.slice(0, 20);
  }

  private update(fn: (d: ProgressData) => void): void {
    const copy = structuredClone(this.state());
    fn(copy);
    this.state.set(copy);
    this.storage.write('progress', copy);
  }

  private load(): ProgressData {
    const d = this.storage.read<ProgressData>('progress', structuredClone(EMPTY));
    return { ...structuredClone(EMPTY), ...d, games: { ...EMPTY.games, ...d.games } };
  }
}
