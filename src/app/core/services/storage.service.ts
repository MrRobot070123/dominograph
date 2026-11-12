import { Injectable } from '@angular/core';

/**
 * Persistencia local (localStorage) con manejo de errores.
 * Punto único de acceso a almacenamiento: al incorporar Supabase basta con
 * implementar una alternativa a este servicio.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefix = 'dominograph.';

  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  write<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible (modo privado, cuota): la app sigue funcionando en memoria */
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignorado */
    }
  }
}
