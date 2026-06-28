import {
  AsciiEngine,
  listPresets,
  motionCatalog,
  pluginCatalog,
  warnUnknownPreset,
  type AsciiPreset,
  type EngineDebugState,
  type Plugin,
  type PresetId,
} from 'ascii-visual-engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const presetSelect = document.getElementById('preset') as HTMLSelectElement;
const effectPluginList = document.getElementById('effect-plugins') as HTMLDivElement;
const patternPluginList = document.getElementById('pattern-plugins') as HTMLDivElement;
const motionPluginList = document.getElementById('motion-plugins') as HTMLDivElement;
const debugPanel = document.getElementById('debug-panel') as HTMLPreElement;
const motionDebugPanel = document.getElementById('motion-debug-panel') as HTMLPreElement;

const sliderIds = [
  'density',
  'speed',
  'strength',
  'randomness',
  'frequency',
  'amplitude',
  'decay',
  'drag',
  'gravity',
  'noiseScale',
  'flowStrength',
  'blendWeight',
  'symmetry',
  'petals',
  'spiralAmount',
  'cellularAmount',
  'scanlineAmount',
  'trailAmount',
  'glitchAmount',
] as const;
type SliderId = (typeof sliderIds)[number];

const sliders = Object.fromEntries(
  sliderIds.map((id) => [id, document.getElementById(id) as HTMLInputElement]),
) as Record<SliderId, HTMLInputElement>;

const valueDisplays = Object.fromEntries(
  sliderIds.map((id) => [
    id,
    document.getElementById(`${id}-value`) as HTMLSpanElement,
  ]),
) as Record<SliderId, HTMLSpanElement>;

const allPresets = listPresets();
const presetIds = allPresets.map((p) => p.id);
const pluginCheckboxes = new Map<string, HTMLInputElement>();
const motionCheckboxes = new Map<string, HTMLInputElement>();

const effectPluginIds = ['noise', 'wave', 'burst', 'glitch', 'trails'];
const patternPluginIds = [
  'radialSymmetry',
  'spiral',
  'wavePattern',
  'grid',
  'cellular',
  'scanline',
];
const motionPluginIds = [
  'flowField',
  'organicGrowth',
  'orbital',
  'wave',
  'gravity',
  'brownian',
  'flocking',
  'wind',
  'pulse',
  'breathing',
  'spiral',
  'curlNoise',
];

for (const preset of allPresets) {
  const option = document.createElement('option');
  option.value = preset.id;
  option.textContent = preset.name;
  presetSelect.appendChild(option);
}

function getViewportSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

const { width, height } = getViewportSize();

const engine = new AsciiEngine({
  canvas,
  preset: allPresets.find((p) => p.id === 'ambient') ?? allPresets[0],
  width,
  height,
});

function formatSliderValue(id: SliderId, value: number): string {
  if (id === 'symmetry' || id === 'petals') {
    return String(Math.round(value));
  }
  return value.toFixed(2);
}

function syncSlidersFromPreset(preset: AsciiPreset) {
  for (const id of sliderIds) {
    const control = preset.controls.find((c) => c.name === id);
    const presetValue = preset[id as keyof AsciiPreset];
    const slider = sliders[id];
    if (!slider) continue;
    const value =
      typeof presetValue === 'number'
        ? presetValue
        : (control?.default ?? parseFloat(slider.min));
    slider.value = String(value);
    if (valueDisplays[id]) {
      valueDisplays[id].textContent = formatSliderValue(id, value);
    }
    engine.setControl(id, value);
  }
}

function syncPluginsFromEngine() {
  const enabled = new Set(
    engine.getEnabledPlugins().map((plugin: Plugin) => plugin.id),
  );
  for (const [id, checkbox] of pluginCheckboxes) {
    checkbox.checked = enabled.has(id);
  }
}

function syncMotionsFromEngine() {
  const enabled = new Set(engine.getEnabledMotions().map((m) => m.id));
  for (const [id, checkbox] of motionCheckboxes) {
    checkbox.checked = enabled.has(id);
  }
}

function formatNoteOn(note: EngineDebugState['lastNoteOn']): string {
  if (!note) return '—';
  const x = note.x?.toFixed(2) ?? '?';
  const y = note.y?.toFixed(2) ?? '?';
  const intensity = note.intensity?.toFixed(2) ?? '?';
  return `x=${x} y=${y} i=${intensity}`;
}

function updateDebugPanel() {
  const state = engine.getDebugState();
  debugPanel.textContent = [
    `preset:       ${state.preset}`,
    `effects:      ${state.effects.join(', ') || '(none)'}`,
    `patterns:     ${state.patterns.join(', ') || '(none)'}`,
    `motions:      ${state.motions.join(', ') || '(none)'}`,
    `density:      ${state.density.toFixed(2)}`,
    `speed:        ${state.speed.toFixed(2)}`,
    `strength:     ${state.strength.toFixed(2)}`,
    `glitch:       ${state.glitchAmount.toFixed(2)}`,
    `trails:       ${state.trailAmount.toFixed(2)}`,
    `last noteOn:  ${formatNoteOn(state.lastNoteOn)}`,
    `fps:          ${state.fps}`,
    `time:         ${state.time.toFixed(1)}s`,
  ].join('\n');

  const md = state.motion;
  const motionLines = md.activeMotions.map(
    (m) => `  ${m.id} w=${m.weight.toFixed(2)} p=${m.priority}`,
  );
  motionDebugPanel.textContent = [
    `active:       ${md.activeMotions.length}`,
    ...motionLines,
    `frame time:   ${md.frameTimeMs.toFixed(2)} ms`,
    `avg velocity: ${md.avgVelocity.toFixed(3)}`,
    `particles:    ${md.particleCount}`,
    `fps:          ${md.fps}`,
  ].join('\n');
}

