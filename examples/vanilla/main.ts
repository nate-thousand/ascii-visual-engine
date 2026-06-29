import {
  AsciiEngine,
  listPresets,
  motionCatalog,
  simulationCatalog,
  pluginCatalog,
  listPostPassIds,
  warnUnknownPreset,
  KNOWN_CONTROLS,
  BUILTIN_GLYPH_LANGUAGES,
  createDefaultMappings,
  type AsciiPreset,
  type BlendMode,
  type EngineDebugState,
  type Plugin,
  type PresetId,
  type RendererId,
  type QualityPresetId,
  type AudioFeatureMapping,
} from 'ascii-visual-engine';
import { galleryScripts } from '../scripts';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const domOutput = document.getElementById('dom-output') as HTMLPreElement;
const uiPanel = document.getElementById('ui') as HTMLDivElement;
const uiToggle = document.getElementById('ui-toggle') as HTMLButtonElement;
const controlWarningsEl = document.getElementById('control-warnings') as HTMLDivElement;
const presetSelect = document.getElementById('preset') as HTMLSelectElement;
const effectPluginList = document.getElementById('effect-plugins') as HTMLDivElement;
const patternPluginList = document.getElementById('pattern-plugins') as HTMLDivElement;
const motionPluginList = document.getElementById('motion-plugins') as HTMLDivElement;
const simulationPluginList = document.getElementById('simulation-plugins') as HTMLDivElement;
const debugPanel = document.getElementById('debug-panel') as HTMLPreElement;
const motionDebugPanel = document.getElementById('motion-debug-panel') as HTMLPreElement;
const simulationDebugPanel = document.getElementById('simulation-debug-panel') as HTMLPreElement;
const sourceDebugPanel = document.getElementById('source-debug-panel') as HTMLPreElement;
const rendererDebugPanel = document.getElementById('renderer-debug-panel') as HTMLPreElement;
const compositingDebugPanel = document.getElementById('compositing-debug-panel') as HTMLPreElement;
const layerControls = document.getElementById('layer-controls') as HTMLDivElement;
const postPassList = document.getElementById('post-passes') as HTMLDivElement;
const layerBlendSelect = document.getElementById('layer-blend-mode') as HTMLSelectElement;
const layerOpacitySlider = document.getElementById('layer-opacity') as HTMLInputElement;
const layerOpacityValue = document.getElementById('layer-opacity-value') as HTMLSpanElement;
const addLayerBtn = document.getElementById('add-layer') as HTMLButtonElement;
const resetCompositionBtn = document.getElementById('reset-composition') as HTMLButtonElement;
const audioDebugPanel = document.getElementById('audio-debug-panel') as HTMLPreElement;
const startMicrophoneBtn = document.getElementById('start-microphone') as HTMLButtonElement;
const audioFileInput = document.getElementById('audio-file-input') as HTMLInputElement;
const disconnectAudioBtn = document.getElementById('disconnect-audio') as HTMLButtonElement;
const audioErrorEl = document.getElementById('audio-error') as HTMLDivElement;
const audioElement = document.createElement('audio');
audioElement.style.display = 'none';
document.body.appendChild(audioElement);

const audioMeterIds = ['amplitude', 'bass', 'mid', 'treble', 'transient'] as const;
type AudioMeterId = (typeof audioMeterIds)[number];
const audioMeterValues = Object.fromEntries(
  audioMeterIds.map((id) => [id, document.getElementById(`meter-${id}`) as HTMLSpanElement]),
) as Record<AudioMeterId, HTMLSpanElement>;
const audioMeterBars = Object.fromEntries(
  audioMeterIds.map((id) => [id, document.getElementById(`bar-${id}`) as HTMLDivElement]),
) as Record<AudioMeterId, HTMLDivElement>;

const audioSliderIds = [
  'audioAttack',
  'audioRelease',
  'audioSensitivity',
  'audioNoiseGate',
  'audioMinThreshold',
  'audioMaxClamp',
] as const;
type AudioSliderId = (typeof audioSliderIds)[number];
const audioSliders = Object.fromEntries(
  audioSliderIds.map((id) => [id, document.getElementById(id) as HTMLInputElement]),
) as Record<AudioSliderId, HTMLInputElement>;
const audioSliderValues = Object.fromEntries(
  audioSliderIds.map((id) => [id, document.getElementById(`${id}-value`) as HTMLSpanElement]),
) as Record<AudioSliderId, HTMLSpanElement>;

const inputDebugPanel = document.getElementById('input-debug-panel') as HTMLPreElement;
const glyphDebugPanel = document.getElementById('glyph-debug-panel') as HTMLPreElement;
const exportDebugPanel = document.getElementById('export-debug-panel') as HTMLPreElement;
const scriptDebugPanel = document.getElementById('script-debug-panel') as HTMLPreElement;
const scriptSelect = document.getElementById('script-select') as HTMLSelectElement;
const scriptConsoleEl = document.getElementById('script-console') as HTMLPreElement;
const scriptVarsEl = document.getElementById('script-vars') as HTMLPreElement;
const scriptStatusEl = document.getElementById('script-status') as HTMLDivElement;
const runScriptBtn = document.getElementById('run-script') as HTMLButtonElement;
const stopScriptBtn = document.getElementById('stop-script') as HTMLButtonElement;
const reloadScriptBtn = document.getElementById('reload-script') as HTMLButtonElement;
const restartScriptBtn = document.getElementById('restart-script') as HTMLButtonElement;
const enableScriptBtn = document.getElementById('enable-script') as HTMLButtonElement;
const disableScriptBtn = document.getElementById('disable-script') as HTMLButtonElement;
const clearScriptConsoleBtn = document.getElementById('clear-script-console') as HTMLButtonElement;
const performanceDebugPanel = document.getElementById('performance-debug-panel') as HTMLPreElement;
const qualityPresetSelect = document.getElementById('quality-preset') as HTMLSelectElement;
const adaptiveQualityToggle = document.getElementById('adaptive-quality') as HTMLInputElement;
const dirtyRenderingToggle = document.getElementById('dirty-rendering') as HTMLInputElement;
const spatialGridToggle = document.getElementById('spatial-grid') as HTMLInputElement;
const fpsTargetSlider = document.getElementById('fps-target') as HTMLInputElement;
const fpsTargetValue = document.getElementById('fps-target-value') as HTMLSpanElement;
const fpsGraphCanvas = document.getElementById('fps-graph') as HTMLCanvasElement;
const fpsGraphCtx = fpsGraphCanvas.getContext('2d')!;
const recordingIndicator = document.getElementById('recording-indicator') as HTMLDivElement;
const frameCounter = document.getElementById('frame-counter') as HTMLDivElement;
const exportErrorEl = document.getElementById('export-error') as HTMLDivElement;
const midiDeviceSelect = document.getElementById('midi-device') as HTMLSelectElement;
const connectMidiBtn = document.getElementById('connect-midi') as HTMLButtonElement;
const disconnectMidiBtn = document.getElementById('disconnect-midi') as HTMLButtonElement;
const keyboardInputToggle = document.getElementById('keyboard-input-toggle') as HTMLInputElement;
const inputPanicBtn = document.getElementById('input-panic') as HTMLButtonElement;
const midiErrorEl = document.getElementById('midi-error') as HTMLDivElement;
const learnControlSelect = document.getElementById('learn-control') as HTMLSelectElement;
const startLearnBtn = document.getElementById('start-learn') as HTMLButtonElement;
const clearLearnedBtn = document.getElementById('clear-learned') as HTMLButtonElement;
const resetInputMappingBtn = document.getElementById('reset-input-mapping') as HTMLButtonElement;
const mappingTable = document.getElementById('mapping-table') as HTMLPreElement;
const noteMonitor = document.getElementById('note-monitor') as HTMLPreElement;
const ccMonitor = document.getElementById('cc-monitor') as HTMLPreElement;
const glyphLanguageSelect = document.getElementById('glyph-language') as HTMLSelectElement;
const glyphSetInput = document.getElementById('glyph-set-input') as HTMLInputElement;
const audioMapBassSelect = document.getElementById('audio-map-bass') as HTMLSelectElement;
const audioMapMidSelect = document.getElementById('audio-map-mid') as HTMLSelectElement;
const audioMapTrebleSelect = document.getElementById('audio-map-treble') as HTMLSelectElement;
const audioMappingEnabledToggle = document.getElementById('audio-mapping-enabled') as HTMLInputElement;
const rendererModeSelect = document.getElementById('renderer-mode') as HTMLSelectElement;
const rendererWarning = document.getElementById('renderer-warning') as HTMLDivElement;
const sourceModeSelect = document.getElementById('source-mode') as HTMLSelectElement;
const sourceFitSelect = document.getElementById('source-fit') as HTMLSelectElement;
const imageInput = document.getElementById('image-input') as HTMLInputElement;
const videoInput = document.getElementById('video-input') as HTMLInputElement;
const imageInputLabel = document.getElementById('image-input-label') as HTMLLabelElement;
const videoInputLabel = document.getElementById('video-input-label') as HTMLLabelElement;
const startWebcamBtn = document.getElementById('start-webcam') as HTMLButtonElement;

