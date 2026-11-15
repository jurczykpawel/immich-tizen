import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import jsQR from 'jsqr';
import { qrMatrix, QrCode } from '../src/qr';

afterEach(cleanup);

function decode(matrix: boolean[][]): string | undefined {
  const scale = 8, quiet = 4, n = matrix.length + quiet * 2;
  const size = n * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = (((y + quiet) * scale + dy) * size + (x + quiet) * scale + dx) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }));
  return jsQR(data, size, size)?.data;
}

const url = 'https://pair.example.com/pair.html#s=AbCdEfGhIjKlMnOpQrStUv&k=BAEyc1q4B0hVr0C8wKZ9bG5r2eJwQxL0Rk3m7Nf1sT6uH2yD8cVpX9aE4oZqIjW5gMnBvRtYhUlKiPdSfAzXcVbNmQwErT&r=https%3A%2F%2Fntfy.example.com';

describe('qr', () => {
  it('encodes a pairing url that a phone camera can read back exactly', () => {
    expect(decode(qrMatrix(url))).toBe(url);
  });

  it('renders the code as a square svg with a quiet zone', () => {
    const { container } = render(<QrCode text={url} />);
    const svg = container.querySelector('svg')!;
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(w).toBe(h);
    expect(w).toBe(qrMatrix(url).length + 8);
    expect(svg.querySelectorAll('rect').length).toBeGreaterThan(50);
  });
});
