import {
  AsciiEngine,
  listPresets,
  type AsciiPreset,
  type PresetId,
} from 'ascii-visual-engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const presetSelect = document.getElementById('preset') as HTMLSelectElement;
const fpsDisplay = document.getElementById('fps') as HTMLDivElement;

const sliderIds = ['density', 'speed', 'trailAmount', 'glitchAmount'] as const;
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

function syncSlidersFromPreset(preset: AsciiPreset) {
  for (const id of sliderIds) {
    const control = preset.controls.find((c) => c.name === id);
    const value = preset[id as SliderId] ?? control?.default ?? 0;
    sliders[id].value = String(value);
    valueDisplays[id].textContent = value.toFixed(2);
    engine.setControl(id, value);
  }
}

syncSlidersFromPreset(allPresets[0]);

presetSelect.addEventListener('change', () => {
  const id = presetSelect.value as PresetId;
  const preset = allPresets.find((p) => p.id === id);
  if (!preset) return;
  engine.setPreset(preset);
  syncSlidersFromPreset(preset);
});

for (const id of sliderIds) {
  sliders[id].addEventListener('input', () => {
    const value = parseFloat(sliders[id].value);
    valueDisplays[id].textContent = value.toFixed(2);
    engine.setControl(id, value);
  });
}

document.getElementById('burst-center')!.addEventListener('click', () => {
  engine.noteOn({ x: 0.5, y: 0.5, intensity: 1.2 });
});

document.getElementById('burst-random')!.addEventListener('click', () => {
  engine.noteOn({
    x: Math.random(),
    y: Math.random(),
    intensity: 0.8 + Math.random() * 0.8,
  });
});

engine.on('frame', ({ fps }) => {
  fpsDisplay.textContent = `FPS: ${fps}`;
});

window.addEventListener('resize', () => {
  const size = getViewportSize();
  engine.resize(size.width, size.height);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    engine.noteOn({
      x: Math.random(),
      y: Math.random(),
      intensity: 1,
    });
  }
});
