import {
  AsciiEngine,
  listPresets,
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
const debugPanel = document.getElementById('debug-panel') as HTMLPreElement;

const sliderIds = [
  'density',
  'speed',
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

const effectPluginIds = ['noise', 'wave', 'burst', 'glitch', 'trails'];
const patternPluginIds = [
  'radialSymmetry',
  'spiral',
  'wavePattern',
  'grid',
  'cellular',
  'scanline',
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
  preset: allPresets[0],
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
    const value =
      typeof presetValue === 'number'
        ? presetValue
        : (control?.default ?? parseFloat(sliders[id].min));
    sliders[id].value = String(value);
    valueDisplays[id].textContent = formatSliderValue(id, value);
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
    `density:      ${state.density.toFixed(2)}`,
    `speed:        ${state.speed.toFixed(2)}`,
    `glitch:       ${state.glitchAmount.toFixed(2)}`,
    `trails:       ${state.trailAmount.toFixed(2)}`,
    `symmetry:     ${state.symmetry}`,
    `petals:       ${state.petals}`,
    `spiral:       ${state.spiralAmount.toFixed(2)}`,
    `cellular:     ${state.cellularAmount.toFixed(2)}`,
    `scanline:     ${state.scanlineAmount.toFixed(2)}`,
    `last noteOn:  ${formatNoteOn(state.lastNoteOn)}`,
    `fps:          ${state.fps}`,
    `time:         ${state.time.toFixed(1)}s`,
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
      if (checkbox.checked) {
        engine.enablePlugin(id);
      } else {
        engine.disablePlugin(id);
      }
      updateDebugPanel();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      console.error(`Plugin "${id}" toggle failed:`, error);
    }
  });
}

for (const id of effectPluginIds) {
  createPluginCheckbox(id, effectPluginList);
}

for (const id of patternPluginIds) {
  createPluginCheckbox(id, patternPluginList);
}

syncSlidersFromPreset(allPresets[0]);
syncPluginsFromEngine();
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
  updateDebugPanel();
});

for (const id of sliderIds) {
  sliders[id].addEventListener('input', () => {
    const value = parseFloat(sliders[id].value);
    valueDisplays[id].textContent = formatSliderValue(id, value);
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
  const preset = engine.getPreset();
  syncSlidersFromPreset(preset);
  syncPluginsFromEngine();
  updateDebugPanel();
}

document.getElementById('burst-center')!.addEventListener('click', () => {
  triggerBurst();
});

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

engine.on('frame', () => {
  updateDebugPanel();
});

engine.on('noteOn', () => updateDebugPanel());
engine.on('control', () => updateDebugPanel());
engine.on('preset', () => updateDebugPanel());
engine.on('plugin', () => updateDebugPanel());

window.addEventListener('resize', () => {
  const size = getViewportSize();
  engine.resize(size.width, size.height);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    triggerBurst();
  }
});