const sourceSliderIds = ['sourceContrast', 'sourceEdge', 'sourceBlend'] as const;
type SourceSliderId = (typeof sourceSliderIds)[number];
const sourceSliders = Object.fromEntries(
  sourceSliderIds.map((id) => [id, document.getElementById(id) as HTMLInputElement]),
) as Record<SourceSliderId, HTMLInputElement>;
const sourceValueDisplays = Object.fromEntries(
  sourceSliderIds.map((id) => [
    id,
    document.getElementById(`${id}-value`) as HTMLSpanElement,
  ]),
) as Record<SourceSliderId, HTMLSpanElement>;

const demoCanvas = document.createElement('canvas');
demoCanvas.width = 320;
demoCanvas.height = 240;
const demoCtx = demoCanvas.getContext('2d')!;
let canvasAnimAngle = 0;

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
const simulationCheckboxes = new Map<string, HTMLInputElement>();
const layerCheckboxes = new Map<string, HTMLInputElement>();
const postPassCheckboxes = new Map<string, HTMLInputElement>();
let activeLayerId: string | null = null;
let layerCounter = 0;

const ccMonitorHistory: string[] = [];
const controlWarningMessages = new Set<string>();
const AUDIO_MAP_CONTROL_OPTIONS = [
  '',
  'density',
  'speed',
  'strength',
  'glitchAmount',
  'trailAmount',
  'simSpawnRate',
  'postFeedback',
  'postSmear',
  'postThreshold',
  'postEdge',
] as const;

const DEFAULT_DEMO_PRESET_ID: PresetId = 'ambient';

function showControlWarning(message: string): void {
  controlWarningMessages.add(message);
  controlWarningsEl.textContent = [...controlWarningMessages].join('\n');
  controlWarningsEl.classList.add('visible');
}

function assertEngineControl(name: string): boolean {
  if (KNOWN_CONTROLS.has(name)) return true;
  showControlWarning(`Control "${name}" is not wired on the engine.`);
  return false;
}

function bindEngineSlider(
  controlName: string,
  slider: HTMLInputElement,
  valueEl: HTMLElement | null,
  format: (value: number) => string = (v) => v.toFixed(2),
  onChange?: (value: number) => void,
): void {
  if (!assertEngineControl(controlName)) return;
  const apply = (value: number) => {
    if (valueEl) valueEl.textContent = format(value);
    engine.setControl(controlName, value);
    onChange?.(value);
    updateDebugPanel();
  };
  apply(parseFloat(slider.value));
  slider.addEventListener('input', () => apply(parseFloat(slider.value)));
}

function populateSelectOptions(select: HTMLSelectElement, options: readonly string[], labels?: Record<string, string>): void {
  select.innerHTML = '';
  for (const value of options) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = labels?.[value] ?? (value || '(none)');
    select.appendChild(opt);
  }
}

function buildAudioMappingFromUi(): AudioFeatureMapping[] {
  const mappings: AudioFeatureMapping[] = [];
  const bassTarget = audioMapBassSelect.value;
  const midTarget = audioMapMidSelect.value;
  const trebleTarget = audioMapTrebleSelect.value;
  if (bassTarget) {
    mappings.push({
      feature: 'bass',
      target: { type: 'control', control: bassTarget, base: 0.3, amount: 0.7, min: 0, max: 1 },
    });
  }
  if (midTarget) {
    mappings.push({
      feature: 'mid',
      target: { type: 'control', control: midTarget, base: 0.4, amount: 0.5, min: 0, max: 1 },
    });
  }
  if (trebleTarget) {
    mappings.push({
      feature: 'treble',
      target: { type: 'control', control: trebleTarget, base: 0.2, amount: 0.8, min: 0, max: 1 },
    });
  }
  mappings.push({
    feature: 'transient',
    target: { type: 'noteOn', minIntensity: 0.6, maxIntensity: 1.4, cooldownMs: 120 },
  });
  return mappings;
}

function applyAudioMappingFromUi(): void {
  engine.setAudioMapping({
    enabled: audioMappingEnabledToggle.checked,
    mappings: buildAudioMappingFromUi(),
  });
  updateDebugPanel();
}

function syncAliasVisualSliders(): void {
  const density = engine.getControl('density', 1);
  const strength = engine.getControl('strength', 0.7);
  const contrast = engine.getControl('sourceContrast', 1);

  const scaleSlider = document.getElementById('scale') as HTMLInputElement;
  const brightnessSlider = document.getElementById('brightness') as HTMLInputElement;
  const contrastSlider = document.getElementById('contrast') as HTMLInputElement;

  scaleSlider.value = String(density);
  document.getElementById('scale-value')!.textContent = density.toFixed(2);
  brightnessSlider.value = String(strength);
  document.getElementById('brightness-value')!.textContent = strength.toFixed(2);
  contrastSlider.value = String(contrast);
  document.getElementById('contrast-value')!.textContent = contrast.toFixed(2);
}

