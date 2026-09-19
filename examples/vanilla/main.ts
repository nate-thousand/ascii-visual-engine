import {
  createEngine,
  listPresets,
  listLiveControls,
  CONTROL_CATALOG,
  motionCatalog,
  simulationCatalog,
  pluginCatalog,
  listPostPassIds,
  warnUnknownPreset,
  type AsciiPreset,
  type AsciiEngine,
  type ControlDef,
  type EngineDebugState,
  type Plugin,
  type RendererId,
  type QualityPresetId,
} from 'ascii-visual-engine';
import { galleryScripts } from '../scripts';
import { runFrameBudget, benchTable } from './bench';

// ---------------------------------------------------------------------------
// Elements. Every id here exists in index.html; tests/harness-ids.test.ts
// checks both directions.
// ---------------------------------------------------------------------------

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[Harness] Missing element #${id}`);
  return el as T;
}

const canvas = $<HTMLCanvasElement>('canvas');
const domOutput = $<HTMLPreElement>('dom-output');
const fpsEl = $<HTMLSpanElement>('fps');

const presetSelect = $<HTMLSelectElement>('preset');
const presetControlsEl = $<HTMLDivElement>('preset-controls');
const engineReadout = $<HTMLPreElement>('engine-readout');
const effectPluginList = $<HTMLDivElement>('effect-plugins');
const patternPluginList = $<HTMLDivElement>('pattern-plugins');
const motionPluginList = $<HTMLDivElement>('motion-plugins');
const simulationPluginList = $<HTMLDivElement>('simulation-plugins');
const postPassList = $<HTMLDivElement>('post-passes');

const sourceModeSelect = $<HTMLSelectElement>('source-mode');
const sourceFitSelect = $<HTMLSelectElement>('source-fit');
const imageInput = $<HTMLInputElement>('image-input');
const videoInput = $<HTMLInputElement>('video-input');
const webcamRow = $<HTMLDivElement>('webcam-row');
const startWebcamBtn = $<HTMLButtonElement>('start-webcam');
const sourceControlsEl = $<HTMLDivElement>('source-controls');
const sourceErrorEl = $<HTMLDivElement>('source-error');
const sourceReadout = $<HTMLPreElement>('source-readout');

const rendererModeSelect = $<HTMLSelectElement>('renderer-mode');
const rendererWarning = $<HTMLDivElement>('renderer-warning');
const pixelRatioSelect = $<HTMLSelectElement>('pixel-ratio');
const rendererReadout = $<HTMLPreElement>('renderer-readout');

const startMicrophoneBtn = $<HTMLButtonElement>('start-microphone');
const disconnectAudioBtn = $<HTMLButtonElement>('disconnect-audio');
const audioFileInput = $<HTMLInputElement>('audio-file-input');
const audioErrorEl = $<HTMLDivElement>('audio-error');
const audioControlsEl = $<HTMLDivElement>('audio-controls');
const audioReadout = $<HTMLPreElement>('audio-readout');

const midiDeviceSelect = $<HTMLSelectElement>('midi-device');
const connectMidiBtn = $<HTMLButtonElement>('connect-midi');
const disconnectMidiBtn = $<HTMLButtonElement>('disconnect-midi');
const inputPanicBtn = $<HTMLButtonElement>('input-panic');
const midiErrorEl = $<HTMLDivElement>('midi-error');
const keyboardInputToggle = $<HTMLInputElement>('keyboard-input-toggle');
const pointerInputToggle = $<HTMLInputElement>('pointer-input-toggle');
const learnControlSelect = $<HTMLSelectElement>('learn-control');
const startLearnBtn = $<HTMLButtonElement>('start-learn');
const clearLearnedBtn = $<HTMLButtonElement>('clear-learned');
const resetInputMappingBtn = $<HTMLButtonElement>('reset-input-mapping');
const inputReadout = $<HTMLPreElement>('input-readout');

const importJsonInput = $<HTMLInputElement>('import-json');
const recordingStatus = $<HTMLDivElement>('recording-status');
const exportErrorEl = $<HTMLDivElement>('export-error');
const exportReadout = $<HTMLPreElement>('export-readout');

const qualityPresetSelect = $<HTMLSelectElement>('quality-preset');
const adaptiveQualityToggle = $<HTMLInputElement>('adaptive-quality');
const dirtyRenderingToggle = $<HTMLInputElement>('dirty-rendering');
const spatialGridToggle = $<HTMLInputElement>('spatial-grid');
const fpsTargetSlider = $<HTMLInputElement>('fps-target');
const fpsTargetValue = $<HTMLSpanElement>('fps-target-value');
const fpsGraphCanvas = $<HTMLCanvasElement>('fps-graph');
const fpsGraphCtx = fpsGraphCanvas.getContext('2d')!;
const performanceReadout = $<HTMLPreElement>('performance-readout');
const runBenchBtn = $<HTMLButtonElement>('run-bench');
const benchOutput = $<HTMLPreElement>('bench-output');

const scriptSelect = $<HTMLSelectElement>('script-select');
const scriptStatusEl = $<HTMLDivElement>('script-status');
const scriptConsoleEl = $<HTMLPreElement>('script-console');
const scriptVarsEl = $<HTMLPreElement>('script-vars');

