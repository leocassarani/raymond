const sqr = n => n * n;
const clamp = (n, min, max) => n < min ? min : n > max ? max : n;

class Vec {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  get length() {
    return Math.sqrt(sqr(this.x) + sqr(this.y) + sqr(this.z));
  }

  unit() {
    const len = this.length;
    return new Vec(this.x / len, this.y / len, this.z / len);
  }

  add(other) {
    return new Vec(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other) {
    return new Vec(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  scale(n) {
    return new Vec(this.x * n, this.y * n, this.z * n);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }
}

class RGB {
  static get black() {
    return new RGB(0, 0, 0);
  }

  static get red() {
    return new RGB(255, 0, 0);
  }

  static get green() {
    return new RGB(0, 255, 0);
  }

  static get blue() {
    return new RGB(0, 0, 255);
  }

  constructor(red, green, blue) {
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = 255;
  }

  shade(factor) {
    const f = clamp(factor, 0, 1);
    return new RGB(this.red * f, this.green * f, this.blue * f);
  }
}

class Sphere {
  constructor(center, radius, color) {
    this.center = center;
    this.radius = radius;
    this.color = color;
  }

  intersect(origin, line) {
    const oc = origin.subtract(this.center);
    const dot = line.dot(oc);
    const sqrtTerm = sqr(dot) - (sqr(oc.length) - sqr(this.radius));

    if (sqrtTerm < 0) {
      return [];
    } else if (sqrtTerm == 0) {
      return [-dot];
    }

    // Note: results are guaranteed to be returned sorted in ascending order.
    const sqrt = Math.sqrt(sqrtTerm);
    return [-dot - sqrt, -dot + sqrt];
  }

  serialize() {
    const buf = new Float64Array(7);

    buf[0] = this.center.x;
    buf[1] = this.center.y;
    buf[2] = this.center.z;

    buf[3] = this.radius;

    buf[4] = this.color.red;
    buf[5] = this.color.green;
    buf[6] = this.color.blue;

    return buf;
  }

  static deserialize(buf) {
    return new Sphere(
      new Vec(buf[0], buf[1], buf[2]),
      buf[3],
      new RGB(buf[4], buf[5], buf[6])
    );
  }
}

class Camera {
  constructor(eye, film) {
    this.eye = eye;
    this.film = film;
  }

  cast(x, y) {
    return this.film
      .project(x, y)
      .subtract(this.eye)
      .unit();
  }

  moveLeft() {
    this.eye.x--;
    this.film.origin.x--;
  }

  moveRight() {
    this.eye.x++;
    this.film.origin.x++;
  }

  moveUp() {
    this.eye.y++;
    this.film.origin.y++;
  }

  moveDown() {
    this.eye.y--;
    this.film.origin.y--;
  }

  moveForward() {
    this.eye.z++;
    this.film.origin.z++;
  }

  moveBack() {
    this.eye.z--;
    this.film.origin.z--;
  }

  moveEyeForward() {
    this.eye.z++;
  }

  moveEyeBack() {
    this.eye.z--;
  }

  serialize() {
    const buf = new Float64Array(8);

    buf[0] = this.eye.x;
    buf[1] = this.eye.y;
    buf[2] = this.eye.z;

    buf[3] = this.film.origin.x;
    buf[4] = this.film.origin.y;
    buf[5] = this.film.origin.z;

    buf[6] = this.film.width;
    buf[7] = this.film.height;

    return buf;
  }

  static deserialize(buf) {
    const eye = new Vec(buf[0], buf[1], buf[2]);
    const film = new Film(new Vec(buf[3], buf[4], buf[5]), buf[6], buf[7]);
    return new Camera(eye, film);
  }
}

class Film {
  constructor(origin, width, height) {
    this.origin = origin;
    this.width = width;
    this.height = height;
  }

  project(offsetX, offsetY) {
    return new Vec(
      this.origin.x + this.width * offsetX,
      this.origin.y + this.height - (this.height * offsetY),
      this.origin.z,
    );
  }
}

const EPSILON = 1e-10;

class Light {
  constructor(origin, power) {
    this.origin = origin;
    this.power = power;
  }

  illuminate(point, surface, spheres) {
    const ray = this.origin.subtract(point);
    const direction = ray.unit();

    for (let sphere of spheres) {
      if (sphere.intersect(point, direction).some(t => t >= EPSILON)) {
        // If the shadow ray from the point to the light is occluded, this
        // light does not contribute any power to the colour of the point.
        return 0;
      }
    }

    const cosine = surface.dot(direction) / surface.length;
    return this.power * cosine / (4 * Math.PI * sqr(ray.length));
  }

  serialize() {
    const buf = new Float64Array(4);

    buf[0] = this.origin.x;
    buf[1] = this.origin.y;
    buf[2] = this.origin.z;
    buf[3] = this.power;

    return buf;
  }

  static deserialize(buf) {
    return new Light(new Vec(buf[0], buf[1], buf[2]), buf[3]);
  }
}

class Scene {
  constructor(camera, spheres, lights) {
    this.camera = camera;
    this.spheres = spheres;
    this.lights = lights;

    this.onWorkerMessage = this.onWorkerMessage.bind(this);
    this.workers = this.startWorkers();
  }

  startWorkers() {
    const workers = [];
    const concurrency = navigator.hardwareConcurrency || 2;

    for (let i = 0; i < concurrency; i++) {
      const worker = new Worker('worker.js');
      worker.onmessage = this.onWorkerMessage;
      workers.push(worker);
    }

    return workers;
  }

  render(canvas) {
    this.generation = performance.now();
    this.canvas = canvas;
    this.jobs = [];

    for (let worker of this.workers) {
      worker.postMessage({
        type: 'SET_SCENE',
        payload: this.serialize(),
      });
    }

    const width = canvas.width / 5;
    const height = canvas.height / 5;

    for (let y = 0; y < canvas.height; y += height) {
      for (let x = 0; x < canvas.width; x += width) {
        this.jobs.push({
          x, y, width, height,
          generation: this.generation,
        });
      }
    }

    this.pending = this.jobs.length;

    for (let worker of this.workers) {
      worker.postMessage({
        type: 'RENDER_TILE',
        payload: this.jobs.pop(),
      });
    }
  }

  serialize() {
    const { width, height } = this.canvas;

    return {
      canvas: { width, height },
      camera: this.camera.serialize(),
      spheres: this.spheres.map(s => s.serialize()),
      lights: this.lights.map(l => l.serialize()),
    };
  }

  static deserialize({ canvas, camera, spheres, lights }) {
    return {
      canvas,
      camera: Camera.deserialize(camera),
      spheres: spheres.map(s => Sphere.deserialize(s)),
      lights: lights.map(l => Light.deserialize(l)),
    };
  }

  onWorkerMessage(event) {
    const { data, currentTarget: worker } = event;
    const { tile, pixels } = data;

    if (tile.generation < this.generation) {
      // Ignore the message if it relates to a previous generation.
      return;
    }

    this.canvas.drawTile(tile, pixels);

    if (this.jobs.length > 0) {
      worker.postMessage({
        type: 'RENDER_TILE',
        payload: this.jobs.pop(),
      });
    }

    if (--this.pending === 0) {
      this.canvas.render();
    }
  }

  onKeyPress(key) {
    switch (event.key) {
      case 'w':
        this.camera.moveForward();
        break;
      case 'W':
        this.camera.moveEyeForward();
        break;
      case 'a':
      case 'ArrowLeft':
        this.camera.moveLeft();
        break;
      case 's':
        this.camera.moveBack();
        break;
      case 'S':
        this.camera.moveEyeBack();
        break;
      case 'd':
      case 'ArrowRight':
        this.camera.moveRight();
        break;
      case 'ArrowUp':
        this.camera.moveUp();
        break;
      case 'ArrowDown':
        this.camera.moveDown();
        break;
      default:
        return false;
    }

    return true;
  }
}
