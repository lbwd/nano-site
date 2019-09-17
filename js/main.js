'use strict';

const glsl = require('glslify');

// Grab the canvas and size it.
const canvas = document.getElementById('render-canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

window.addEventListener('load', e => {
  document.getElementById('under-div').classList.add('visible');
});

// Create our regl object.
const regl = require('regl')({
  canvas: canvas,
  extensions: ['OES_texture_float']
});

// Make a set of ping-pong buffers.
const pingPong = [
  regl.framebuffer({
    width: canvas.width,
    height: canvas.height,
    colorFormat: 'rgba',
    colorType: 'float'
  }),
  regl.framebuffer({
    width: canvas.width,
    height: canvas.height,
    colorFormat: 'rgba',
    colorType: 'float'
  })
];

// Make the paper.
regl({
  vert: `
    precision highp float;
    attribute vec2 position;
    varying vec2 vPos;
    void main() {
      gl_Position = vec4(position, 0, 1);
      vPos = position;
    }`,

  frag: glsl`
    precision highp float;
    varying vec2 vPos;
    uniform vec2 offset;

    #pragma glslify: noise = require('glsl-noise/classic/3d')

    float octaveNoise(vec2 p) {
      float scale = 1.0;
      float mag = 1.0;
      float sum = 0.0;
      float total = 0.0;
      for (int i = 0; i < 9; i++) {
        sum += mag * noise(vec3(scale * p, 0));
        total += mag;
        mag *= 0.5;
        scale *= 3.0;
        p += 2.0;
      }
      return pow(1.0 - sum / total, 4.0);
    }

    void main() {
      float n = octaveNoise(vPos * 3.0 + offset * 1000.0);
      float t = 0.0;
      gl_FragColor = vec4(n, t, n, 0);
    }`,
  attributes: {
    position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]
  },
  uniforms: {
    offset: [2 * Math.random() - 1, 2 * Math.random() - 1]
  },
  viewport: { x: 0, y: 0, width: canvas.width, height: canvas.height },
  framebuffer: pingPong[0],
  count: 6
})();

const cmdBurn = regl({
  vert: `
    precision highp float;
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0, 1);
    }`,

  frag: glsl`
    precision highp float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform vec2 spark;
    uniform vec2 spark1;
    uniform vec2 spark2;
    uniform vec2 spark3;

    vec2 dr = 1.0/resolution;
    const float burnTemp = 506.0;
    const float maxTemp = 1089.0;

    void main() {
      vec2 xy = gl_FragCoord.xy * dr;
      vec4 m0 = texture2D(source, xy + dr * vec2(0, 0));

      const int d = 3;

      float tn = 0.0;
      for (int x = -d; x <=d; x++) {
        for (int y = -d; y <= d; y++) {
          if (x == 0 && y == 0) continue;
          float txy = texture2D(source, xy + dr * vec2(x, y)).y;
          txy *= step(burnTemp, txy);
          tn += txy * exp(-1.0 * length(vec2(x, y)));
        }
      }

      // Current temperature
      float t = m0.y;

      // Add temperature from mouse
      if (spark.x >= 0.0) {
        float d = distance(gl_FragCoord.xy, spark*resolution);
        t += pow(m0.z, 2.0) * 64.0*exp(-0.009 * d);
      }
      if (spark1.x >= 0.0) {
        float d = distance(gl_FragCoord.xy, spark1*resolution);
        t += pow(m0.z, 2.0) * 64.0*exp(-0.009 * d);
      }
      if (spark2.x >= 0.0) {
        float d = distance(gl_FragCoord.xy, spark2*resolution);
        t += pow(m0.z, 2.0) * 64.0*exp(-0.009 * d);
      }
      if (spark3.x >= 0.0) {
        float d = distance(gl_FragCoord.xy, spark3*resolution);
        t += pow(m0.z, 2.0) * 64.0*exp(-0.009 * d);
      }

      // Add temperature from neighboring pixels
      t += 3.0 * m0.z * tn;

      // Current fuel
      float n = m0.x;

      // Combust if temperature is high enough.
      if (t > burnTemp) {
        t = min(t * 1.001, maxTemp) * n/m0.z;
        n *= 0.985;
      }

      gl_FragColor = vec4(n, t, m0.z, 1);
    }`,
  attributes: {
    position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]
  },
  uniforms: {
    resolution: regl.prop('resolution'),
    source: regl.prop('source'),
    spark: regl.prop('spark'),
    spark1: regl.prop('spark1'),
    spark2: regl.prop('spark2'),
    spark3: regl.prop('spark3')
  },
  framebuffer: regl.prop('destination'),
  viewport: regl.prop('viewport'),
  count: 6
});