const audioMeterIds = ['amplitude', 'bass', 'mid', 'treble'] as const;
type AudioMeterId = (typeof audioMeterIds)[number];
const audioMeterValues = Object.fromEntries(
  audioMeterIds.map((id) => [id, $<HTMLSpanElement>(`meter-${id}`)]),
) as Record<AudioMeterId, HTMLSpanElement>;
const audioMeterBars = Object.fromEntries(
  audioMeterIds.map((id) => [id, $<HTMLDivElement>(`bar-${id}`)]),
) as Record<AudioMeterId, HTMLDivElement>;

const audioElement = document.createElement('audio');
audioElement.style.display = 'none';
document.body.appendChild(audioElement);

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const allPresets = listPresets();
const presetIds = allPresets.map((p) => p.id);
const HERO_PRESET_IDS = [
  'glyphOrganicBloom',
  'glyphDigitalForest',
  'glyphCrtTerminal',
  'glyphCorruptedBroadcast',
  'glyphFlowField',
  'glyphMinimalZen',
] as const;
const heroSet = new Set<string>(HERO_PRESET_IDS);

function presetFamily(preset: AsciiPreset): string {
  if (heroSet.has(preset.id)) return 'Hero';
  if (preset.id.startsWith('glyph')) return 'Glyph';
  if (preset.id.startsWith('audio')) return 'Audio';
  if (preset.id.startsWith('performance')) return 'Performance';
  if (preset.id.endsWith('Sim')) return 'Simulation';
  if (preset.id === 'compositing') return 'Compositing';
  if (['basic', 'terminal', 'organic'].includes(preset.id)) return 'Classic';
  return 'Motion';
}

function presetLabel(preset: AsciiPreset): string {
  return preset.name.replace(/^(Glyph|Audio|Performance) — /, '');
}

{
  const order = ['Hero', 'Glyph', 'Motion', 'Classic', 'Simulation', 'Compositing', 'Audio', 'Performance'];
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const family of order) {
    const group = document.createElement('optgroup');
    group.label = family;
    groups.set(family, group);
  }
  const heroFirst = [
    ...HERO_PRESET_IDS.map((id) => allPresets.find((p) => p.id === id)).filter((p): p is AsciiPreset => !!p),
    ...allPresets.filter((p) => !heroSet.has(p.id)),
  ];
  for (const preset of heroFirst) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = presetLabel(preset);
    groups.get(presetFamily(preset))?.appendChild(option);
  }
  for (const group of groups.values()) {
    if (group.childElementCount > 0) presetSelect.appendChild(group);
  }
}

const requestedPreset = new URLSearchParams(window.location.search).get('preset');
const bootPreset =
  (requestedPreset && allPresets.find((p) => p.id === requestedPreset)) ||
  allPresets.find((p) => p.id === HERO_PRESET_IDS[0]) ||
  allPresets[0];
if (requestedPreset && bootPreset.id !== requestedPreset) {
  console.warn(`[Harness] Unknown ?preset=${requestedPreset}, booting ${bootPreset.id}`);
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

// The harness goes through the host facade to boot, then drives the full
// engine underneath it, the way a power user host would.
const handle = createEngine(canvas, {
  element: domOutput,
  preset: bootPreset,
  width: window.innerWidth,
  height: window.innerHeight,
});
const engine = handle.engine;

engine.registerScripts(galleryScripts);
engine.getScriptEngine().setHotReload(import.meta.env.DEV);
// Dev only: poke the engine from the browser console, and run the frame budget
// (see BENCHMARKS.md): `await bench({ pixelRatios: [1, 2] })`.
if (import.meta.env.DEV) {
  const w = window as unknown as { engine: AsciiEngine; bench: (o?: Parameters<typeof runFrameBudget>[1]) => Promise<string> };
  w.engine = engine;
  w.bench = async (o) => {
    const rows = await runFrameBudget(engine, o);
    const table = benchTable(rows);
    console.log(table);
    return table;
  };
}

// ---------------------------------------------------------------------------
// Sliders. One factory for every numeric control in the panel.
// ---------------------------------------------------------------------------

interface SliderHandle {
  input: HTMLInputElement;
  value: HTMLSpanElement;
  def: ControlDef;
}

const sliders = new Map<string, SliderHandle>();

function formatValue(def: ControlDef, value: number): string {
  return def.step !== undefined && def.step >= 1 ? String(Math.round(value)) : value.toFixed(2);
}

function mountSlider(container: HTMLElement, def: ControlDef, initial: number): SliderHandle {
  const label = document.createElement('label');
  label.htmlFor = `ctl-${def.name}`;
  label.append(def.label ?? def.name);
  const value = document.createElement('span');
  value.className = 'value';
  label.appendChild(value);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = `ctl-${def.name}`;
  input.min = String(def.min);
  input.max = String(def.max);
  input.step = String(def.step ?? 0.01);
  input.value = String(initial);
  value.textContent = formatValue(def, initial);

  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    value.textContent = formatValue(def, v);
    engine.setControl(def.name, v);
  });

  container.append(label, input);
  const handle = { input, value, def };
  sliders.set(def.name, handle);
  return handle;
}

