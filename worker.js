self.importScripts("scene.js");

let scene;

onmessage = event => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SET_SCENE':
      scene = Scene.deserialize(payload);
      break;
    case 'RENDER_TILE':
      const tile = new Tile(payload);
      const pixels = tile.render(scene);
      self.postMessage({ tile, pixels });
      break;
  }
};

const SAMPLES_PER_PIXEL = 4;

class Tile {
  constructor({ x, y, width, height, generation }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.generation = generation;
  }

  render(scene) {
    const { canvas, camera, spheres, lights } = scene;
    const buf = new Uint8ClampedArray(4 * this.width * this.height);

    for (let i = 0; i < this.height; i++) {
      const y = this.y + i;

      for (let j = 0; j < this.width; j++) {
        const x = this.x + j;

        let r = 0, g = 0, b = 0, a = 0;

        for (let s = 0; s < SAMPLES_PER_PIXEL; s++) {
          const ray = camera.cast((x + Math.random()) / canvas.width, (y + Math.random()) / canvas.height);

          const nearest = spheres.reduce((min, sphere) => {
            const ts = sphere.intersect(camera.eye, ray);

            for (let t of ts) {
              if (t >= EPSILON && t < min.t) {
                return { t, sphere };
              }
            }

            return min;
          }, { t: Infinity, sphere: null });

          const { t, sphere } = nearest;
          let color;

          if (sphere) {
            const intersection = camera.eye.add(ray.scale(t));
            const normal = intersection.subtract(sphere.center);

            const power = lights.reduce((acc, light) => (
              acc + light.illuminate(intersection, normal, spheres)
            ), 0);

            color = sphere.color.shade(power);
          } else {
            color = new RGB(180, 180, 180);
          }

          r += color.red / SAMPLES_PER_PIXEL;
          g += color.green / SAMPLES_PER_PIXEL;
          b += color.blue / SAMPLES_PER_PIXEL;
          a += color.alpha / SAMPLES_PER_PIXEL;
        }

        let k = (j + i * this.width) << 2;
        buf[k++] = r;
        buf[k++] = g;
        buf[k++] = b;
        buf[k] = a;
      }
    }

    return buf;
  }
}