function recordCcEvent(event: EngineDebugState['input']['lastEvent']): void {
  if (!event || event.type !== 'controlChange' || event.controller === undefined) return;
  const line = `CC${event.controller} = ${event.value ?? 0} [${event.source}]`;
  ccMonitorHistory.unshift(line);
  if (ccMonitorHistory.length > 12) ccMonitorHistory.length = 12;
  ccMonitor.textContent = ccMonitorHistory.join('\n') || 'cc: —';
}

const postSliderIds = [
  'postFeedback',
  'postSmear',
  'postDisplacement',
  'postThreshold',
  'postInvert',
  'postEdge',
  'postPosterize',
  'postScanline',
  'postDither',
] as const;
type PostSliderId = (typeof postSliderIds)[number];
const postSliders = Object.fromEntries(
  postSliderIds.map((id) => [id, document.getElementById(id) as HTMLInputElement]),
) as Record<PostSliderId, HTMLInputElement>;
const postValueDisplays = Object.fromEntries(
  postSliderIds.map((id) => [
    id,
    document.getElementById(`${id}-value`) as HTMLSpanElement,
  ]),
) as Record<PostSliderId, HTMLSpanElement>;

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
const simulationPluginIds = [
  'particle',
  'boids',
  'cellularAutomata',
  'reactionDiffusion',
  'lsystem',
  'gravity',
  'spring',
  'fluid',
];

const simSliderIds = ['simStrength', 'simSpeed', 'simDensity', 'simSpawnRate', 'simDecay'] as const;
type SimSliderId = (typeof simSliderIds)[number];
const simSliders = Object.fromEntries(
  simSliderIds.map((id) => [id, document.getElementById(id) as HTMLInputElement]),
) as Record<SimSliderId, HTMLInputElement>;
const simValueDisplays = Object.fromEntries(
  simSliderIds.map((id) => [id, document.getElementById(`${id}-value`) as HTMLSpanElement]),
) as Record<SimSliderId, HTMLSpanElement>;

for (const preset of allPresets) {
  const option = document.createElement('option');
  option.value = preset.id;
  option.textContent = preset.name;
  presetSelect.appendChild(option);
}

for (const lang of BUILTIN_GLYPH_LANGUAGES) {
  const opt = document.createElement('option');
  opt.value = lang.id;
  opt.textContent = lang.name;
  glyphLanguageSelect.appendChild(opt);
}

populateSelectOptions(audioMapBassSelect, AUDIO_MAP_CONTROL_OPTIONS, {
  '': '(none)',
  density: 'Density',
  speed: 'Speed',
  strength: 'Strength',
  glitchAmount: 'Glitch',
  trailAmount: 'Trails',
  simSpawnRate: 'Particle Spawn',
  postFeedback: 'Post Feedback',
  postSmear: 'Post Smear',
  postThreshold: 'Post Threshold',
  postEdge: 'Post Edge',
});
populateSelectOptions(audioMapMidSelect, AUDIO_MAP_CONTROL_OPTIONS, {
  '': '(none)',
  density: 'Density',
  speed: 'Speed',
  strength: 'Strength',
  glitchAmount: 'Glitch',
  trailAmount: 'Trails',
  simSpawnRate: 'Particle Spawn',
  postFeedback: 'Post Feedback',
  postSmear: 'Post Smear',
  postThreshold: 'Post Threshold',
  postEdge: 'Post Edge',
});
populateSelectOptions(audioMapTrebleSelect, AUDIO_MAP_CONTROL_OPTIONS, {
  '': '(none)',
  density: 'Density',
  speed: 'Speed',
  strength: 'Strength',
  glitchAmount: 'Glitch',
  trailAmount: 'Trails',
  simSpawnRate: 'Particle Spawn',
  postFeedback: 'Post Feedback',
  postSmear: 'Post Smear',
  postThreshold: 'Post Threshold',
  postEdge: 'Post Edge',
});
audioMapBassSelect.value = 'glitchAmount';
audioMapMidSelect.value = 'trailAmount';
audioMapTrebleSelect.value = 'density';

function getViewportSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

const { width, height } = getViewportSize();

const engine = new AsciiEngine({
  canvas,
  element: domOutput,
  preset: allPresets.find((p) => p.id === DEFAULT_DEMO_PRESET_ID) ?? allPresets[0],
  width,
  height,
});

applyAudioMappingFromUi();

engine.registerScripts(galleryScripts);
engine.getScriptEngine().setHotReload(import.meta.env.DEV);

for (const script of galleryScripts) {
  const opt = document.createElement('option');
  opt.value = script.id;
  opt.textContent = script.name ?? script.id;
  scriptSelect.appendChild(opt);
}

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
    if (assertEngineControl(id)) {
      engine.setControl(id, value);
    }
  }
  syncAliasVisualSliders();
  if (glyphSetInput && preset.glyphSet?.length) {
    glyphSetInput.placeholder = preset.glyphSet.join('');
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

function syncSimulationsFromEngine() {
  const enabled = new Set(engine.getEnabledSimulations().map((s) => s.id));
  for (const [id, checkbox] of simulationCheckboxes) {
    checkbox.checked = enabled.has(id);
  }
}

function syncLayersFromEngine() {
  const layers = engine.getLayerManager().getAll();
  layerControls.innerHTML = '';
  layerCheckboxes.clear();

  for (const layer of layers) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = layer.enabled;
    checkbox.id = `layer-${layer.id}`;

    const text = document.createElement('span');
    text.textContent = `${layer.name} (${layer.blendMode})`;

    label.appendChild(checkbox);
    label.appendChild(text);
    layerControls.appendChild(label);
    layerCheckboxes.set(layer.id, checkbox);

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) engine.getLayerManager().enableLayer(layer.id);
      else engine.getLayerManager().disableLayer(layer.id);
      updateDebugPanel();
    });

    label.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      activeLayerId = layer.id;
      layerBlendSelect.value = layer.blendMode;
      layerOpacitySlider.value = String(layer.opacity);
      layerOpacityValue.textContent = layer.opacity.toFixed(2);
    });
  }

  if (!activeLayerId && layers.length > 0) {
    activeLayerId = layers[0].id;
    layerBlendSelect.value = layers[0].blendMode;
    layerOpacitySlider.value = String(layers[0].opacity);
    layerOpacityValue.textContent = layers[0].opacity.toFixed(2);
  }
}

function syncPostPassesFromEngine() {
  const enabled = new Set(engine.getPostProcessor().getEnabled().map((p) => p.id));
  for (const [id, checkbox] of postPassCheckboxes) {
    checkbox.checked = enabled.has(id);
  }
}

function updateCompositingDebugPanel() {
  const cd = engine.getDebugState().compositing;
  const pp = engine.getDebugState().postProcessing;
  compositingDebugPanel.textContent = [
    `layers:       ${cd.enabledCount}/${cd.layerCount}`,
    `render:       ${cd.renderTimeMs.toFixed(2)} ms`,
    ...cd.layers.map((l) => `  [${l.order}] ${l.id} ${l.blendMode} o=${l.opacity.toFixed(2)} ${l.enabled ? 'on' : 'off'}`),
    `post passes:  ${pp.enabledPasses.join(', ') || '(none)'}`,
    `post time:    ${pp.processTimeMs.toFixed(2)} ms`,
    `feedback:     ${pp.feedbackActive ? 'active' : 'off'}`,
  ].join('\n');
}