/** Reflect engine control values in every mounted slider without writing back. */
function syncSlidersFromEngine(): void {
  for (const [name, handle] of sliders) {
    const v = engine.getControl(name, parseFloat(handle.input.value));
    handle.input.value = String(v);
    handle.value.textContent = formatValue(handle.def, v);
  }
}

const isAudioControl = (name: string) => name.startsWith('audio');
const SOURCE_PANEL_CONTROLS: ControlDef[] = [
  { name: 'sourceContrast', label: 'Contrast', min: 0.5, max: 2, default: 1, step: 0.05 },
  { name: 'sourceEdge', label: 'Edge', min: 0, max: 1, default: 0.3, step: 0.05 },
  { name: 'sourceBlend', label: 'Blend', min: 0, max: 1, default: 1, step: 0.05 },
];

/**
 * Rebuild the Preset and Audio slider blocks for the active preset. Globals
 * (density, speed) always show; the rest is `preset.controls` filtered to
 * what the composition actually reads. Audio controls render in the Audio
 * section only when the preset maps audio.
 */
function buildPresetControls(preset: AsciiPreset): void {
  for (const name of Array.from(sliders.keys())) {
    if (!SOURCE_PANEL_CONTROLS.some((d) => d.name === name)) sliders.delete(name);
  }
  presetControlsEl.innerHTML = '';
  audioControlsEl.innerHTML = '';

  const live = new Set(listLiveControls(preset));
  const controls = preset.controls ?? [];
  const declared = new Map(controls.map((c) => [c.name, c]));

  const globals: ControlDef[] = ['density', 'speed'].map(
    (name) => declared.get(name) ?? { name, ...CONTROL_CATALOG[name] },
  );
  const rest = controls.filter(
    (c) => !['density', 'speed'].includes(c.name) && live.has(c.name) && !isAudioControl(c.name),
  );
  for (const def of [...globals, ...rest]) {
    mountSlider(presetControlsEl, def, engine.getControl(def.name, def.default));
  }

  const dropped = controls.filter((c) => !live.has(c.name)).map((c) => c.name);
  if (dropped.length > 0) {
    const note = document.createElement('div');
    note.className = 'status';
    note.textContent = `declared but unread by this composition: ${dropped.join(', ')}`;
    presetControlsEl.appendChild(note);
  }

  const audioDefs = controls.filter((c) => isAudioControl(c.name) && live.has(c.name));
  if (audioDefs.length > 0) {
    for (const def of audioDefs) {
      mountSlider(audioControlsEl, def, engine.getControl(def.name, def.default));
    }
  } else {
    const note = document.createElement('div');
    note.className = 'status';
    note.textContent = 'This preset has no audio mapping. Meters still run; pick an Audio preset to drive controls.';
    audioControlsEl.appendChild(note);
  }

  learnControlSelect.innerHTML = '<option value="">(pick a control)</option>';
  for (const def of [...globals, ...rest]) {
    const opt = document.createElement('option');
    opt.value = def.name;
    opt.textContent = def.label ?? def.name;
    learnControlSelect.appendChild(opt);
  }
}

for (const def of SOURCE_PANEL_CONTROLS) {
  mountSlider(sourceControlsEl, def, def.default);
  engine.setControl(def.name, def.default);
}

// ---------------------------------------------------------------------------
// Composition checkboxes
// ---------------------------------------------------------------------------

const pluginCheckboxes = new Map<string, HTMLInputElement>();
const motionCheckboxes = new Map<string, HTMLInputElement>();
const simulationCheckboxes = new Map<string, HTMLInputElement>();
const postPassCheckboxes = new Map<string, HTMLInputElement>();

function mountCheckbox(
  container: HTMLElement,
  id: string,
  name: string,
  registry: Map<string, HTMLInputElement>,
  onChange: (checked: boolean) => void,
): void {
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `${container.id}-${id}`;
  const text = document.createElement('span');
  text.textContent = name;
  label.append(checkbox, text);
  container.appendChild(label);
  registry.set(id, checkbox);
  checkbox.addEventListener('change', () => {
    try {
      onChange(checkbox.checked);
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      console.error(`[Harness] toggle "${id}" failed:`, error);
    }
    refreshReadouts();
  });
}

for (const [id, entry] of Object.entries(pluginCatalog)) {
  const target = entry.type === 'pattern' ? patternPluginList : effectPluginList;
  mountCheckbox(target, id, entry.name, pluginCheckboxes, (on) =>
    on ? engine.enablePlugin(id) : engine.disablePlugin(id),
  );
}
for (const [id, entry] of Object.entries(motionCatalog)) {
  mountCheckbox(motionPluginList, id, entry.name, motionCheckboxes, (on) =>
    on ? engine.enableMotion(id) : engine.disableMotion(id),
  );
}
for (const [id, entry] of Object.entries(simulationCatalog)) {
  mountCheckbox(simulationPluginList, id, entry.name, simulationCheckboxes, (on) =>
    on ? engine.enableSimulation(id) : engine.disableSimulation(id),
  );
}
for (const id of listPostPassIds()) {
  mountCheckbox(postPassList, id, id, postPassCheckboxes, (on) =>
    on ? engine.getPostProcessor().enablePass(id) : engine.getPostProcessor().disablePass(id),
  );
}

