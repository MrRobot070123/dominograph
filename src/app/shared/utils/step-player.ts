import { computed, DestroyRef, inject, signal } from '@angular/core';

/**
 * Reproductor genérico de pasos para animar algoritmos
 * (reproducir, pausar, siguiente, anterior, reiniciar).
 * Debe crearse en un contexto de inyección (campo de un componente).
 */
export class StepPlayer {
  readonly total = signal(0);
  /** Índice del paso actual; -1 = aún no se ha iniciado. */
  readonly index = signal(-1);
  readonly playing = signal(false);
  readonly speed = signal(700);
  readonly atEnd = computed(() => this.index() >= this.total() - 1);
  readonly progress = computed(() => (this.total() ? Math.round(((this.index() + 1) / this.total()) * 100) : 0));
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  load(total: number, autoplay = false): void {
    this.stop();
    this.total.set(total);
    this.index.set(-1);
    if (autoplay) this.play();
  }

  play(): void {
    if (this.total() === 0) return;
    if (this.atEnd()) this.index.set(-1);
    this.stop();
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (this.atEnd()) this.stop();
      else this.index.update((i) => i + 1);
    }, this.speed());
  }

  pause(): void {
    this.stop();
  }

  next(): void {
    this.stop();
    if (!this.atEnd()) this.index.update((i) => i + 1);
  }

  prev(): void {
    this.stop();
    if (this.index() > -1) this.index.update((i) => i - 1);
  }

  reset(): void {
    this.stop();
    this.index.set(-1);
  }

  end(): void {
    this.stop();
    this.index.set(this.total() - 1);
  }

  setSpeed(ms: number): void {
    this.speed.set(ms);
    if (this.playing()) this.play();
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing.set(false);
  }
}
