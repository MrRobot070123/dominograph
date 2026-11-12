import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { validateTileSequence } from '../../core/algorithms/sequence';
import { parseTiles } from '../../core/algorithms/tiles';
import { ChallengeAnswer, ChallengeCheck } from '../../core/models/challenge.models';
import { Tile, VertexId } from '../../core/models/graph.models';
import { ProgressService } from '../../core/services/progress.service';
import { DominoTileComponent } from '../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../shared/components/graph-view/graph-view.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { circleLayout } from '../../shared/utils/layout';
import { CHALLENGES, challengeGraph, LEVELS } from './challenge-bank';

/** Resolución de un desafío: enunciado, interacción, validación y explicación. */
@Component({
  selector: 'app-challenge-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraphViewComponent, DominoTileComponent, RouterLink, IconComponent],
  templateUrl: './challenge-player.component.html',
  styleUrl: './challenge-player.component.css',
})
export class ChallengePlayerComponent {
  /** Parámetro de ruta :id (enlazado por withComponentInputBinding). */
  readonly id = input<string>('');
  private readonly progress = inject(ProgressService);
  readonly total = CHALLENGES.length;

  readonly challenge = computed(() => CHALLENGES.find((c) => c.id === this.id()) ?? CHALLENGES[0]);
  readonly index = computed(() => CHALLENGES.indexOf(this.challenge()));
  readonly level = computed(() => LEVELS.find((l) => l.level === this.challenge().level)!);
  readonly graph = computed(() => challengeGraph(this.challenge()));
  readonly tiles = computed(() => parseTiles(this.challenge().tiles));
  readonly positions = computed(() => circleLayout(this.graph().vertices));
  readonly prev = computed(() => CHALLENGES[this.index() - 1] ?? null);
  readonly next = computed(() => CHALLENGES[this.index() + 1] ?? null);
  readonly best = computed(() => this.progress.data().challenges[this.challenge().id]?.score ?? null);

  // estado de la respuesta
  readonly numberValue = signal<number | null>(null);
  readonly choiceValue = signal<string | null>(null);
  readonly vertexSet = signal<VertexId[]>([]);
  readonly vertexSeq = signal<VertexId[]>([]);
  readonly tileSeq = signal<Tile[]>([]);
  readonly attempts = signal(0);
  readonly result = signal<ChallengeCheck | null>(null);
  readonly solved = signal(false);
  readonly showExplanation = signal(false);
  readonly earned = signal(0);

  // modo contrarreloj
  readonly timed = signal(false);
  readonly remaining = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly explanation = computed(() => this.challenge().explain(this.graph()));
  readonly vertexClass = computed(() => {
    const out: Record<number, string> = {};
    const k = this.challenge().kind;
    if (k === 'vertex-set') for (const v of this.vertexSet()) out[v] = 'inpath';
    if (k === 'vertex-seq') {
      for (const v of this.vertexSeq()) out[v] = 'inpath';
      const s = this.vertexSeq();
      if (s.length) out[s[s.length - 1]] = 'current';
    }
    return out;
  });
  readonly badges = computed(() => {
    const out: Record<number, string> = {};
    if (this.challenge().kind === 'vertex-seq') this.vertexSeq().forEach((v, i) => (out[v] = out[v] ? `${out[v]},${i + 1}` : `${i + 1}`));
    return out;
  });
  readonly usedTiles = computed(() => new Set(this.tileSeq().map((t) => t.id)));
  /** Cadena orientada (como se vería en la mesa) cuando las fichas encajan. */
  readonly orientedChain = computed(() => {
    const v = validateTileSequence(this.graph(), this.tileSeq());
    return v.valid ? v.links.map((l) => ({ id: l.edgeId, a: l.from, b: l.to, ok: true })) : this.tileSeq().map((t) => ({ id: t.id, a: t.a, b: t.b, ok: false }));
  });

  constructor() {
    effect(() => {
      this.challenge();
      untracked(() => this.reset());
    });
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  reset(): void {
    this.numberValue.set(null);
    this.choiceValue.set(null);
    this.vertexSet.set([]);
    this.vertexSeq.set([]);
    this.tileSeq.set([]);
    this.attempts.set(0);
    this.result.set(null);
    this.solved.set(false);
    this.showExplanation.set(false);
    this.earned.set(0);
    this.stopTimer();
    if (this.timed()) this.startTimer();
  }

  toggleTimed(): void {
    this.timed.set(!this.timed());
    this.reset();
  }

  onVertex(v: VertexId): void {
    if (this.solved()) return;
    const k = this.challenge().kind;
    if (k === 'vertex-set') this.vertexSet.update((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
    if (k === 'vertex-seq') this.vertexSeq.update((s) => [...s, v]);
  }

  pickTile(t: Tile): void {
    if (this.solved() || this.usedTiles().has(t.id)) return;
    this.tileSeq.update((s) => [...s, t]);
  }

  answer(): ChallengeAnswer | null {
    switch (this.challenge().kind) {
      case 'number': return this.numberValue() === null ? null : { kind: 'number', value: this.numberValue()! };
      case 'choice': return this.choiceValue() === null ? null : { kind: 'choice', value: this.choiceValue()! };
      case 'vertex-set': return { kind: 'vertex-set', value: this.vertexSet() };
      case 'vertex-seq': return this.vertexSeq().length ? { kind: 'vertex-seq', value: this.vertexSeq() } : null;
      case 'tile-seq': return this.tileSeq().length ? { kind: 'tile-seq', value: this.tileSeq() } : null;
    }
  }

  submit(): void {
    const a = this.answer();
    if (!a || this.solved()) return;
    const c = this.challenge();
    const r = c.check(this.graph(), a);
    this.attempts.update((n) => n + 1);
    this.result.set(r);
    if (r.correct) {
      this.solved.set(true);
      this.showExplanation.set(true);
      this.stopTimer();
      const factor = Math.max(0.25, 1 - 0.25 * (this.attempts() - 1));
      const bonus = this.timed() && this.remaining() > 0 ? 1.2 : 1;
      const pts = Math.min(Math.round(c.points * factor * bonus), Math.round(c.points * 1.2));
      this.earned.set(pts);
      this.progress.recordChallenge(c.id, c.title, pts);
    } else if (this.attempts() >= 2) {
      this.showExplanation.set(true);
    }
  }

  private startTimer(): void {
    this.remaining.set(this.challenge().seconds);
    this.timer = setInterval(() => {
      this.remaining.update((r) => Math.max(0, r - 1));
      if (this.remaining() === 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
