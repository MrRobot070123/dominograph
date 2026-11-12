import { ErrorHandler, Injectable, signal } from '@angular/core';

/** Manejo centralizado de errores: registra y expone un mensaje comprensible. */
@Injectable({ providedIn: 'root' })
export class AppErrorHandler implements ErrorHandler {
  static readonly lastError = signal<string | null>(null);

  handleError(error: unknown): void {
    console.error(error);
    const msg = error instanceof Error ? error.message : String(error);
    AppErrorHandler.lastError.set(`Ocurrió un error inesperado: ${msg}`);
  }
}
