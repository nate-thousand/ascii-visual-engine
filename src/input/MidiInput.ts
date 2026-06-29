import type { InputEvent, MidiDeviceInfo } from './InputTypes';

export interface MidiInputState {
  connected: boolean;
  deviceId: string | null;
  deviceName: string | null;
  error: string | null;
  accessGranted: boolean;
}

export class MidiInput {
  private access: MIDIAccess | null = null;
  private port: globalThis.MIDIInput | null = null;
  private deviceId: string | null = null;
  private deviceName: string | null = null;
  private error: string | null = null;
  private queue: InputEvent[] = [];
  private onMessage: ((event: InputEvent) => void) | null = null;
  private stateChangeHandler: (() => void) | null = null;

  async requestAccess(): Promise<{ ok: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      const message = 'Web MIDI API is not supported in this browser';
      this.error = message;
      return { ok: false, error: message };
    }

    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.error = null;
      this.stateChangeHandler = () => this.onStateChange?.();
      this.access.addEventListener('statechange', this.stateChangeHandler);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MIDI access denied';
      this.error = message;
      return { ok: false, error: message };
    }
  }

  onStateChange: (() => void) | null = null;

  listDevices(): MidiDeviceInfo[] {
    if (!this.access) return [];
    const devices: MidiDeviceInfo[] = [];
    for (const input of this.access.inputs.values()) {
      devices.push({
        id: input.id,
        name: input.name ?? 'Unknown Device',
        manufacturer: input.manufacturer ?? '',
        state: input.state,
        connection: input.connection,
      });
    }
    return devices;
  }

  async connect(deviceId?: string): Promise<{ ok: boolean; error?: string }> {
    this.disconnect();

    if (!this.access) {
      const access = await this.requestAccess();
      if (!access.ok) return access;
    }

    const inputs = this.listDevices();
    if (inputs.length === 0) {
      const message = 'No MIDI input devices detected';
      this.error = message;
      return { ok: false, error: message };
    }

    const targetId = deviceId ?? inputs[0].id;
    const port = this.access!.inputs.get(targetId);
    if (!port) {
      const message = `MIDI device "${targetId}" not found`;
      this.error = message;
      return { ok: false, error: message };
    }

    port.onmidimessage = (msg) => this.handleMessage(msg);
    this.port = port;
    this.deviceId = targetId;
    this.deviceName = port.name ?? 'MIDI Device';
    this.error = null;
    return { ok: true };
  }

  disconnect(): void {
    if (this.port) {
      this.port.onmidimessage = null;
    }
    this.port = null;
    this.deviceId = null;
    this.deviceName = null;
    this.queue = [];
  }

  destroy(): void {
    this.disconnect();
    if (this.access && this.stateChangeHandler) {
      this.access.removeEventListener('statechange', this.stateChangeHandler);
    }
    this.access = null;
    this.onMessage = null;
    this.onStateChange = null;
  }

  setMessageHandler(handler: (event: InputEvent) => void): void {
    this.onMessage = handler;
  }

  drainQueue(): InputEvent[] {
    const events = this.queue;
    this.queue = [];
    return events;
  }

  getState(): MidiInputState {
    return {
      connected: this.port !== null,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      error: this.error,
      accessGranted: this.access !== null,
    };
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  private handleMessage(msg: MIDIMessageEvent): void {
    const data = msg.data;
    if (!data || data.length === 0) return;

    const status = data[0];
    const channel = status & 0x0f;
    const command = status & 0xf0;
    const timestamp = performance.now();

    let event: InputEvent | null = null;

    switch (command) {
      case 0x90: {
        const note = data[1];
        const velocity = data[2];
        if (velocity === 0) {
          event = { type: 'noteOff', source: 'midi', channel, note, velocity: 0, timestamp };
        } else {
          event = { type: 'noteOn', source: 'midi', channel, note, velocity, timestamp };
        }
        break;
      }
      case 0x80:
        event = {
          type: 'noteOff',
          source: 'midi',
          channel,
          note: data[1],
          velocity: data[2] ?? 0,
          timestamp,
        };
        break;
      case 0xb0:
        event = {
          type: 'controlChange',
          source: 'midi',
          channel,
          controller: data[1],
          value: data[2],
          timestamp,
        };
        break;
      case 0xe0: {
        const value = (data[2] << 7) + data[1];
        const pitchBend = (value - 8192) / 8192;
        event = { type: 'pitchBend', source: 'midi', channel, pitchBend, timestamp };
        break;
      }
      case 0xa0:
        event = {
          type: 'aftertouch',
          source: 'midi',
          channel,
          note: data[1],
          pressure: data[2] / 127,
          timestamp,
        };
        break;
      case 0xd0:
        event = {
          type: 'aftertouch',
          source: 'midi',
          channel,
          pressure: data[1] / 127,
          timestamp,
        };
        break;
    }

    if (!event) return;
    this.queue.push(event);
    this.onMessage?.(event);
  }
}
