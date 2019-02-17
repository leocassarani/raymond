class Canvas {
  constructor(el) {
    this.el = el;
    this.width = el.width;
    this.height = el.height;

    this.ctx = el.getContext('2d');
    this.image = this.ctx.getImageData(0, 0, this.width, this.height);
  }

  drawPixel(x, y, color) {
    let i = (x + y * this.width) << 2;
    this.image.data[i] = color.red;
    this.image.data[++i] = color.green;
    this.image.data[++i] = color.blue;
    this.image.data[++i] = color.alpha;
  }

  render() {
    this.ctx.putImageData(this.image, 0, 0);
  }
}

(function() {
  const canvas = new Canvas(document.getElementById('canvas'));

  const eye = new Vec(3, 3, 0);
  const film = new Film(new Vec(0, 0, 3), 6, 6);
  const camera = new Camera(eye, film);

  const spheres = [
    new Sphere(new Vec(2, 6, 8), 1, RGB.red),
    new Sphere(new Vec(1, 6, 5), 1, RGB.blue),
    new Sphere(new Vec(3, 0, 12), 5, RGB.green),
  ];

  const lights = [
    new Light(new Vec(1, 8, 0), 300),
    new Light(new Vec(8, 5, 5), 300),
  ];

  const scene = new Scene(camera, spheres, lights);

  window.addEventListener('keyup', e => {
    if (scene.onKeyPress(e.key)) {
      e.preventDefault();
      scene.render(canvas);
    }
  });

  scene.render(canvas);
})()
