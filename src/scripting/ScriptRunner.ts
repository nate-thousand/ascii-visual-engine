import { ScriptAPI } from './ScriptAPI';
import type {
  ScriptContext,
  ScriptEngineBridge,
  ScriptLogEntry,
  ScriptModule,
  ScriptState,
} from './ScriptTypes';
import { createScriptContext } from './ScriptTypes';

export interface ScriptRunnerOptions {
  maxLogs?: number;
}

export class ScriptRunner {
  private api: ScriptAPI | null = null;
  private ctx: ScriptContext = createScriptContext(0, 0, 0);
  private module: ScriptModule | null = null;
  private state: ScriptState = 'idle';
  private error: string | null = null;
  private logs: ScriptLogEntry[] = [];
  private frameCount = 0;
  private enabled = true;
  private maxLogs: number;

  constructor(
    private bridge: ScriptEngineBridge,
    options: ScriptRunnerOptions = {},
  ) {
    this.maxLogs = options.maxLogs ?? 200;
  }

  getState(): ScriptState {
    return this.state;
  }

  getError(): string | null {
    return this.error;
  }

  getLogs(): ScriptLogEntry[] {
    return [...this.logs];
  }

  getContext(): ScriptContext {
    return this.ctx;
  }

  getModule(): ScriptModule | null {
    return this.module;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    this.state = value && this.module ? 'running' : this.module ? 'paused' : 'idle';
  }

  clearLogs(): void {
    this.logs = [];
  }

  async start(module: ScriptModule): Promise<void> {
    await this.stop();
    this.module = module;
    this.error = null;
    this.frameCount = 0;
    this.ctx = createScriptContext(this.bridge.getTime(), 0, 0);

    this.api = new ScriptAPI(this.bridge, (entry) => this.pushLog(entry));

    try {
      this.state = 'running';
      await this.module.init?.(this.api, this.ctx);
    } catch (err) {
      this.state = 'error';
      this.error = err instanceof Error ? err.message : String(err);
      this.pushLog({ level: 'error', message: this.error, timestamp: Date.now() });
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.api && this.module) {
      try {
        this.module.destroy?.(this.api, this.ctx);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.pushLog({ level: 'error', message: `destroy: ${msg}`, timestamp: Date.now() });
      }
    }
    this.api?.destroy();
    this.api = null;
    this.module = null;
    this.state = 'idle';
    this.error = null;
  }

  async restart(module: ScriptModule): Promise<void> {
    await this.start(module);
  }

  onTick(dt: number, time: number): void {
    if (!this.enabled || !this.api || !this.module || this.state === 'error') return;

    this.ctx.time = time;
    this.ctx.dt = dt;
    this.ctx.frame = this.frameCount++;

    try {
      this.api.tickAnimations(this.ctx);
      this.module.update?.(this.api, this.ctx, dt);
    } catch (err) {
      this.state = 'error';
      this.error = err instanceof Error ? err.message : String(err);
      this.pushLog({ level: 'error', message: this.error, timestamp: Date.now() });
    }
  }

  onEvent(event: string, data: unknown): void {
    if (!this.enabled || !this.api || !this.module) return;
    try {
      this.module.onEvent?.(this.api, this.ctx, event, data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.pushLog({ level: 'error', message: `onEvent(${event}): ${msg}`, timestamp: Date.now() });
    }
  }

  private pushLog(entry: ScriptLogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
  }
}
