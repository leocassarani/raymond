class Canvas {
  constructor(el) {
    this.el = el;
    this.width = el.width;
    this.height = el.height;

    this.ctx = el.getContext('2d');
    this.image = this.ctx.getImageData(0, 0, this.width, this.height);
  }

  drawPixel(x, y, r, g, b, a) {
    let i = (x + y * this.height) << 2;
    this.image.data[i] = r;
    this.image.data[++i] = g;
    this.image.data[++i] = b;
    this.image.data[++i] = a;
  }

  render() {
    this.ctx.putImageData(this.image, 0, 0);
  }
}

const sqr = n => n * n;

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

  subtract(other) {
    return new Vec(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }
}

class Sphere {
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }

  intersects(origin, line) {
    const oc = origin.subtract(this.center);
    return sqr(line.dot(oc)) >= sqr(oc.length) - sqr(this.radius);
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

(function() {
  const canvas = new Canvas(document.getElementById('canvas'));

  const eye = new Vec(3, 3, 0);
  const film = new Film(new Vec(0, 0, 3), 6, 6);

  const spheres = [
    new Sphere(new Vec(5, 3, 5), 2),
    new Sphere(new Vec(1, 5, 10), 2),
  ];

  render();

  window.addEventListener('keyup', event => {
    switch (event.key) {
      case 'w':
        eye.z++;
        film.origin.z++;
        break;
      case 'W':
        eye.z++;
        break;
      case 'a':
        eye.x--;
        film.origin.x--;
        break;
      case 's':
        eye.z--;
        film.origin.z--;
        break;
      case 'S':
        eye.z--;
        break;
      case 'd':
        eye.x++;
        film.origin.x++
        break;
      default:
        return;
    }

    render();
  });

  function render() {
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const point = film.project(x / canvas.width, y / canvas.height);
        const direction = point.subtract(eye).unit();

        for (let sphere of spheres) {
          if (sphere.intersects(eye, direction)) {
            canvas.drawPixel(x, y, 255, 255, 255, 255);
            break;
          }

          canvas.drawPixel(x, y, 0, 0, 0, 255);
        }
      }
    }

    canvas.render();
  }
})()
