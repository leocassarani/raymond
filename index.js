class Canvas {
  constructor(el) {
    this.el = el;
    this.width = el.width;
    this.height = el.height;

    this.ctx = el.getContext('2d');
    this.image = this.ctx.getImageData(0, 0, this.width, this.height);
  }

  drawPixel(x, y, color) {
    let i = (x + y * this.height) << 2;
    this.image.data[i] = color.red;
    this.image.data[++i] = color.green;
    this.image.data[++i] = color.blue;
    this.image.data[++i] = color.alpha;
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
}

class Sphere {
  constructor(center, radius, color) {
    this.center = center;
    this.radius = radius;
    this.color = color;
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
    new Sphere(new Vec(5, 3, 5), 2, RGB.red),
    new Sphere(new Vec(0, 5, 10), 2, RGB.green),
    new Sphere(new Vec(3, 0, 15), 2, RGB.blue),
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
            canvas.drawPixel(x, y, sphere.color);
            break;
          }

          canvas.drawPixel(x, y, RGB.black);
        }
      }
    }

    canvas.render();
  }
})()
