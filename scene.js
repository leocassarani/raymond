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
}

class Scene {
  constructor(camera, spheres, lights) {
    this.camera = camera;
    this.spheres = spheres;
    this.lights = lights;
  }

  render(canvas) {
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const ray = this.camera.cast(x / canvas.width, y / canvas.height);

        const nearest = this.spheres.reduce((min, sphere) => {
          const ts = sphere.intersect(this.camera.eye, ray);

          for (let t of ts) {
            if (t >= EPSILON && t < min.t) {
              return { t, sphere };
            }
          }

          return min;
        }, { t: Infinity, sphere: null });

        const { t, sphere } = nearest;

        if (sphere) {
          const intersection = this.camera.eye.add(ray.scale(t));
          const normal = intersection.subtract(sphere.center);

          const power = this.lights.reduce((acc, light) => (
            acc + light.illuminate(intersection, normal, this.spheres)
          ), 0);

          canvas.drawPixel(x, y, sphere.color.shade(power));
        } else {
          canvas.drawPixel(x, y, new RGB(180, 180, 180));
        }
      }
    }

    canvas.render();
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
