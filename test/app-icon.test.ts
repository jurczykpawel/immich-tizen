// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';

const read = (f: string) => readFileSync(new URL(f, import.meta.url));

describe('app icon', () => {
  const png = PNG.sync.read(read('../public/icon.png'));

  it('is referenced by the widget and has the 117x117 size Samsung TVs expect', () => {
    expect(read('../public/config.xml').toString()).toContain('<icon src="icon.png"/>');
    expect([png.width, png.height]).toEqual([117, 117]);
  });

  it('is a real drawing, not a flat colour', () => {
    const colours = new Set<number>();
    for (let i = 0; i < png.data.length; i += 4) colours.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
    expect(colours.size).toBeGreaterThan(20);
  });

  it('has the four petals of the app logo in the right places', () => {
    const at = (x: number, y: number) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
    const [top, right, bottom, left] = [at(58, 28), at(88, 58), at(58, 88), at(28, 58)];
    const dominant = (c: number[]) => ['red', 'green', 'blue'][c.indexOf(Math.max(...c))];
    expect(dominant(top)).toBe('red');     // yellow petal: red and green high, so red wins ties by order
    expect(dominant(right)).toBe('red');   // red petal
    expect(dominant(bottom)).toBe('green'); // green petal
    expect(dominant(left)).toBe('blue');   // blue petal
  });
});
