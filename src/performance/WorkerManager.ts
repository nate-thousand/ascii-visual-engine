import type { WorkerStatus } from './PerformanceTypes';

export type WorkerTaskType = 'simulation' | 'source' | 'export' | 'imageProcessing';

export interface WorkerTask<T = unknown, R = unknown> {
  id: string;
  type: WorkerTaskType;
  payload: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export class WorkerManager {
  private enabled = false;
  private workers: Worker[] = [];
  private queue: WorkerTask[] = [];
  private completedTasks = 0;
  private lastTaskMs = 0;

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.terminateWorkers();
  }

  isEnabled(): boolean {
    return this.enabled && typeof Worker !== 'undefined';
  }

  init(count = 2): void {
    if (!this.isEnabled() || this.workers.length > 0) return;
    for (let i = 0; i < count; i++) {
      try {
        const worker = this.createInlineWorker();
        worker.onmessage = (ev) => this.handleMessage(ev.data);
        worker.onerror = () => {};
        this.workers.push(worker);
      } catch {
        this.enabled = false;
        break;
      }
    }
  }

  submit<T, R>(type: WorkerTaskType, payload: T): Promise<R> {
    if (!this.isEnabled() || this.workers.length === 0) {
      return Promise.resolve(this.runSyncFallback(type, payload) as R);
    }

    return new Promise<R>((resolve, reject) => {
      this.queue.push({
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        payload,
        resolve: resolve as (r: unknown) => void,
        reject,
      });
      this.dispatchNext();
    });
  }

  getStatus(): WorkerStatus {
    return {
      enabled: this.isEnabled(),
      workerCount: this.workers.length,
      pendingTasks: this.queue.length,
      completedTasks: this.completedTasks,
      lastTaskMs: this.lastTaskMs,
    };
  }

  destroy(): void {
    this.terminateWorkers();
    this.queue.length = 0;
  }

  private dispatchNext(): void {
    if (this.queue.length === 0 || this.workers.length === 0) return;
    const task = this.queue.shift()!;
    const worker = this.workers[this.completedTasks % this.workers.length];
    const start = performance.now();
    worker.postMessage({ taskId: task.id, type: task.type, payload: task.payload });
    const onResult = (data: { taskId: string; result?: unknown; error?: string }) => {
      if (data.taskId !== task.id) return;
      this.lastTaskMs = performance.now() - start;
      this.completedTasks++;
      if (data.error) task.reject(new Error(data.error));
      else task.resolve(data.result);
      this.dispatchNext();
    };
    const handler = (ev: MessageEvent) => {
      if (ev.data?.taskId === task.id) {
        worker.removeEventListener('message', handler);
        onResult(ev.data);
      }
    };
    worker.addEventListener('message', handler);
  }

  private handleMessage(_data: unknown): void {
    // Handled per-task listeners in dispatchNext
  }

  private runSyncFallback<T>(type: WorkerTaskType, payload: T): unknown {
    switch (type) {
      case 'export':
        return payload;
      case 'simulation':
        return payload;
      case 'source':
        return payload;
      case 'imageProcessing':
        return payload;
      default:
        return payload;
    }
  }

  private createInlineWorker(): Worker {
    const blob = new Blob(
      [
        `self.onmessage = function(e) {
          var msg = e.data;
          var result = msg.payload;
          try {
            if (msg.type === 'imageProcessing' && result && result.data) {
              result.processed = true;
            }
          } catch (err) {
            self.postMessage({ taskId: msg.taskId, error: String(err) });
            return;
          }
          self.postMessage({ taskId: msg.taskId, result: result });
        };`,
      ],
      { type: 'application/javascript' },
    );
    return new Worker(URL.createObjectURL(blob));
  }

  private terminateWorkers(): void {
    for (const w of this.workers) w.terminate();
    this.workers.length = 0;
  }
}
