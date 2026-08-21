// Border region-growing background removal. Seeds from edge pixels that match the
// corner background, then grows inward through smoothly-varying background, stopping
// at the hard color jump of the sprite outline. Mutates alpha in an RGBA buffer.
export function removeBackground(data, width, height, localTol = 34, bgTol = 90) {
  const idx = (x, y) => (y * width + x) * 4;
  const corner = (x, y) => [data[idx(x, y)], data[idx(x, y) + 1], data[idx(x, y) + 2]];
  const corners = [corner(0, 0), corner(width - 1, 0), corner(0, height - 1), corner(width - 1, height - 1)];
  const ref = [0, 1, 2].map((c) => Math.round(corners.reduce((s, k) => s + k[c], 0) / corners.length));

  const maxDiff = (i, r, g, b) =>
    Math.max(Math.abs(data[i] - r), Math.abs(data[i + 1] - g), Math.abs(data[i + 2] - b));

  const visited = new Uint8Array(width * height);
  const stack = [];
  const seed = (x, y) => {
    const p = y * width + x;
    const i = p * 4;
    if (!visited[p] && maxDiff(i, ref[0], ref[1], ref[2]) <= bgTol) stack.push(p);
  };
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    data[i + 3] = 0; // transparent
    const x = p % width;
    const y = (p / width) | 0;
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      const np = ny * width + nx;
      if (visited[np]) return;
      if (maxDiff(np * 4, r, g, b) <= localTol) stack.push(np);
    };
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  return data;
}
