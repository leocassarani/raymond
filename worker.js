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

class Tile {
  constructor({ x, y, width, height }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  render(scene) {
    const { canvas, camera, spheres, lights } = scene;
    const buf = new Uint8ClampedArray(4 * this.width * this.height);

    for (let i = 0; i < this.height; i++) {
      const y = this.y + i;

      for (let j = 0; j < this.width; j++) {
        const x = this.x + j;
        const ray = camera.cast(x / canvas.width, y / canvas.height);

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

        let k = (j + i * this.width) << 2;
        buf[k++] = color.red;
        buf[k++] = color.green;
        buf[k++] = color.blue;
        buf[k] = color.alpha;
      }
    }

    return buf;
  }
}
