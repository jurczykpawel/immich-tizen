import qrcode from 'qrcode-generator';

const QUIET = 4;

export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

export function QrCode({ text, size = 520 }: { text: string; size?: number }) {
  const m = qrMatrix(text);
  const total = m.length + QUIET * 2;
  const runs: Array<{ x: number; y: number; w: number }> = [];
  m.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) { x++; continue; }
      const start = x;
      while (x < row.length && row[x]) x++;
      runs.push({ x: start + QUIET, y: y + QUIET, w: x - start });
    }
  });
  return (
    <svg class="qr" width={size} height={size} viewBox={`0 0 ${total} ${total}`} shape-rendering="crispEdges">
      <rect width={total} height={total} fill="#fff" />
      {runs.map((r) => <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill="#000" />)}
    </svg>
  );
}