function syncCompositionFromEngine(): void {
  const plugins = new Set(engine.getEnabledPlugins().map((p: Plugin) => p.id));
  for (const [id, box] of pluginCheckboxes) box.checked = plugins.has(id);
  const motions = new Set(engine.getEnabledMotions().map((m) => m.id));
  for (const [id, box] of motionCheckboxes) box.checked = motions.has(id);
  const sims = new Set(engine.getEnabledSimulations().map((s) => s.id));
  for (const [id, box] of simulationCheckboxes) box.checked = sims.has(id);
  const passes = new Set(engine.getPostProcessor().getEnabled().map((p) => p.id));
  for (const [id, box] of postPassCheckboxes) box.checked = passes.has(id);
}

// ---------------------------------------------------------------------------
// Preset switching
// ---------------------------------------------------------------------------

function applyPresetById(id: string): void {
  warnUnknownPreset(id, presetIds);
  const preset = allPresets.find((p) => p.id === id);
  if (!preset) return;
  engine.setPreset(preset);
  presetSelect.value = preset.id;
  buildPresetControls(preset);
  syncSlidersFromEngine();
  syncCompositionFromEngine();
  const url = new URL(window.location.href);
  url.searchParams.set('preset', preset.id);
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  refreshReadouts();
}

presetSelect.addEventListener('change', () => applyPresetById(presetSelect.value));

$('trigger-burst').addEventListener('click', () => triggerBurst(0.5, 0.5, 1.8));
$('trigger-burst-random').addEventListener('click', () =>
  triggerBurst(Math.random(), Math.random(), 1.2 + Math.random()),
);
$('trigger-reset').addEventListener('click', () => applyPresetById(engine.getPreset().id));

function triggerBurst(x: number, y: number, intensity: number): void {
  engine.enablePlugin('burst');
  syncCompositionFromEngine();
  engine.noteOn({ x, y, intensity });
  refreshReadouts();
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

const demoCanvas = document.createElement('canvas');
demoCanvas.width = 320;
demoCanvas.height = 240;
const demoCtx = demoCanvas.getContext('2d')!;
let canvasAnimAngle = 0;

function drawDemoCanvas(): void {
  canvasAnimAngle += 0.03;
  const { width, height } = demoCanvas;
  demoCtx.fillStyle = '#001a0d';
  demoCtx.fillRect(0, 0, width, height);
  demoCtx.save();
  demoCtx.translate(width / 2, height / 2);
  demoCtx.rotate(canvasAnimAngle);
  demoCtx.fillStyle = '#00ff88';
  demoCtx.fillRect(-60, -30, 120, 60);
  demoCtx.fillStyle = '#004422';
  demoCtx.beginPath();
  demoCtx.arc(0, 0, 40, 0, Math.PI * 2);
  demoCtx.fill();
  demoCtx.restore();
  demoCtx.fillStyle = '#ffffff';
  demoCtx.font = '16px monospace';
  demoCtx.fillText('CANVAS SOURCE', 16, 28);
}

function updateSourceInputs(mode: string): void {
  imageInput.hidden = mode !== 'image';
  videoInput.hidden = mode !== 'video';
  webcamRow.hidden = mode !== 'webcam';
  const procedural = mode === 'procedural';
  sourceControlsEl.hidden = procedural;
  sourceFitSelect.hidden = procedural;
  sourceFitSelect.previousElementSibling?.toggleAttribute('hidden', procedural);
}

async function loadSource(id: string, input: unknown): Promise<void> {
  sourceErrorEl.textContent = '';
  try {
    engine.setActiveSource(id);
    await engine.loadSource(id, input);
  } catch (error) {
    sourceErrorEl.textContent = error instanceof Error ? error.message : String(error);
  }
  refreshReadouts();
}

sourceModeSelect.addEventListener('change', () => {
  const mode = sourceModeSelect.value;
  updateSourceInputs(mode);
  sourceErrorEl.textContent = '';
  if (mode === 'procedural') {
    engine.setSourceMode('procedural');
    refreshReadouts();
    return;
  }
  if (mode === 'canvas') {
    drawDemoCanvas();
    void loadSource('canvas', { canvas: demoCanvas });
    return;
  }
  // image, video, webcam wait for their input
  engine.setActiveSource(mode);
  refreshReadouts();
});

sourceFitSelect.addEventListener('change', () => {
  engine
    .getSourceManager()
    .getActiveSource()
    ?.setFitMode(sourceFitSelect.value as 'fit' | 'fill' | 'stretch' | 'center');
  refreshReadouts();
});

imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  if (file) void loadSource('image', file);
});

videoInput.addEventListener('change', () => {
  const file = videoInput.files?.[0];
  if (file) void loadSource('video', { file, loop: true, muted: true });
});