function formatNoteOn(note: EngineDebugState['lastNoteOn']): string {
  if (!note) return '—';
  const x = note.x?.toFixed(2) ?? '?';
  const y = note.y?.toFixed(2) ?? '?';
  const intensity = note.intensity?.toFixed(2) ?? '?';
  return `x=${x} y=${y} i=${intensity}`;
}

function updateSourceDebugPanel() {
  const state = engine.getDebugState().source;
  sourceDebugPanel.textContent = [
    `mode:         ${state.mode}`,
    `active:       ${state.activeSourceId ?? '(none)'}`,
    `type:         ${state.activeSourceType ?? '—'}`,
    `ready:        ${state.ready}`,
    `error:        ${state.error ?? '—'}`,
    `size:         ${state.width}×${state.height}`,
    `fit:          ${state.fitMode}`,
  ].join('\n');
}

function updateRendererDebugPanel() {
  const rd = engine.getDebugState().renderer;
  rendererDebugPanel.textContent = [
    `active:       ${rd.activeRendererId ?? '(none)'}`,
    `name:         ${rd.activeRendererName ?? '—'}`,
    `type:         ${rd.activeRendererType ?? '—'}`,
    `available:    ${rd.available}`,
    `live switch:  ${rd.supportsLiveSwitch}`,
    `offscreen:    ${rd.offscreenSupported ? 'supported' : 'unsupported'}`,
    `warning:      ${rd.switchWarning ?? '—'}`,
  ].join('\n');
}

function updateOutputVisibility(rendererId: RendererId | null) {
  const useDom = rendererId === 'dom';
  canvas.style.display = useDom ? 'none' : 'block';
  domOutput.style.display = useDom ? 'block' : 'none';
}

function updateAudioDebugPanel() {
  const ad = engine.getDebugState().audio;
  const f = ad.features;
  audioDebugPanel.textContent = [
    `connected:    ${ad.connected}`,
    `input:        ${ad.inputType ?? '—'}`,
    `ready:        ${ad.ready}`,
    `error:        ${ad.error ?? '—'}`,
    `mapping:      ${ad.mappingEnabled ? 'on' : 'off'}`,
    `update:       ${ad.updateTimeMs.toFixed(2)} ms`,
    f ? `amp:          ${f.amplitude.toFixed(3)}` : 'amp:          —',
    f ? `bass:         ${f.bass.toFixed(3)}` : 'bass:         —',
    f ? `mid:          ${f.mid.toFixed(3)}` : 'mid:          —',
    f ? `treble:       ${f.treble.toFixed(3)}` : 'treble:       —',
    f ? `transient:    ${f.transient.toFixed(3)}` : 'transient:    —',
    f ? `beat:         ${f.beat.toFixed(3)}` : 'beat:         —',
  ].join('\n');

  if (f) {
    updateAudioMeters(f);
  }
}

function updateExportDebugPanel() {
  const ex = engine.getDebugState().export;
  const rec = ex.recording;
  const pb = ex.playback;
  exportDebugPanel.textContent = [
    `recording:    ${rec.state} (${rec.frameCount} frames, ${rec.duration.toFixed(2)}s @ ${rec.frameRate}fps)`,
    `playback:     ${pb.playing ? 'playing' : pb.paused ? 'paused' : 'stopped'} frame ${pb.frameIndex + 1}/${pb.frameCount}`,
    `last export:  ${ex.lastExport ?? '—'}`,
  ].join('\n');

  recordingIndicator.textContent =
    rec.state === 'recording'
      ? '● REC'
      : rec.state === 'paused'
        ? '● paused'
        : '● idle';
  recordingIndicator.style.color =
    rec.state === 'recording' ? '#ff4444' : rec.state === 'paused' ? '#ffaa00' : '#888';

  frameCounter.textContent = `frames: ${rec.frameCount}`;
}

function updateScriptDebugPanel() {
  const sd = engine.getDebugState().script;
  scriptDebugPanel.textContent = [
    `active:       ${sd.activeScriptId ?? '(none)'}`,
    `state:        ${sd.state}`,
    `error:        ${sd.error ?? '—'}`,
    `frames:       ${sd.frameCount}`,
    `logs:         ${sd.logs.length}`,
  ].join('\n');

  scriptStatusEl.textContent = sd.activeScriptId
    ? `${sd.activeScriptId} — ${sd.state}${sd.error ? ` (${sd.error})` : ''}`
    : 'idle';

  scriptConsoleEl.textContent =
    sd.logs.length > 0
      ? sd.logs
          .slice(-30)
          .map((l) => `[${l.level}] ${l.message}`)
          .join('\n')
      : '(empty)';

  const vars = engine.getScriptEngine().getContextVars();
  scriptVarsEl.textContent =
    Object.keys(vars).length > 0 ? JSON.stringify(vars, null, 2) : '(no vars)';
}