// Render the current state.
const cmdFlame = regl({
  vert: `
    precision highp float;
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0, 1);
    }`,

  frag: glsl`
    precision highp float;
    uniform sampler2D source;
    uniform vec2 resolution;

    const float burnTemp = 506.0;
    float brownTemp = 0.6 * burnTemp;
    const float maxTemp = 1089.0;
    const float redTemp = 0.5 * (burnTemp + maxTemp);

    const vec3 white = vec3(1,1,1);
    const vec3 brown = 0.5 * vec3(0.8235294117647058, 0.4117647058823529, 0.11764705882352941);
    //const vec3 brown = white;
    const vec3 black = vec3(0,0,0);
    const vec3 red = vec3(3,0.9,0);

    float stretch(float r, float a, float b) {
      return (r - a) / (b - a);
    }

    void main() {
      vec4 m0 = texture2D(source, gl_FragCoord.xy / resolution);
      float t = m0.y;
      float n = m0.x;
      vec4 c = vec4(0);
      if (n == m0.z) {
        if (t < brownTemp) {
          c = mix(vec4(white, 1), vec4(brown, 1), stretch(t, 0.0, brownTemp));
        } else if (t < burnTemp) {
          c = mix(vec4(brown, 1), vec4(black, 0), stretch(t, brownTemp, burnTemp));
        }
      } else {
        if (t < burnTemp) {
          c = vec4(black, 0);
        } else if (t >= burnTemp && t < redTemp) {
          c = mix(vec4(black, 1), vec4(red, 1), stretch(t, burnTemp, redTemp));
        } else if (t >= redTemp) {
          c = mix(vec4(red,1), vec4(white,1), stretch(t, redTemp, maxTemp));
        }
      }
      gl_FragColor = c;
    }`,
  attributes: {
    position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]
  },
  uniforms: {
    resolution: regl.prop('resolution'),
    source: regl.prop('source')
  },
  viewport: regl.prop('viewport'),
  count: 6
});

const mouse = {
  down: false,
  x: 0,
  y: 0
};

window.addEventListener('mousedown', actionListener);

window.addEventListener('touchstart', actionListener);

function actionListener() {
  mouse.down = true;
  canvas.classList.add('hidden');
  document.getElementById('top-div').classList.add('hidden');
  this.window.removeEventListener('mousedown', actionListener);
  this.window.removeEventListener('touchstart', actionListener);

  this.setTimeout(() => {
    mouse.down = false;
  }, 2000);
}

let pingPongIndex = 0;

const points = [];

points.push({
  x: Math.random(),
  y: Math.random()
});
points.push({
  x: Math.random(),
  y: Math.random()
});
points.push({
  x: Math.random(),
  y: Math.random()
});
points.push({
  x: Math.random(),
  y: Math.random()
});

function loop() {
  for (let i = 0; i < 1; i++) {
    regl.clear({
      depth: 1,
      framebuffer: pingPong[1 - pingPongIndex]
    });

    cmdBurn({
      source: pingPong[pingPongIndex],
      destination: pingPong[1 - pingPongIndex],
      spark: mouse.down ? [points[0].x, points[0].y] : [-10000, -10000],
      spark1: mouse.down ? [points[1].x, points[1].y] : [-10000, -10000],
      spark2: mouse.down ? [points[2].x, points[2].y] : [-10000, -10000],
      spark3: mouse.down ? [points[3].x, points[3].y] : [-10000, -10000],
      resolution: [canvas.width, canvas.height],
      viewport: { x: 0, y: 0, width: canvas.width, height: canvas.height }
    });

    pingPongIndex = 1 - pingPongIndex;
  }

  cmdFlame({
    source: pingPong[pingPongIndex],
    resolution: [canvas.width, canvas.height],
    viewport: { x: 0, y: 0, width: canvas.width, height: canvas.height }
  });

  requestAnimationFrame(loop);
}

loop();