function createPluginCheckbox(id: string, container: HTMLElement) {
  const entry = pluginCatalog[id as keyof typeof pluginCatalog];
  if (!entry) {
    console.warn(`[Demo] Unknown plugin id "${id}" — checkbox skipped`);
    return;
  }

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = id;
  checkbox.id = `plugin-${id}`;

  const text = document.createElement('span');
  text.textContent = entry.name;

  label.appendChild(checkbox);
  label.appendChild(text);
  container.appendChild(label);
  pluginCheckboxes.set(id, checkbox);

  checkbox.addEventListener('change', () => {
    try {
      if (checkbox.checked) engine.enablePlugin(id);
      else engine.disablePlugin(id);
      updateDebugPanel();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      console.error(`Plugin "${id}" toggle failed:`, error);
    }
  });
}

function createMotionCheckbox(id: string, container: HTMLElement) {
  const entry = motionCatalog[id as keyof typeof motionCatalog];
  if (!entry) {
    console.warn(`[Demo] Unknown motion id "${id}" — checkbox skipped`);
    return;
  }

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = id;
  checkbox.id = `motion-${id}`;

  const text = document.createElement('span');
  text.textContent = entry.name;

  label.appendChild(checkbox);
  label.appendChild(text);
  container.appendChild(label);
  motionCheckboxes.set(id, checkbox);

  checkbox.addEventListener('change', () => {
    try {
      if (checkbox.checked) engine.enableMotion(id);
      else engine.disableMotion(id);
      updateDebugPanel();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      console.error(`Motion "${id}" toggle failed:`, error);
    }
  });
}

for (const id of effectPluginIds) createPluginCheckbox(id, effectPluginList);
for (const id of patternPluginIds) createPluginCheckbox(id, patternPluginList);
for (const id of motionPluginIds) createMotionCheckbox(id, motionPluginList);

const initialPreset = engine.getPreset();
syncSlidersFromPreset(initialPreset);
syncPluginsFromEngine();
syncMotionsFromEngine();
presetSelect.value = initialPreset.id;
updateDebugPanel();

presetSelect.addEventListener('change', () => {
  const id = presetSelect.value as PresetId;
  warnUnknownPreset(id, presetIds);
  const preset = allPresets.find((p) => p.id === id);
  if (!preset) {
    console.warn(`[Demo] Preset "${id}" not found`);
    return;
  }
  engine.setPreset(preset);
  syncSlidersFromPreset(preset);
  syncPluginsFromEngine();
  syncMotionsFromEngine();
  updateDebugPanel();
});

for (const id of sliderIds) {
  const slider = sliders[id];
  if (!slider) continue;
  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value);
    if (valueDisplays[id]) {
      valueDisplays[id].textContent = formatSliderValue(id, value);
    }
    engine.setControl(id, value);
    updateDebugPanel();
  });
}

function triggerBurst() {
  engine.enablePlugin('burst');
  syncPluginsFromEngine();
  engine.noteOn({ x: 0.5, y: 0.5, intensity: 1.8 });
  updateDebugPanel();
}

function maxGlitch() {
  engine.enablePlugin('glitch');
  syncPluginsFromEngine();
  engine.setControl('glitchAmount', 1);
  sliders.glitchAmount.value = '1';
  valueDisplays.glitchAmount.textContent = '1.00';
  updateDebugPanel();
}

function maxTrails() {
  engine.enablePlugin('trails');
  syncPluginsFromEngine();
  engine.setControl('trailAmount', 1);
  sliders.trailAmount.value = '1';
  valueDisplays.trailAmount.textContent = '1.00';
  updateDebugPanel();
}

function resetControls() {
  syncSlidersFromPreset(engine.getPreset());
  syncPluginsFromEngine();
  syncMotionsFromEngine();
  updateDebugPanel();
}

document.getElementById('burst-center')!.addEventListener('click', triggerBurst);
document.getElementById('burst-random')!.addEventListener('click', () => {
  engine.enablePlugin('burst');
  syncPluginsFromEngine();
  engine.noteOn({
    x: Math.random(),
    y: Math.random(),
    intensity: 1.2 + Math.random(),
  });
  updateDebugPanel();
});
document.getElementById('test-burst')!.addEventListener('click', triggerBurst);
document.getElementById('test-glitch')!.addEventListener('click', maxGlitch);
document.getElementById('test-trails')!.addEventListener('click', maxTrails);
document.getElementById('test-reset')!.addEventListener('click', resetControls);

engine.on('frame', () => updateDebugPanel());
engine.on('noteOn', () => updateDebugPanel());
engine.on('control', () => updateDebugPanel());
engine.on('preset', () => updateDebugPanel());
engine.on('plugin', () => updateDebugPanel());
engine.on('motion', () => updateDebugPanel());

window.addEventListener('resize', () => {
  engine.resize(getViewportSize().width, getViewportSize().height);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    triggerBurst();
  }
});
