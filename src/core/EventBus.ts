import type { EngineEventMap, EngineEventName } from './types';

type Listener<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<K extends EngineEventName>(
    event: K,
    listener: Listener<EngineEventMap[K]>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener as Listener<unknown>);

    return () => this.off(event, listener);
  }

  off<K extends EngineEventName>(
    event: K,
    listener: Listener<EngineEventMap[K]>,
  ): void {
    this.listeners.get(event as string)?.delete(listener as Listener<unknown>);
  }

  emit<K extends EngineEventName>(event: K, payload: EngineEventMap[K]): void {
    const set = this.listeners.get(event as string);
    if (!set) return;
    for (const listener of set) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