startWebcamBtn.addEventListener('click', () => {
  void loadSource('webcam', { facingMode: 'user' });
});

engine.on('frame', () => {
  if (sourceModeSelect.value === 'canvas') drawDemoCanvas();
});

updateSourceInputs('procedural');

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

function updateOutputVisibility(rendererId: RendererId | null): void {
  const useDom = rendererId === 'dom';
  canvas.style.display = useDom ? 'none' : 'block';
  domOutput.style.display = useDom ? 'block' : 'none';
}

rendererModeSelect.addEventListener('change', () => {
  const previous = engine.getActiveRendererId();
  const result = engine.setActiveRenderer(rendererModeSelect.value as RendererId);
  if (!result.ok) {
    rendererWarning.textContent = result.warning ?? 'Renderer switch failed.';
    if (previous) rendererModeSelect.value = previous;
  } else {
    rendererWarning.textContent = result.warning ?? '';
    updateOutputVisibility(engine.getActiveRendererId());
  }
  refreshReadouts();
});

updateOutputVisibility(engine.getActiveRendererId());
rendererModeSelect.value = engine.getActiveRendererId() ?? 'canvas';

pixelRatioSelect.addEventListener('change', () => {
  const v = pixelRatioSelect.value;
  handle.setPixelRatio(v === 'auto' ? 'auto' : parseFloat(v));
  refreshReadouts();
});

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

async function connectMicrophone(): Promise<void> {
  audioErrorEl.textContent = '';
  engine.disconnectAudio();
  audioElement.pause();
  const result = await engine.connectAudio({ type: 'microphone' });
  if (!result.ok) audioErrorEl.textContent = result.error ?? 'Microphone connection failed';
  refreshReadouts();
}

async function connectAudioFile(file: File): Promise<void> {
  audioErrorEl.textContent = '';
  engine.disconnectAudio();
  audioElement.src = URL.createObjectURL(file);
  audioElement.loop = true;
  await audioElement.play();
  const result = await engine.connectAudio({ type: 'audioElement', audioElement });
  if (!result.ok) audioErrorEl.textContent = result.error ?? 'Audio file connection failed';
  refreshReadouts();
}

startMicrophoneBtn.addEventListener('click', () => void connectMicrophone());
audioFileInput.addEventListener('change', () => {
  const file = audioFileInput.files?.[0];
  if (file) void connectAudioFile(file);
});
disconnectAudioBtn.addEventListener('click', () => {
  engine.disconnectAudio();
  audioElement.pause();
  audioErrorEl.textContent = '';
  refreshReadouts();
});

