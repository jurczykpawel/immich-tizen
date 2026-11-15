// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import doiuse from 'doiuse';
import postcss from 'postcss';

// The TV runs Chromium 76: a layout feature it lacks is silently ignored and the screen breaks (seen on the real TV).
const unsupported = async (file: string) => {
  const css = readFileSync(new URL(file, import.meta.url), 'utf8');
  const out: string[] = [];
  await postcss([doiuse({ browsers: ['chrome 76'], onFeatureUsage: (u: { feature: string; featureData: { title: string } }) => out.push(u.featureData.title) })]).process(css, { from: undefined });
  // caniuse marks single-value `overflow: hidden` as partial because of the two-value syntax; the one-value form is old and safe.
  return [...new Set(out)].filter((title) => title !== 'CSS overflow property');
};

describe('stylesheet', () => {
  it('uses only features available in Chromium 76', async () => {
    expect(await unsupported('../src/styles.css')).toEqual([]);
  });

  it('does not use features the checker cannot see', () => {
    const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/aspect-ratio|\binset\s*:|clamp\(|\bmin\(|\bmax\(|backdrop-filter|:is\(|:where\(/);
  });

  it('the checker really flags the modern features that broke the TV', async () => {
    const css = '.a{aspect-ratio:4/3}.b{display:flex;gap:8px}.c{position:fixed;inset:0}';
    const out: string[] = [];
    await postcss([doiuse({ browsers: ['chrome 76'], onFeatureUsage: (u: { featureData: { title: string } }) => out.push(u.featureData.title) })]).process(css, { from: undefined });
    expect(out.length).toBeGreaterThanOrEqual(2);
  });
});