function drawFpsGraph(history: number[]): void {
  const w = fpsGraphCanvas.width;
  const h = fpsGraphCanvas.height;
  fpsGraphCtx.fillStyle = 'rgba(0,0,0,0.6)';
  fpsGraphCtx.fillRect(0, 0, w, h);
  if (history.length < 2) return;
  fpsGraphCtx.strokeStyle = '#00ff88';
  fpsGraphCtx.lineWidth = 1;
  fpsGraphCtx.beginPath();
  const maxFps = 120;
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

function updatePerformanceDebugPanel() {
  const p = engine.getDebugState().performance;
  const rd = engine.getDebugState().renderer;
  const ad = engine.getDebugState().audio;

  performanceDebugPanel.textContent = [
    `fps:          ${p.fps} (target ${p.fpsTarget})`,
    `frame:        ${p.frameTimeMs.toFixed(2)} ms`,
    `update:       ${p.updateTimeMs.toFixed(2)} ms`,
    `render:       ${p.renderTimeMs.toFixed(2)} ms`,
    `simulation:   ${p.simulationTimeMs.toFixed(2)} ms`,
    `plugins:      ${p.pluginTimeMs.toFixed(2)} ms`,
    `slowest:      ${p.slowestPhase ?? '—'} (${p.slowestPhaseMs.toFixed(2)} ms)`,
    `quality:      ${p.quality}${p.adaptiveQuality ? ' (adaptive)' : ''}`,
    `glyphs:       ${p.glyphCount}`,
    `particles:    ${p.particleCount}`,
    `layers:       ${p.layerCount}`,
    `draw calls:   ${p.drawCalls}`,
    `dirty cells:  ${p.render.dirtyCells}${p.render.partialUpdate ? ' (partial)' : ''}`,
    `memory est:   ${(p.memory.estimatedBytes / 1024).toFixed(1)} KB`,
    `pool avail:   ${p.memory.poolAvailable}`,
    `glyph cache:  ${p.glyphAtlasHits} hits / ${p.glyphAtlasMisses} miss`,
    `workers:      ${p.workers.enabled ? `${p.workers.workerCount} active, ${p.workers.pendingTasks} pending` : 'off'}`,
    `renderer:     ${rd.activeRendererId ?? '—'} (${rd.renderTimeMs.toFixed(2)} ms)`,
    `source:       ${p.sourceMode ?? '—'}`,
    `audio latency:${p.audioLatencyMs.toFixed(2)} ms (connected: ${ad.connected})`,
  ].join('\n');

  drawFpsGraph(p.fpsHistory);
}

function updateGlyphDebugPanel() {
  const gd = engine.getDebugState().glyph;
  const sample = gd.sampleCell;
  glyphDebugPanel.textContent = [
    `enabled:      ${gd.enabled}`,
    `language:     ${gd.languageName ?? gd.languageId ?? '—'}`,
    `categories:   ${gd.categories.join(', ') || '—'}`,
    `glyph count:  ${gd.glyphCount}`,
    `atlas hits:   ${gd.atlasHits}`,
    `morph:        ${gd.morphState}`,
    `animation:    ${gd.animationState}`,
    sample ? `sample char:  ${sample.character}` : 'sample char:  —',
    sample ? `category:     ${sample.category}` : '',
    sample ? `role:         ${sample.role}` : '',
    sample ? `morph:        ${(sample.morphProgress * 100).toFixed(0)}% [${sample.morphIndex}]` : '',
    sample ? `anim:         ${sample.animKind ?? '—'} phase=${sample.animPhase.toFixed(2)}` : '',
    sample ? `weight:       ${sample.weight.toFixed(2)}` : '',
    sample ? `density:      ${sample.density.toFixed(2)}` : '',
    sample ? `unicode:      U+${sample.unicode.toString(16).toUpperCase().padStart(4, '0')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function updateInputDebugPanel() {
  const id = engine.getDebugState().input;
  inputDebugPanel.textContent = [
    `midi:         ${id.midiConnected ? id.deviceName ?? 'connected' : 'off'}`,
    `keyboard:     ${id.keyboardEnabled ? 'on' : 'off'}`,
    `learn:        ${id.learnMode ? id.learnTarget ?? 'active' : 'off'}`,
    `active notes: ${id.activeNotes.join(', ') || '(none)'}`,
    `mappings:     ${id.mappingCount} (+ ${id.learnedCount} learned)`,
    `error:        ${id.error ?? '—'}`,
  ].join('\n');

  const mapping = engine.getInputMapping();
  const ccLines = (mapping.ccMappings ?? []).map((m) => `  CC${m.controller} → ${m.target.type}`);
  const learnedLines = (mapping.learnedMappings ?? []).map(
    (m) => `  CC${m.controller} → ${m.target.type}${m.target.type === 'control' ? ` (${m.target.control})` : ''}`,
  );
  mappingTable.textContent = ['cc:', ...ccLines, 'learned:', ...learnedLines].join('\n') || 'mappings: —';

  const notes = engine.getInputNoteMonitor().slice(0, 8);
  noteMonitor.textContent = notes.length
    ? notes.map((n) => `${n.type === 'on' ? 'ON' : 'OFF'} ${n.note} v=${n.velocity} [${n.source}]`).join('\n')
    : 'notes: —';

  recordCcEvent(id.lastEvent);
}

function updateAudioMeters(features: NonNullable<ReturnType<typeof engine.getAudioFeatures>>) {
  const values: Record<AudioMeterId, number> = {
    amplitude: features.amplitude,
    bass: features.bass,
    mid: features.mid,
    treble: features.treble,
    transient: features.transient,
  };
  for (const id of audioMeterIds) {
    const v = values[id];
    audioMeterValues[id].textContent = v.toFixed(2);
    audioMeterBars[id].style.width = `${Math.round(v * 100)}%`;
  }
}

function updateSimulationDebugPanel() {
  const sd = engine.getDebugState().simulation;
  const lines = sd.activeSimulations.map(
    (s) => `  ${s.id} p=${s.particleCount} mem=${s.memoryBytes}B ${s.updateTimeMs.toFixed(2)}ms`,
  );
  simulationDebugPanel.textContent = [
    `active:       ${sd.activeSimulations.length}`,
    `particles:    ${sd.totalParticles}`,
    `memory:       ${sd.totalMemoryBytes} bytes`,
    `update time:  ${sd.updateTimeMs.toFixed(2)} ms`,
    `fps:          ${sd.fps}`,
    ...lines,
  ].join('\n');
}

function updateDebugPanel() {
  const state = engine.getDebugState();
  debugPanel.textContent = [
    `preset:       ${state.preset}`,
    `renderer:     ${state.renderer.activeRendererId ?? 'canvas'} (${state.renderer.activeRendererName ?? 'Canvas 2D'})`,
    `simulations:  ${state.simulation.activeSimulations.map((s) => s.id).join(', ') || '(none)'}`,
    `source:       ${state.source.mode}${state.source.activeSourceId ? ` (${state.source.activeSourceId})` : ''}`,
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

  updateSourceDebugPanel();
  updateRendererDebugPanel();
  updateSimulationDebugPanel();
  updateCompositingDebugPanel();
  updateAudioDebugPanel();
  updateInputDebugPanel();
  updateGlyphDebugPanel();
  updateExportDebugPanel();
  updateScriptDebugPanel();
  updatePerformanceDebugPanel();

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

function createSimulationCheckbox(id: string, container: HTMLElement) {
  const entry = simulationCatalog[id as keyof typeof simulationCatalog];
  if (!entry) return;

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = id;
  checkbox.id = `simulation-${id}`;

  const text = document.createElement('span');
  text.textContent = entry.name;

  label.appendChild(checkbox);
  label.appendChild(text);
  container.appendChild(label);
  simulationCheckboxes.set(id, checkbox);

  checkbox.addEventListener('change', () => {
    try {
      if (checkbox.checked) engine.enableSimulation(id);
      else engine.disableSimulation(id);
      updateDebugPanel();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      console.error(`Simulation "${id}" toggle failed:`, error);
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
for (const id of simulationPluginIds) createSimulationCheckbox(id, simulationPluginList);

for (const id of listPostPassIds()) {
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `post-${id}`;

  const text = document.createElement('span');
  text.textContent = id;

  label.appendChild(checkbox);
  label.appendChild(text);
  postPassList.appendChild(label);
  postPassCheckboxes.set(id, checkbox);

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) engine.getPostProcessor().enablePass(id);
    else engine.getPostProcessor().disablePass(id);
    updateDebugPanel();
  });
}

const initialPreset = engine.getPreset();
syncSlidersFromPreset(initialPreset);
syncPluginsFromEngine();
syncMotionsFromEngine();
syncSimulationsFromEngine();
syncLayersFromEngine();
syncPostPassesFromEngine();
presetSelect.value = initialPreset.id;
updateDebugPanel();

for (const id of postSliderIds) {
  const slider = postSliders[id];
  if (!slider) continue;
  bindEngineSlider(id, slider, postValueDisplays[id]);
}

for (const id of simSliderIds) {
  const slider = simSliders[id];
  if (!slider) continue;
  bindEngineSlider(id, slider, simValueDisplays[id]);
}

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
  syncSimulationsFromEngine();
  syncLayersFromEngine();
  syncPostPassesFromEngine();
  updateDebugPanel();
});

for (const id of sliderIds) {
  const slider = sliders[id];
  if (!slider) continue;
  bindEngineSlider(id, slider, valueDisplays[id], (v) => formatSliderValue(id, v), () => {
    if (id === 'density') syncAliasVisualSliders();
    if (id === 'strength') syncAliasVisualSliders();
  });
}

const scaleSlider = document.getElementById('scale') as HTMLInputElement;
bindEngineSlider('density', scaleSlider, document.getElementById('scale-value'), (v) => v.toFixed(2), (value) => {
  sliders.density.value = String(value);
  valueDisplays.density.textContent = formatSliderValue('density', value);
});

const brightnessSlider = document.getElementById('brightness') as HTMLInputElement;
bindEngineSlider('strength', brightnessSlider, document.getElementById('brightness-value'), (v) => v.toFixed(2), (value) => {
  sliders.strength.value = String(value);
  valueDisplays.strength.textContent = formatSliderValue('strength', value);
});

const contrastSlider = document.getElementById('contrast') as HTMLInputElement;
bindEngineSlider('sourceContrast', contrastSlider, document.getElementById('contrast-value'));

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
  syncSimulationsFromEngine();
  syncLayersFromEngine();
  syncPostPassesFromEngine();
  updateDebugPanel();
}

layerBlendSelect.addEventListener('change', () => {
  if (!activeLayerId) return;
  const layer = engine.getLayerManager().getLayer(activeLayerId);
  if (layer) {
    layer.blendMode = layerBlendSelect.value as BlendMode;
    syncLayersFromEngine();
    updateDebugPanel();
  }
});

layerOpacitySlider.addEventListener('input', () => {
  const value = parseFloat(layerOpacitySlider.value);
  layerOpacityValue.textContent = value.toFixed(2);
  if (!activeLayerId) return;
  const layer = engine.getLayerManager().getLayer(activeLayerId);
  if (layer) {
    layer.opacity = value;
    updateDebugPanel();
  }
});

addLayerBtn.addEventListener('click', () => {
  layerCounter += 1;
  const id = `layer-${layerCounter}`;
  const patterns = ['radialSymmetry', 'spiral', 'wavePattern', 'grid'];
  const pattern = patterns[layerCounter % patterns.length];
  engine.getLayerManager().addLayer({
    id,
    name: `Layer ${layerCounter}`,
    opacity: 0.6,
    blendMode: 'add',
    pattern,
    mask: { type: 'radial', amount: 0.9 },
  });
  activeLayerId = id;
  syncLayersFromEngine();
  updateDebugPanel();
});

resetCompositionBtn.addEventListener('click', () => {
  engine.resetComposition();
  syncLayersFromEngine();
  syncPostPassesFromEngine();
  updateDebugPanel();
});

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
engine.on('source', () => updateDebugPanel());
engine.on('simulation', () => updateDebugPanel());
engine.on('renderer', () => updateDebugPanel());
engine.on('audio', () => updateAudioDebugPanel());
engine.on('input', () => updateInputDebugPanel());

async function refreshMidiDevices() {
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
  const deviceId = midiDeviceSelect.value || undefined;
  const result = await engine.connectMidi(deviceId);
  if (!result.ok) {
    midiErrorEl.textContent = result.error ?? 'MIDI connection failed';
  }
  updateDebugPanel();
});

disconnectMidiBtn.addEventListener('click', () => {
  engine.disconnectMidi();
  midiErrorEl.textContent = '';
  updateDebugPanel();
});

keyboardInputToggle.addEventListener('change', () => {
  if (keyboardInputToggle.checked) engine.enableKeyboardInput();
  else engine.disableKeyboardInput();
  updateDebugPanel();
});

inputPanicBtn.addEventListener('click', () => {
  engine.inputPanic();
  updateDebugPanel();
});

startLearnBtn.addEventListener('click', () => {
  const control = learnControlSelect.value;
  if (!control) {
    engine.cancelInputLearn();
    updateDebugPanel();
    return;
  }
  engine.startInputLearn(
    { type: 'control', control, min: 0, max: 1 },
    () => updateDebugPanel(),
  );
  updateDebugPanel();
});

clearLearnedBtn.addEventListener('click', () => {
  engine.clearInputMapping();
  updateDebugPanel();
});

resetInputMappingBtn.addEventListener('click', () => {
  engine.resetInputMapping();
  updateDebugPanel();
});

document.getElementById('export-png')!.addEventListener('click', async () => {
  exportErrorEl.textContent = '';
  const result = await engine.exportPNG({ pixelRatio: 2 });
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'PNG export failed';
  updateDebugPanel();
});

document.getElementById('export-svg')!.addEventListener('click', () => {
  exportErrorEl.textContent = '';
  const result = engine.exportSVG({ transparent: true });
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'SVG export failed';
  updateDebugPanel();
});

document.getElementById('export-ascii')!.addEventListener('click', () => {
  exportErrorEl.textContent = '';
  const result = engine.exportASCII({ format: 'plain' });
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'ASCII export failed';
  updateDebugPanel();
});

document.getElementById('export-json')!.addEventListener('click', () => {
  exportErrorEl.textContent = '';
  const result = engine.exportJSON();
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'JSON export failed';
  updateDebugPanel();
});

document.getElementById('import-json')!.addEventListener('change', async (e) => {
  exportErrorEl.textContent = '';
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const text = await file.text();
  const result = engine.importJSON(text);
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'JSON import failed';
  syncPluginsFromEngine();
  syncSlidersFromPreset(engine.getPreset());
  updateDebugPanel();
  (e.target as HTMLInputElement).value = '';
});

document.getElementById('start-recording')!.addEventListener('click', () => {
  exportErrorEl.textContent = '';
  const result = engine.startRecording(30);
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'Recording failed';
  updateDebugPanel();
});

document.getElementById('stop-recording')!.addEventListener('click', () => {
  engine.stopRecording();
  updateDebugPanel();
});

document.getElementById('export-gif')!.addEventListener('click', async () => {
  exportErrorEl.textContent = '';
  const result = await engine.exportGIF({ frameRate: 15, loop: true });
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'GIF export failed';
  updateDebugPanel();
});

document.getElementById('export-sequence')!.addEventListener('click', async () => {
  exportErrorEl.textContent = '';
  const result = await engine.exportSequence({ prefix: 'ascii-frame' });
  if (!result.ok) exportErrorEl.textContent = result.error ?? 'Sequence export failed';
  updateDebugPanel();
});

document.getElementById('play-recording')!.addEventListener('click', () => {
  engine.playRecording({ loop: true, speed: 1, frameRate: 30 });
  updateDebugPanel();
});

document.getElementById('stop-playback')!.addEventListener('click', () => {
  engine.stopPlayback();
  updateDebugPanel();
});

document.getElementById('step-back')!.addEventListener('click', () => {
  engine.stepPlayback(-1);
  updateDebugPanel();
});

document.getElementById('step-forward')!.addEventListener('click', () => {
  engine.stepPlayback(1);
  updateDebugPanel();
});

function applyRendererMode(id: RendererId) {
  const previous = engine.getActiveRendererId();
  const result = engine.setActiveRenderer(id);
  if (!result.ok) {
    rendererWarning.textContent = result.warning ?? 'Renderer switch failed.';
    if (previous) rendererModeSelect.value = previous;
  } else {
    rendererWarning.textContent = result.warning ?? '';
    updateOutputVisibility(engine.getActiveRendererId());
  }
  updateDebugPanel();
}

rendererModeSelect.addEventListener('change', () => {
  applyRendererMode(rendererModeSelect.value as RendererId);
});

updateOutputVisibility(engine.getActiveRendererId());
rendererModeSelect.value = engine.getActiveRendererId() ?? 'canvas';

function drawDemoCanvas() {
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

async function setSourceMode(mode: string) {
  if (mode === 'procedural') {
    engine.setSourceMode('procedural');
    updateSourceInputs('procedural');
    updateDebugPanel();
    return;
  }

  engine.setActiveSource(mode);
  updateSourceInputs(mode);

  if (mode === 'canvas') {
    drawDemoCanvas();
    await engine.loadSource('canvas', { canvas: demoCanvas });
  }

  updateDebugPanel();
}

function updateSourceInputs(mode: string) {
  imageInputLabel.style.display = mode === 'image' ? 'block' : 'none';
  imageInput.style.display = mode === 'image' ? 'block' : 'none';
  videoInputLabel.style.display = mode === 'video' ? 'block' : 'none';
  videoInput.style.display = mode === 'video' ? 'block' : 'none';
  startWebcamBtn.style.display = mode === 'webcam' ? 'block' : 'none';
}

sourceModeSelect.addEventListener('change', () => {
  void setSourceMode(sourceModeSelect.value);
});

sourceFitSelect.addEventListener('change', () => {
  const source = engine.getSourceManager().getActiveSource();
  if (source) {
    source.setFitMode(sourceFitSelect.value as 'fit' | 'fill' | 'stretch' | 'center');
    updateDebugPanel();
  }
});

imageInput.addEventListener('change', async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  engine.setActiveSource('image');
  await engine.loadSource('image', file);
  updateDebugPanel();
});

videoInput.addEventListener('change', async () => {
  const file = videoInput.files?.[0];
  if (!file) return;
  engine.setActiveSource('video');
  await engine.loadSource('video', { file, loop: true, muted: true });
  updateDebugPanel();
});

startWebcamBtn.addEventListener('click', async () => {
  engine.setActiveSource('webcam');
  await engine.loadSource('webcam', { facingMode: 'user' });
  updateDebugPanel();
});

for (const id of sourceSliderIds) {
  const slider = sourceSliders[id];
  if (!slider) continue;
  bindEngineSlider(id, slider, sourceValueDisplays[id], (v) => v.toFixed(2), (value) => {
    if (id === 'sourceContrast') {
      contrastSlider.value = String(value);
      document.getElementById('contrast-value')!.textContent = value.toFixed(2);
    }
  });
}

for (const id of audioSliderIds) {
  const slider = audioSliders[id];
  if (!slider) continue;
  bindEngineSlider(id, slider, audioSliderValues[id]);
}

async function connectMicrophone() {
  audioErrorEl.textContent = '';
  engine.disconnectAudio();
  audioElement.pause();
  const result = await engine.connectAudio({ type: 'microphone' });
  if (!result.ok) {
    audioErrorEl.textContent = result.error ?? 'Microphone connection failed';
  }
  updateDebugPanel();
}

async function connectAudioFile(file: File) {
  audioErrorEl.textContent = '';
  engine.disconnectAudio();
  const url = URL.createObjectURL(file);
  audioElement.src = url;
  audioElement.loop = true;
  await audioElement.play();
  const result = await engine.connectAudio({ type: 'audioElement', audioElement });
  if (!result.ok) {
    audioErrorEl.textContent = result.error ?? 'Audio file connection failed';
  }
  updateDebugPanel();
}

startMicrophoneBtn.addEventListener('click', () => {
  void connectMicrophone();
});

audioFileInput.addEventListener('change', () => {
  const file = audioFileInput.files?.[0];
  if (!file) return;
  void connectAudioFile(file);
});

disconnectAudioBtn.addEventListener('click', () => {
  engine.disconnectAudio();
  audioElement.pause();
  audioErrorEl.textContent = '';
  updateDebugPanel();
});

engine.on('frame', () => {
  if (sourceModeSelect.value === 'canvas') {
    drawDemoCanvas();
  }
});

window.addEventListener('resize', () => {
  engine.resize(getViewportSize().width, getViewportSize().height);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    triggerBurst();
  }
});

runScriptBtn.addEventListener('click', () => {
  const id = scriptSelect.value;
  if (!id) return;
  void engine.runScript(id).then(() => {
    syncPluginsFromEngine();
    syncMotionsFromEngine();
    syncSimulationsFromEngine();
    updateDebugPanel();
  }).catch((err) => {
    scriptStatusEl.textContent = `error: ${err instanceof Error ? err.message : String(err)}`;
    updateDebugPanel();
  });
});

stopScriptBtn.addEventListener('click', () => {
  void engine.stopScript().then(() => updateDebugPanel());
});

reloadScriptBtn.addEventListener('click', () => {
  void engine.reloadScript(scriptSelect.value || undefined).then(() => updateDebugPanel());
});

restartScriptBtn.addEventListener('click', () => {
  void engine.restartScript().then(() => updateDebugPanel());
});

enableScriptBtn.addEventListener('click', () => {
  engine.enableScript();
  updateDebugPanel();
});

disableScriptBtn.addEventListener('click', () => {
  engine.disableScript();
  updateDebugPanel();
});

clearScriptConsoleBtn.addEventListener('click', () => {
  engine.clearScriptConsole();
  updateDebugPanel();
});

qualityPresetSelect.addEventListener('change', () => {
  engine.setQualityPreset(qualityPresetSelect.value as QualityPresetId);
  syncSlidersFromPreset(engine.getPreset());
  updateDebugPanel();
});

adaptiveQualityToggle.addEventListener('change', () => {
  engine.setControl('adaptiveQuality', adaptiveQualityToggle.checked ? 1 : 0);
  engine.getPerformanceManager().setAdaptiveQuality(adaptiveQualityToggle.checked);
  updateDebugPanel();
});

dirtyRenderingToggle.addEventListener('change', () => {
  engine.setControl('dirtyRendering', dirtyRenderingToggle.checked ? 1 : 0);
  engine.getPerformanceManager().getDirtyTracker().setEnabled(dirtyRenderingToggle.checked);
  updateDebugPanel();
});

spatialGridToggle.addEventListener('change', () => {
  engine.setControl('spatialGrid', spatialGridToggle.checked ? 1 : 0);
  updateDebugPanel();
});

fpsTargetSlider.addEventListener('input', () => {
  const val = parseInt(fpsTargetSlider.value, 10);
  fpsTargetValue.textContent = String(val);
  engine.setControl('fpsTarget', val);
  engine.getPerformanceManager().setFpsTarget(val);
});

// ── UI panel toggle (mobile) ──
uiToggle.addEventListener('click', () => {
  const hidden = uiPanel.classList.toggle('ui-hidden');
  uiToggle.setAttribute('aria-expanded', String(!hidden));
  uiToggle.textContent = hidden ? '☰ Controls' : '✕ Close';
});

// ── Glyph language & set ──
glyphLanguageSelect.addEventListener('change', () => {
  const id = glyphLanguageSelect.value;
  if (!id) return;
  engine.applyGlyphLanguage(id);
  updateDebugPanel();
});

document.getElementById('apply-glyph-set')!.addEventListener('click', () => {
  const raw = glyphSetInput.value.trim() || glyphSetInput.placeholder;
  const chars = [...raw.replace(/\s+/g, '')];
  if (chars.length === 0) {
    showControlWarning('Glyph set must contain at least one character.');
    return;
  }
  engine.getRendererManager().setGlyphSet(chars);
  updateDebugPanel();
});

document.getElementById('reset-glyph-set')!.addEventListener('click', () => {
  const preset = engine.getPreset();
  engine.setPreset(preset);
  glyphSetInput.value = '';
  glyphSetInput.placeholder = preset.glyphSet.join('');
  updateDebugPanel();
});

// ── Audio mapping panel ──
audioMappingEnabledToggle.addEventListener('change', applyAudioMappingFromUi);
document.getElementById('apply-audio-mapping')!.addEventListener('click', applyAudioMappingFromUi);
document.getElementById('reset-audio-mapping')!.addEventListener('click', () => {
  engine.setAudioMapping({ enabled: true, mappings: createDefaultMappings() });
  audioMapBassSelect.value = 'glitchAmount';
  audioMapMidSelect.value = 'trailAmount';
  audioMapTrebleSelect.value = 'density';
  updateDebugPanel();
});

document.getElementById('audio-play')!.addEventListener('click', () => {
  void audioElement.play().catch(() => {
    audioErrorEl.textContent = 'No audio file loaded — upload a file first.';
  });
});

document.getElementById('audio-pause')!.addEventListener('click', () => {
  audioElement.pause();
});

// ── Note corner test triggers ──
const noteCorners: Array<[string, number, number]> = [
  ['note-test-1', 0.2, 0.2],
  ['note-test-2', 0.8, 0.2],
  ['note-test-3', 0.2, 0.8],
  ['note-test-4', 0.8, 0.8],
];
for (const [id, x, y] of noteCorners) {
  document.getElementById(id)!.addEventListener('click', () => {
    engine.enablePlugin('burst');
    syncPluginsFromEngine();
    engine.noteOn({ x, y, intensity: 1.1 });
    updateDebugPanel();
  });
}

// ── Reset / Randomize / Copy preset ──
function resetDemo(): void {
  controlWarningMessages.clear();
  controlWarningsEl.classList.remove('visible');
  controlWarningsEl.textContent = '';
  ccMonitorHistory.length = 0;
  ccMonitor.textContent = 'cc: —';

  const preset = allPresets.find((p) => p.id === DEFAULT_DEMO_PRESET_ID) ?? allPresets[0];
  presetSelect.value = preset.id;
  engine.setPreset(preset);
  engine.resetComposition();
  engine.disconnectAudio();
  engine.disconnectMidi();
  engine.disableKeyboardInput();
  keyboardInputToggle.checked = false;
  audioElement.pause();
  engine.inputPanic();
  engine.setSourceMode('procedural');
  sourceModeSelect.value = 'procedural';
  updateSourceInputs('procedural');
  applyRendererMode('canvas');
  rendererModeSelect.value = 'canvas';
  applyAudioMappingFromUi();
  syncSlidersFromPreset(preset);
  syncPluginsFromEngine();
  syncMotionsFromEngine();
  syncSimulationsFromEngine();
  syncLayersFromEngine();
  syncPostPassesFromEngine();
  updateDebugPanel();
}

function randomizeDemo(): void {
  const preset = allPresets[Math.floor(Math.random() * allPresets.length)];
  presetSelect.value = preset.id;
  engine.setPreset(preset);
  syncSlidersFromPreset(preset);

  for (const [id, checkbox] of pluginCheckboxes) {
    const on = Math.random() > 0.35;
    checkbox.checked = on;
    if (on) engine.enablePlugin(id);
    else engine.disablePlugin(id);
  }
  for (const [id, checkbox] of motionCheckboxes) {
    const on = Math.random() > 0.5;
    checkbox.checked = on;
    if (on) engine.enableMotion(id);
    else engine.disableMotion(id);
  }

  for (const id of sliderIds) {
    const slider = sliders[id];
    if (!slider || !KNOWN_CONTROLS.has(id)) continue;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = min + Math.random() * (max - min);
    slider.value = String(value);
    if (valueDisplays[id]) valueDisplays[id].textContent = formatSliderValue(id, value);
    engine.setControl(id, value);
  }
  syncAliasVisualSliders();
  engine.noteOn({ x: Math.random(), y: Math.random(), intensity: 1 + Math.random() });
  updateDebugPanel();
}

async function copyPresetJson(): Promise<void> {
  const payload = {
    preset: engine.getPreset(),
    controls: engine.getControls(),
    enabledPlugins: engine.getEnabledPlugins().map((p) => p.id),
    enabledMotions: engine.getEnabledMotions().map((m) => m.id),
    enabledSimulations: engine.getEnabledSimulations().map((s) => s.id),
    audioMapping: engine.getAudioMapping(),
    inputMapping: engine.getInputMapping(),
  };
  const text = JSON.stringify(payload, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    controlWarningsEl.textContent = 'Preset JSON copied to clipboard.';
    controlWarningsEl.classList.add('visible');
    window.setTimeout(() => {
      if (controlWarningMessages.size === 0) controlWarningsEl.classList.remove('visible');
    }, 2000);
  } catch {
    showControlWarning('Clipboard unavailable — copy from console.');
    console.log(text);
  }
}

document.getElementById('reset-demo')!.addEventListener('click', resetDemo);
document.getElementById('randomize-demo')!.addEventListener('click', randomizeDemo);
document.getElementById('copy-preset-json')!.addEventListener('click', () => {
  void copyPresetJson();
});

// Validate demo sliders reference known engine controls at startup
for (const id of [...sliderIds, ...simSliderIds, ...postSliderIds, ...sourceSliderIds, ...audioSliderIds]) {
  assertEngineControl(id);
}
if (engine.getActiveRendererId() === 'webgl') {
  showControlWarning('WebGL renderer is a stub — no GPU draw path yet.');
}
syncAliasVisualSliders();
if (initialPreset.glyphLanguage) {
  const langId = Array.isArray(initialPreset.glyphLanguage)
    ? initialPreset.glyphLanguage[0]
    : initialPreset.glyphLanguage;
  if (langId) glyphLanguageSelect.value = langId;
}
