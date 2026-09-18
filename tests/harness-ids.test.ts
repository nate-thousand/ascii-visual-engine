import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The demo harness is hand written HTML plus a TypeScript entry. A control
 * that exists in one and not the other is dead on arrival, which is how the
 * panel rotted before. Static ids only: sliders and checkboxes the entry
 * mounts at runtime use `ctl-` and `<container>-` prefixes and are not here.
 */
const root = join(__dirname, '..', 'examples', 'vanilla');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const ts = readFileSync(join(root, 'main.ts'), 'utf8');

const htmlIds = new Set(Array.from(html.matchAll(/\sid="([a-zA-Z0-9-]+)"/g), (m) => m[1]));

const tsIds = new Set<string>();
for (const m of ts.matchAll(/\$<[^>]+>\('([a-zA-Z0-9-]+)'\)/g)) tsIds.add(m[1]);
for (const m of ts.matchAll(/\$\('([a-zA-Z0-9-]+)'\)/g)) tsIds.add(m[1]);
for (const m of ts.matchAll(/getElementById\('([a-zA-Z0-9-]+)'\)/g)) tsIds.add(m[1]);
for (const m of ts.matchAll(/isOpen\('([a-zA-Z0-9-]+)'\)/g)) tsIds.add(m[1]);
// template ids: `meter-${id}` and `bar-${id}` over the audio meter list
for (const id of ['amplitude', 'bass', 'mid', 'treble']) {
  tsIds.add(`meter-${id}`);
  tsIds.add(`bar-${id}`);
}

// Ids the HTML needs for layout or CSS only.
const LAYOUT_ONLY = new Set(['ui', 'section-composition']);

describe('harness ids', () => {
  it('every element main.ts looks up exists in index.html', () => {
    const missing = Array.from(tsIds).filter((id) => !htmlIds.has(id)).sort();
    expect(missing).toEqual([]);
  });

  it('every id in index.html is used by main.ts', () => {
    const orphans = Array.from(htmlIds)
      .filter((id) => !tsIds.has(id) && !LAYOUT_ONLY.has(id))
      .sort();
    expect(orphans).toEqual([]);
  });
});