function updateAudioMeters(features: NonNullable<ReturnType<typeof engine.getAudioFeatures>>): void {
  const values: Record<AudioMeterId, number> = {
    amplitude: features.amplitude,
    bass: features.bass,
    mid: features.mid,
    treble: features.treble,
  };
  for (const id of audioMeterIds) {
    audioMeterValues[id].textContent = values[id].toFixed(2);
    audioMeterBars[id].style.width = `${Math.round(values[id] * 100)}%`;
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

async function refreshMidiDevices(): Promise<void> {
  const devices = await engine.getMidiDevices();
  midiDeviceSelect.innerHTML = '';
  if (devices.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no devices)';
    midiDeviceSelect.appendChild(opt);
    return;
  }
  for (const device of devices) {
    const opt = document.createElement('option');
    opt.value = device.id;
    opt.textContent = device.name;
    midiDeviceSelect.appendChild(opt);
  }
}
void refreshMidiDevices();

connectMidiBtn.addEventListener('click', async () => {
  midiErrorEl.textContent = '';
  await refreshMidiDevices();
  const result = await engine.connectMidi(midiDeviceSelect.value || undefined);
  if (!result.ok) midiErrorEl.textContent = result.error ?? 'MIDI connection failed';
  refreshReadouts();
});

disconnectMidiBtn.addEventListener('click', () => {
  engine.disconnectMidi();
  midiErrorEl.textContent = '';
  refreshReadouts();
});

inputPanicBtn.addEventListener('click', () => {
  engine.inputPanic();
  refreshReadouts();
});

keyboardInputToggle.addEventListener('change', () => {
  if (keyboardInputToggle.checked) engine.enableKeyboardInput();
  else engine.disableKeyboardInput();
  refreshReadouts();
});

pointerInputToggle.addEventListener('change', () => {
  if (pointerInputToggle.checked) handle.enablePointerInput();
  else handle.disablePointerInput();
  refreshReadouts();
});

startLearnBtn.addEventListener('click', () => {
  const control = learnControlSelect.value;
  if (!control) {
    engine.cancelInputLearn();
    refreshReadouts();
    return;
  }
  const def = sliders.get(control)?.def;
  engine.startInputLearn(
    { type: 'control', control, min: def?.min ?? 0, max: def?.max ?? 1 },
    () => refreshReadouts(),
  );
  refreshReadouts();
});

clearLearnedBtn.addEventListener('click', () => {
  engine.clearInputMapping();
  refreshReadouts();
});

resetInputMappingBtn.addEventListener('click', () => {
  engine.resetInputMapping();
  refreshReadouts();
});

// ---------------------------------------------------------------------------
// Export and recording
// ---------------------------------------------------------------------------

function reportExport(result: { ok: boolean; error?: string }, fallback: string): void {
  exportErrorEl.textContent = result.ok ? '' : (result.error ?? fallback);
  refreshReadouts();
}

$('export-png').addEventListener('click', async () => {
  // The canvas is already at device resolution.
  reportExport(await engine.exportPNG(), 'PNG export failed');
});
$('export-svg').addEventListener('click', () => {
  reportExport(engine.exportSVG({ transparent: true }), 'SVG export failed');
});
$('export-ascii').addEventListener('click', () => {
  reportExport(engine.exportASCII({ format: 'plain' }), 'ASCII export failed');
});
$('export-json').addEventListener('click', () => {
  reportExport(engine.exportJSON(), 'JSON export failed');
});

importJsonInput.addEventListener('change', async () => {
  const file = importJsonInput.files?.[0];
  if (!file) return;
  const result = engine.importJSON(await file.text());
  reportExport(result, 'JSON import failed');
  buildPresetControls(engine.getPreset());
  syncSlidersFromEngine();
  syncCompositionFromEngine();
  importJsonInput.value = '';
});

$('start-recording').addEventListener('click', () => {
  reportExport(engine.startRecording(30), 'Recording failed');
});
$('stop-recording').addEventListener('click', () => {
  engine.stopRecording();
  refreshReadouts();
});
$('export-gif').addEventListener('click', async () => {
  reportExport(await engine.exportGIF({ frameRate: 15, loop: true }), 'GIF export failed');
});
$('export-sequence').addEventListener('click', async () => {
  reportExport(await engine.exportSequence({ prefix: 'ascii-frame' }), 'Sequence export failed');
});
$('play-recording').addEventListener('click', () => {
  engine.playRecording({ loop: true, speed: 1, frameRate: 30 });
  refreshReadouts();
});
$('step-back').addEventListener('click', () => {
  engine.pausePlayback();
  engine.stepPlayback(-1);
  refreshReadouts();
});
$('step-forward').addEventListener('click', () => {
  engine.pausePlayback();
  engine.stepPlayback(1);
  refreshReadouts();
});
$('stop-playback').addEventListener('click', () => {
  engine.stopPlayback();
  refreshReadouts();
});

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

qualityPresetSelect.addEventListener('change', () => {
  engine.setQualityPreset(qualityPresetSelect.value as QualityPresetId);
  syncSlidersFromEngine();
  refreshReadouts();
});

adaptiveQualityToggle.addEventListener('change', () => {
  engine.setControl('adaptiveQuality', adaptiveQualityToggle.checked ? 1 : 0);
  refreshReadouts();
});

dirtyRenderingToggle.addEventListener('change', () => {
  engine.setControl('dirtyRendering', dirtyRenderingToggle.checked ? 1 : 0);
  refreshReadouts();
});

spatialGridToggle.addEventListener('change', () => {
  engine.setControl('spatialGrid', spatialGridToggle.checked ? 1 : 0);
  refreshReadouts();
});

fpsTargetSlider.addEventListener('input', () => {
  const val = parseInt(fpsTargetSlider.value, 10);
  fpsTargetValue.textContent = String(val);
  engine.setControl('fpsTarget', val);
});

runBenchBtn.addEventListener('click', async () => {
  runBenchBtn.disabled = true;
  benchOutput.hidden = false;
  benchOutput.textContent = 'measuring, keep this tab visible...';
  try {
    const rows = await runFrameBudget(engine, { seconds: 3, settle: 0.7 });
    benchOutput.textContent = rows
      .map((r) => `${r.preset.replace(/^glyph/, '')}  ${r.frameMs} ms (p95 ${r.frameP95})  ${r.fps} fps  ${r.cells} cells  slowest ${r.slowest} ${r.slowestMs}`)
      .join('\n');
    console.log(benchTable(rows));
  } finally {
    runBenchBtn.disabled = false;
    buildPresetControls(engine.getPreset());
    syncSlidersFromEngine();
    syncCompositionFromEngine();
    presetSelect.value = engine.getPreset().id;
  }
});

function drawFpsGraph(history: number[]): void {
  const w = fpsGraphCanvas.width;
  const h = fpsGraphCanvas.height;
  fpsGraphCtx.fillStyle = 'rgba(0,0,0,0.6)';
  fpsGraphCtx.fillRect(0, 0, w, h);
  if (history.length < 2) return;
  const maxFps = 120;
  fpsGraphCtx.strokeStyle = '#00ff88';
  fpsGraphCtx.lineWidth = 1;
  fpsGraphCtx.beginPath();
  for (let i = 0; i < history.length; i++) {
    const x = (i / (history.length - 1)) * w;
    const y = h - (Math.min(history[i], maxFps) / maxFps) * h;
    if (i === 0) fpsGraphCtx.moveTo(x, y);
    else fpsGraphCtx.lineTo(x, y);
  }
  fpsGraphCtx.stroke();
  fpsGraphCtx.strokeStyle = 'rgba(255,255,255,0.2)';
  fpsGraphCtx.beginPath();
  const targetY = h - (parseFloat(fpsTargetSlider.value) / maxFps) * h;
  fpsGraphCtx.moveTo(0, targetY);
  fpsGraphCtx.lineTo(w, targetY);
  fpsGraphCtx.stroke();
}

// ---------------------------------------------------------------------------
// Scripting
// ---------------------------------------------------------------------------

for (const script of galleryScripts) {
  const opt = document.createElement('option');
  opt.value = script.id;
  opt.textContent = script.name ?? script.id;
  scriptSelect.appendChild(opt);
}

$('run-script').addEventListener('click', () => {
  const id = scriptSelect.value;
  if (!id) return;
  engine
    .runScript(id)
    .then(() => {
      syncCompositionFromEngine();
      refreshReadouts();
    })
    .catch((err) => {
      scriptStatusEl.textContent = `error: ${err instanceof Error ? err.message : String(err)}`;
      refreshReadouts();
    });
});
$('stop-script').addEventListener('click', () => void engine.stopScript().then(refreshReadouts));
$('restart-script').addEventListener('click', () => void engine.restartScript().then(refreshReadouts));
$('enable-script').addEventListener('click', () => {
  engine.enableScript();
  refreshReadouts();
});
$('disable-script').addEventListener('click', () => {
  engine.disableScript();
  refreshReadouts();
});
$('clear-script-console').addEventListener('click', () => {
  engine.clearScriptConsole();
  refreshReadouts();
});

// ---------------------------------------------------------------------------
// Readouts. One per section, all from getDebugState().
// ---------------------------------------------------------------------------

function formatNoteOn(note: EngineDebugState['lastNoteOn']): string {
  if (!note) return 'none';
  return `x=${note.x?.toFixed(2) ?? '?'} y=${note.y?.toFixed(2) ?? '?'} i=${note.intensity?.toFixed(2) ?? '?'}`;
}

function isOpen(sectionId: string): boolean {
  return (document.getElementById(sectionId) as HTMLDetailsElement | null)?.open ?? false;
}

function refreshReadouts(): void {
  const state = engine.getDebugState();
  fpsEl.textContent = `fps: ${Math.round(state.fps)}`;
  if (document.body.classList.contains('ui-hidden')) return;

  if (isOpen('section-preset')) {
    const md = state.motion;
    const gd = state.glyph;
    engineReadout.textContent = [
      `state:       ${state.state}`,
      `preset:      ${state.preset}`,
      `effects:     ${state.effects.join(', ') || 'none'}`,
      `patterns:    ${state.patterns.join(', ') || 'none'}`,
      `motions:     ${md.activeMotions.map((m) => `${m.id} w=${m.weight.toFixed(2)}`).join(', ') || 'none'}`,
      `simulations: ${state.simulation.activeSimulations.map((s) => `${s.id} p=${s.particleCount}`).join(', ') || 'none'}`,
      `post:        ${state.postProcessing.enabledPasses.join(', ') || 'none'}`,
      `layers:      ${state.compositing.enabledCount}/${state.compositing.layerCount}`,
      `glyphs:      ${gd.enabled ? `${gd.languageName ?? gd.languageId} (${gd.glyphCount})` : 'off'}`,
      `last noteOn: ${formatNoteOn(state.lastNoteOn)}`,
      `time:        ${state.time.toFixed(1)}s`,
    ].join('\n');
  }

  if (isOpen('section-source')) {
    const s = state.source;
    sourceReadout.textContent = [
      `mode:   ${s.mode}`,
      `active: ${s.activeSourceId ?? 'none'} (${s.activeSourceType ?? 'none'})`,
      `ready:  ${s.ready}`,
      `error:  ${s.error ?? 'none'}`,
      `size:   ${s.width}x${s.height}, fit ${s.fitMode}`,
    ].join('\n');
  }

  if (isOpen('section-renderer')) {
    const rd = state.renderer;
    rendererReadout.textContent = [
      `active:      ${rd.activeRendererId ?? 'none'} (${rd.activeRendererName ?? ''})`,
      `render time: ${rd.renderTimeMs.toFixed(2)} ms`,
      `pixel ratio: ${rd.pixelRatio} (device ${window.devicePixelRatio}), backing ${canvas.width}x${canvas.height}`,
      `live switch: ${rd.supportsLiveSwitch}`,
      `offscreen:   ${rd.offscreenSupported ? 'supported' : 'unsupported'}`,
      `warning:     ${rd.switchWarning ?? 'none'}`,
    ].join('\n');
  }

  if (isOpen('section-audio')) {
    const ad = state.audio;
    const f = ad.features;
    audioReadout.textContent = [
      `connected: ${ad.connected} (${ad.inputType ?? 'none'})`,
      `ready:     ${ad.ready}`,
      `mapping:   ${ad.mappingEnabled ? 'on' : 'off'}`,
      `error:     ${ad.error ?? 'none'}`,
      `update:    ${ad.updateTimeMs.toFixed(2)} ms`,
      f ? `transient: ${f.transient.toFixed(3)}  beat: ${f.beat.toFixed(3)}` : 'features:  none',
    ].join('\n');
    if (f) updateAudioMeters(f);
  }

  if (isOpen('section-input')) {
    const id = state.input;
    const mapping = engine.getInputMapping();
    const cc = (mapping.ccMappings ?? []).map((m) => `  CC${m.controller} -> ${m.target.type}`);
    const learned = (mapping.learnedMappings ?? []).map(
      (m) => `  CC${m.controller} -> ${m.target.type}${m.target.type === 'control' ? ` (${m.target.control})` : ''}`,
    );
    const notes = engine.getInputNoteMonitor().slice(0, 6);
    inputReadout.textContent = [
      `midi:     ${id.midiConnected ? (id.deviceName ?? 'connected') : 'off'}`,
      `keyboard: ${id.keyboardEnabled ? 'on' : 'off'}`,
      `pointer:  ${id.pointerEnabled ? `${id.pointer.x.toFixed(2)}, ${id.pointer.y.toFixed(2)} ${id.pointer.down ? `down x${id.pointer.pointers} p=${id.pointer.pressure.toFixed(2)}` : 'up'}` : 'off'}`,
      `learn:    ${id.learnMode ? (id.learnTarget ?? 'active') : 'off'}`,
      `notes:    ${id.activeNotes.join(', ') || 'none'}`,
      `error:    ${id.error ?? 'none'}`,
      `mappings: ${id.mappingCount} (+${id.learnedCount} learned)`,
      ...cc,
      ...learned,
      ...notes.map((n) => `  ${n.type === 'on' ? 'ON ' : 'OFF'} ${n.note} v=${n.velocity} [${n.source}]`),
    ].join('\n');
  }

  if (isOpen('section-export')) {
    const ex = state.export;
    const rec = ex.recording;
    const pb = ex.playback;
    recordingStatus.textContent = `${rec.state}, ${rec.frameCount} frames (${rec.duration.toFixed(1)}s @ ${rec.frameRate}fps)`;
    recordingStatus.style.color = rec.state === 'recording' ? '#ff4444' : '';
    exportReadout.textContent = [
      `playback:    ${pb.active ? (pb.playing ? 'playing' : 'holding') : 'released'} frame ${pb.frameIndex + 1}/${pb.frameCount}`,
      `last export: ${ex.lastExport ?? 'none'}`,
    ].join('\n');
  }

  if (isOpen('section-performance')) {
    const p = state.performance;
    performanceReadout.textContent = [
      `fps:         ${Math.round(p.fps)} (target ${p.fpsTarget})`,
      `frame:       ${p.frameTimeMs.toFixed(2)} ms, slowest ${p.slowestPhase ?? 'none'} ${p.slowestPhaseMs.toFixed(2)} ms`,
      `update:      ${p.updateTimeMs.toFixed(2)} ms, render ${p.renderTimeMs.toFixed(2)} ms`,
      `quality:     ${p.quality}${p.adaptiveQuality ? ' (adaptive)' : ''}`,
      `glyphs:      ${p.glyphCount}, particles ${p.particleCount}, draw calls ${p.drawCalls}`,
      `dirty cells: ${p.render.dirtyCells}${p.render.partialUpdate ? ' (partial)' : ''}`,
      `glyph cache: ${p.glyphAtlasHits} hits / ${p.glyphAtlasMisses} miss`,
      `memory est:  ${(p.memory.estimatedBytes / 1024).toFixed(1)} KB, pool ${p.memory.poolAvailable}`,
    ].join('\n');
    drawFpsGraph(p.fpsHistory);
  }

  if (isOpen('section-scripting')) {
    const sd = state.script;
    scriptStatusEl.textContent = sd.activeScriptId
      ? `${sd.activeScriptId}: ${sd.state}${sd.error ? ` (${sd.error})` : ''}, ${sd.frameCount} frames`
      : 'idle';
    scriptConsoleEl.textContent =
      sd.logs.length > 0 ? sd.logs.slice(-30).map((l) => `[${l.level}] ${l.message}`).join('\n') : '(console empty)';
    const vars = engine.getScriptEngine().getContextVars();
    scriptVarsEl.textContent = Object.keys(vars).length > 0 ? JSON.stringify(vars, null, 2) : '(no vars)';
  }
}

for (const section of document.querySelectorAll<HTMLDetailsElement>('details')) {
  section.addEventListener('toggle', () => refreshReadouts());
}

engine.on('frame', () => refreshReadouts());
engine.on('input', () => refreshReadouts());

// ---------------------------------------------------------------------------
// Keys and window
// ---------------------------------------------------------------------------

window.addEventListener('keydown', (event) => {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return;
  }
  if (event.key === 'h' || event.key === 'H') {
    event.preventDefault();
    document.body.classList.toggle('ui-hidden');
    refreshReadouts();
  } else if (event.code === 'Space') {
    event.preventDefault();
    triggerBurst(0.5, 0.5, 1.8);
  }
});

window.addEventListener('resize', () => {
  handle.resize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

presetSelect.value = bootPreset.id;
buildPresetControls(bootPreset);
syncSlidersFromEngine();
syncCompositionFromEngine();
refreshReadouts();
