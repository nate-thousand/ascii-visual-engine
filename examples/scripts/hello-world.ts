import type { ScriptModule } from '../../src/scripting';

export const helloWorld: ScriptModule = {
  id: 'hello-world',
  name: 'Hello World',
  description: 'Basic scripting smoke test — log, preset, and control.',
  init(api) {
    api.log('Hello from the Scripting API!');
    api.setPresetById('basic');
    api.setControl('speed', 1.25);
    api.enablePlugin('trails');
  },
};
