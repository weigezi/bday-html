/**
 * Birthday Card for 小宝 Doris - v6 (Tier 1 Enhanced)
 * Flow: COVER → PHOTO_WALL (50 Lomo photos) → CAKE (gesture form/explode) → WISH
 *
 * Tier 1 Improvements:
 *   1. [ROTATION]   Hand-driven rotation with inertia (replaces auto-rotate)
 *   2. [BLOW_CANDLE] point_up gesture hold 2s → extinguish → auto WISH
 *   3. [SHAPE_MORPH] Fragment shader u_shape: 0=circle, 1=star, 2=smoke, 3=heart
 *   4. [COLOR_BREATH] Time-based warm↔pink cycle + gesture hue shift + explode burst
 */

var SCENES = { COVER:'cover', PHOTO_WALL:'photo_wall', CAKE:'cake', WISH:'wish' };
var state = {
  scene: SCENES.COVER,
  gesture: null,
  gestureConfidence: 0,
  cakeScale: 1,
  candleLit: true,
  photoPage: 0,
  // [ROTATION] hand-driven rotation state
  rotationVelocity: 0,
  lastHandX: null,
  // [BLOW_CANDLE] point_up hold tracking
  pointUpStartTime: 0,
  candleExtinguishing: false,
  candleExtinguishProgress: 0,
  // [COLOR_BREATH] explode hue burst decay
  explodeHueBurst: 0
};
var TOTAL_PHOTOS = 50;
var PHOTOS_PER_PAGE = 6;
var totalPages = Math.ceil(TOTAL_PHOTOS / PHOTOS_PER_PAGE);

// ─── Audio ─────────────────────────────────────────────────────
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(f, d, t, v) {
  if (!t) t = 'sine'; if (!v) v = 0.1;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  var o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = t; o.frequency.value = f;
  g.gain.setValueAtTime(v, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + d);
}
function playChime() {
  playTone(523, .3, 'triangle', .08);
  setTimeout(function () { playTone(659, .3, 'triangle', .06); }, 150);
  setTimeout(function () { playTone(784, .5, 'sine', .08); }, 300);
}
function playBoom() { playTone(80, .5, 'sawtooth', .12); playTone(120, .3, 'square', .06); }
function playSparkle() { for (var i = 0; i < 5; i++) setTimeout(function () { playTone(800 + Math.random() * 600, .12, 'sine', .03); }, i * 50); }
function playPageTurn() { playTone(440, .15, 'sine', .04); setTimeout(function () { playTone(550, .1, 'sine', .03); }, 80); }
// [BLOW_CANDLE] gentle blow-out sound
function playBlowSound() {
  playTone(220, .6, 'sine', .06);
  setTimeout(function () { playTone(180, .8, 'triangle', .04); }, 200);
  setTimeout(function () { playTone(140, 1.0, 'sine', .03); }, 500);
}

// Real BGM
function startBGM() {
  var bgm = document.getElementById('bgm-audio');
  if (bgm) { bgm.volume = 0.25; bgm.play().catch(function () {}); }
}

// ─── Confetti ────────────────────────────────────────────────────
function fire(type) {
  var o = {
    celebration: { particleCount: 200, spread: 80, origin: { y: .6 }, colors: ['#ffd700', '#fff', '#ff6b6b', '#4ecdc4'], gravity: .7, ticks: 350 },
    gentle: { particleCount: 40, spread: 50, origin: { y: .7 }, colors: ['#ffd700', '#fff'], gravity: .4, ticks: 250 },
    explode: { particleCount: 300, spread: 180, origin: { x: .5, y: .5 }, colors: ['#ffd700', '#fff', '#ffaa00'], gravity: .3, ticks: 200, startVelocity: 45 }
  }; confetti(o[type] || o.gentle);
}

// ─── Three.js ────────────────────────────────────────────────────
var container = document.getElementById('canvas-container');
var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

var scene3d = new THREE.Scene();
scene3d.background = new THREE.Color(0x050508);
var cam = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, .1, 100);
cam.position.set(0, .5, 5); cam.lookAt(0, 0, 0);

// ─── Square Particle Cake ───────────────────────────────────────
var N = 2500;
var pos = new Float32Array(N * 3), tgt = new Float32Array(N * 3);
var col = new Float32Array(N * 3), siz = new Float32Array(N), alp = new Float32Array(N);
var vel = new Float32Array(N * 3), phase = new Float32Array(N);
// [COLOR_BREATH] store base colors for breathing/burst restoration
var baseCol = new Float32Array(N * 3);
// [BLOW_CANDLE] per-particle layer tag: 0=body, 1=candle, 2=flame
var particleLayer = new Uint8Array(N);

function genCakeTargets() {
  var layers = [
    { r: 1.4, h: .28, y: -.75, c: [1, .84, 0], n: 900 },
    { r: 1.05, h: .25, y: -.35, c: [1, .84, 0], n: 700 },
    { r: .7, h: .22, y: 0, c: [.95, .95, 1], n: 500 }
  ];
  var idx = 0;
  for (var li = 0; li < layers.length; li++) {
    var L = layers[li];
    for (var i = 0; i < L.n && idx < N; i++) {
      var a = Math.random() * 6.283, r = Math.pow(Math.random(), .4) * L.r, y = L.y + (Math.random() - .5) * L.h;
      tgt[idx * 3] = Math.cos(a) * r; tgt[idx * 3 + 1] = y; tgt[idx * 3 + 2] = Math.sin(a) * r;
      col[idx * 3] = L.c[0] + (Math.random() - .5) * .08;
      col[idx * 3 + 1] = L.c[1] + (Math.random() - .5) * .08;
      col[idx * 3 + 2] = L.c[2] + (Math.random() - .5) * .08;
      siz[idx] = .12 + Math.random() * .10; alp[idx] = .8 + Math.random() * .3;
      phase[idx] = Math.random() * 6.28;
      particleLayer[idx] = 0; // body
      idx++;
    }
  }
  // Candle body
  for (var ci = 0; ci < 100 && idx < N; ci++) {
    var cy = .18 + Math.random() * .35, ca = Math.random() * 6.283, cr = Math.sqrt(Math.random()) * .055;
    tgt[idx * 3] = Math.cos(ca) * cr; tgt[idx * 3 + 1] = cy; tgt[idx * 3 + 2] = Math.sin(ca) * cr;
    col[idx * 3] = 1; col[idx * 3 + 1] = .97; col[idx * 3 + 2] = .9;
    siz[idx] = .10; alp[idx] = .95; phase[idx] = Math.random() * 6.28;
    particleLayer[idx] = 1; // candle
    idx++;
  }
  // Flame
  for (var fi = idx; fi < N; fi++) {
    var fy = .55 + Math.random() * .25, fa = Math.random() * 6.283, taper = 1 - (fy - .55) / .25, fr = Math.sqrt(Math.random()) * .04 * taper;
    tgt[fi * 3] = Math.cos(fa) * fr; tgt[fi * 3 + 1] = fy; tgt[fi * 3 + 2] = Math.sin(fa) * fr;
    var t = (fy - .55) / .25;
    col[fi * 3] = 1; col[fi * 3 + 1] = .3 + t * .4; col[fi * 3 + 2] = .05;
    siz[fi] = .14 + (1 - t) * .08; alp[fi] = .9; phase[fi] = Math.random() * 6.28;
    particleLayer[fi] = 2; // flame
  }
  // [COLOR_BREATH] snapshot base colors
  for (var bi = 0; bi < N; bi++) {
    baseCol[bi * 3] = col[bi * 3];
    baseCol[bi * 3 + 1] = col[bi * 3 + 1];
    baseCol[bi * 3 + 2] = col[bi * 3 + 2];
  }
}
genCakeTargets();

function scatter() {
  for (var i = 0; i < N; i++) {
    var th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1), rd = 3 + Math.random() * 5;
    pos[i * 3] = rd * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = rd * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = rd * Math.cos(ph);
    vel[i * 3] = (Math.random() - .5) * .02;
    vel[i * 3 + 1] = (Math.random() - .5) * .02;
    vel[i * 3 + 2] = (Math.random() - .5) * .02;
  }
}
scatter();

// ─── [SHAPE_MORPH] Enhanced Shader with 4 shapes + [COLOR_BREATH] uniforms ───
var vs = [
  'attribute float size;',
  'attribute float alpha;',
  'varying vec3 vC;',
  'varying float vA;',
  'void main(){',
  '  vC = color;',
  '  vA = alpha;',
  '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
  '  gl_PointSize = size * (500.0 / -mv.z);',
  '  gl_Position = projectionMatrix * mv;',
  '}'
].join('\n');

var fs = [
  // [SHAPE_MORPH] uniform for shape selection: 0=circle, 1=star, 2=smoke, 3=heart
  'uniform float u_shape;',
  'varying vec3 vC;',
  'varying float vA;',
  '',
  '// SDF: circle soft particle',
  'float sdCircle(vec2 uv) {',
  '  float d = length(uv);',
  '  return smoothstep(0.5, 0.15, d);',
  '}',
  '',
  '// SDF: 5-point star',
  'float sdStar(vec2 uv) {',
  '  float a = atan(uv.y, uv.x);',
  '  float r = length(uv);',
  '  float star = cos(5.0 * a) * 0.15 + 0.35;',
  '  return smoothstep(star + 0.05, star - 0.05, r);',
  '}',
  '',
  '// SDF: smoke (noise-perturbed circle)',
  'float sdSmoke(vec2 uv) {',
  '  float d = length(uv);',
  '  float noise = sin(uv.x * 12.0) * cos(uv.y * 10.0) * 0.12;',
  '  return smoothstep(0.5 + noise, 0.1 + noise, d) * 0.8;',
  '}',
  '',
  '// SDF: heart shape',
  'float sdHeart(vec2 uv) {',
  '  vec2 p = uv * 2.0;',
  '  p.y -= 0.3;',
  '  float x = p.x, y = p.y;',
  '  float a = x * x + y * y - 0.35;',
  '  float heart = a * a * a - x * x * y * y * y;',
  '  return smoothstep(0.02, -0.02, heart);',
  '}',
  '',
  'void main(){',
  '  vec2 uv = gl_PointCoord - 0.5;',
  '  float d = length(uv);',
  '',
  '  // Compute all 4 shapes',
  '  float s0 = sdCircle(uv);',   // 0: assembled cake
  '  float s1 = sdStar(uv);',     // 1: exploded
  '  float s2 = sdSmoke(uv);',    // 2: blow-out transition
  '  float s3 = sdHeart(uv);',    // 3: wish/celebration
  '',
  '  // Smooth morph between shapes based on u_shape',
  '  float shape;',
  '  if (u_shape < 1.0) {',
  '    shape = mix(s0, s1, clamp(u_shape, 0.0, 1.0));',
  '  } else if (u_shape < 2.0) {',
  '    shape = mix(s1, s2, clamp(u_shape - 1.0, 0.0, 1.0));',
  '  } else if (u_shape < 3.0) {',
  '    shape = mix(s2, s3, clamp(u_shape - 2.0, 0.0, 1.0));',
  '  } else {',
  '    shape = s3;',
  '  }',
  '',
  '  // Add subtle glow regardless of shape',
  '  float glow = exp(-d * 4.0) * 0.4;',
  '  float finalShape = shape * 0.8 + glow;',
  '',
  '  if (finalShape < 0.01) discard;',
  '  gl_FragColor = vec4(vC * (1.0 + glow * 0.5), vA * finalShape);',
  '}'
].join('\n');

var geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
geo.setAttribute('size', new THREE.BufferAttribute(siz, 1));
geo.setAttribute('alpha', new THREE.BufferAttribute(alp, 1));

// [SHAPE_MORPH] u_shape uniform starts at 0 (circle = assembled)
var mat = new THREE.ShaderMaterial({
  vertexShader: vs,
  fragmentShader: fs,
  uniforms: {
    u_shape: { value: 0.0 }
  },
  vertexColors: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
var pts = new THREE.Points(geo, mat);
pts.visible = false;
scene3d.add(pts);

var asmProg = 0, assembled = false, exploded = true;

// ─── [COLOR_BREATH] Helper: RGB ↔ HSL conversion ───
function rgbToHsl(r, g, b) {
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  var r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

// ─── [COLOR_BREATH] Apply color effects each frame ───
function updateColors(t) {
  if (!pts.visible) return;

  // Breathing cycle: warm gold ↔ soft pink, period ~9 seconds
  var breathCycle = Math.sin(t * 0.7) * 0.5 + 0.5; // 0..1

  // Gesture-driven hue shift: palm_open confidence maps to rainbow spread
  var gestureHueShift = 0;
  if (state.gesture === 'palm_open' && assembled) {
    gestureHueShift = state.gestureConfidence * 0.3; // up to ±108° shift
  }

  // Explode hue burst decay
  if (state.explodeHueBurst > 0) {
    state.explodeHueBurst *= 0.97; // decay ~3% per frame
    if (state.explodeHueBurst < 0.005) state.explodeHueBurst = 0;
  }

  for (var i = 0; i < N; i++) {
    var ix = i * 3;

    // [BLOW_CANDLE] flame particles during extinguish: fade to smoke color
    if (particleLayer[i] === 2 && state.candleExtinguishing) {
      var ep = state.candleExtinguishProgress;
      // Orange-red → grey-blue smoke
      col[ix]     = baseCol[ix]     * (1 - ep) + 0.45 * ep;
      col[ix + 1] = baseCol[ix + 1] * (1 - ep) + 0.48 * ep;
      col[ix + 2] = baseCol[ix + 2] * (1 - ep) + 0.55 * ep;
      continue;
    }
    // If candle already fully extinguished, keep flame as smoke
    if (particleLayer[i] === 2 && !state.candleLit) {
      col[ix] = 0.45; col[ix + 1] = 0.48; col[ix + 2] = 0.55;
      continue;
    }

    // Start from base color
    var br = baseCol[ix], bg = baseCol[ix + 1], bb = baseCol[ix + 2];

    // Only apply breathing/hue to body+candle particles (not flame)
    if (particleLayer[i] !== 2) {
      var hsl = rgbToHsl(br, bg, bb);

      // Apply breathing: shift hue slightly warm↔pink
      hsl[0] += (breathCycle - 0.5) * 0.04; // ±7° oscillation

      // Apply gesture hue shift (per-particle variation using phase)
      if (gestureHueShift > 0) {
        hsl[0] += Math.sin(phase[i]) * gestureHueShift;
      }

      // Apply explode burst
      if (state.explodeHueBurst > 0) {
        hsl[0] += (Math.sin(phase[i] * 3.7) * 0.083) * state.explodeHueBurst; // ±30° * burst
      }

      // Wrap hue
      hsl[0] = ((hsl[0] % 1) + 1) % 1;

      var rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
      col[ix] = rgb[0]; col[ix + 1] = rgb[1]; col[ix + 2] = rgb[2];
    }
  }
  geo.attributes.color.needsUpdate = true;
}

// ─── [SHAPE_MORPH] Target shape value per scene/state ───
function getTargetShape() {
  if (exploded) return 1.0;                                    // star when exploded
  if (state.candleExtinguishing) return 2.0;                   // smoke during blow-out
  if (state.scene === SCENES.WISH) return 3.0;                 // heart in wish scene
  return 0.0;                                                  // circle when assembled
}

function updateParticles(dt) {
  if (!pts.visible) return;
  var t = performance.now() * .001;

  // [SHAPE_MORPH] smoothly interpolate u_shape toward target
  var targetShape = getTargetShape();
  var currentShape = mat.uniforms.u_shape.value;
  mat.uniforms.u_shape.value += (targetShape - currentShape) * Math.min(1, dt * 3.0);

  if (!assembled && !exploded) {
    // Assembling animation
    asmProg = Math.min(1, asmProg + dt * 1.2);
    var e = 1 - Math.pow(1 - asmProg, 4);
    for (var i = 0; i < N; i++) {
      var ix = i * 3;
      pos[ix] += (tgt[ix] - pos[ix]) * e * .12;
      pos[ix + 1] += (tgt[ix + 1] - pos[ix + 1]) * e * .12;
      pos[ix + 2] += (tgt[ix + 2] - pos[ix + 2]) * e * .12;
    }
    if (asmProg >= 1) { assembled = true; playChime(); }
  }
  else if (exploded) {
    // Exploded: particles drift outward
    for (var j = 0; j < N; j++) {
      var jx = j * 3;
      pos[jx] += vel[jx]; pos[jx + 1] += vel[jx + 1]; pos[jx + 2] += vel[jx + 2];
      alp[j] = .4 + .6 * (.5 + .5 * Math.sin(t * 2 + phase[j]));
      siz[j] = (.08 + Math.random() * .04) * (.8 + .4 * Math.sin(t * 3 + phase[j]));
    }
  }
  else if (assembled) {
    // [ROTATION] Hand-driven rotation with inertia (replaces auto sin rotation)
    pts.rotation.y += state.rotationVelocity * dt;
    // Friction decay
    state.rotationVelocity *= (1 - dt * 1.5); // ~1.5 damping factor

    // Palm open scale effect (kept from original)
    var gs = state.gesture === 'palm_open' ? .6 + state.gestureConfidence * 1.2 : 1;
    state.cakeScale += (gs - state.cakeScale) * .06;
    pts.scale.setScalar(state.cakeScale);

    // Gentle idle micro-movement
    for (var k = 0; k < N; k++) {
      var kx = k * 3;
      pos[kx] += Math.sin(t * .7 + k * .03) * .0003;
      pos[kx + 1] += Math.cos(t * .9 + k * .02) * .0003;
      pos[kx + 2] += Math.sin(t * .5 + k * .025) * .0003;

      // Flame flicker (only when lit and not extinguishing)
      if (particleLayer[k] === 2 && state.candleLit && !state.candleExtinguishing) {
        pos[kx] += (Math.random() - .5) * .005;
        pos[kx + 1] += (Math.random() - .5) * .006;
        siz[k] = .06 + Math.random() * .06;
      }

      // [BLOW_CANDLE] During extinguish: reduce flame alpha & size
      if (particleLayer[k] === 2 && state.candleExtinguishing) {
        alp[k] = .9 * (1 - state.candleExtinguishProgress);
        siz[k] = (.12 + Math.random() * .08) * (1 - state.candleExtinguishProgress * 0.7);
      }
      // After extinguished: dim smoke
      else if (particleLayer[k] === 2 && !state.candleLit) {
        alp[k] = .15 + .1 * Math.sin(t * 0.8 + phase[k]);
        siz[k] = .08 + .04 * Math.sin(t * 0.5 + phase[k]);
        // Slow upward drift (smoke rising)
        pos[kx + 1] += dt * 0.02;
      }
      else {
        alp[k] = .6 + .4 * (.5 + .5 * Math.sin(t * 1.5 + phase[k]));
      }
    }
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.size.needsUpdate = true;
  geo.attributes.alpha.needsUpdate = true;

  // [COLOR_BREATH] Update colors every frame
  updateColors(t);
}

function explodeCake() {
  if (exploded) return;
  assembled = false; exploded = true; asmProg = 0;
  // [COLOR_BREATH] trigger hue burst
  state.explodeHueBurst = 1.0;
  for (var i = 0; i < N; i++) {
    var dx = pos[i * 3], dy = pos[i * 3 + 1], dz = pos[i * 3 + 2];
    var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    var s = .03 + Math.random() * .06;
    vel[i * 3] = dx / l * s + (Math.random() - .5) * .02;
    vel[i * 3 + 1] = dy / l * s + (Math.random() - .5) * .02;
    vel[i * 3 + 2] = dz / l * s + (Math.random() - .5) * .02;
  }
  playBoom(); fire('explode');
}

function formCake() {
  if (assembled) return;
  exploded = false; assembled = false; asmProg = 0;
  // Reset candle state when reforming
  state.candleLit = true;
  state.candleExtinguishing = false;
  state.candleExtinguishProgress = 0;
  state.pointUpStartTime = 0;
  playSparkle();
}

// ─── Cover envelope ──────────────────────────────────────────────
function mkEnvelope() {
  var c = document.createElement('canvas'); c.width = 512; c.height = 384; var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 512, 384); g.addColorStop(0, '#1a1520'); g.addColorStop(1, '#0d0a12');
  x.fillStyle = g; x.fillRect(0, 0, 512, 384);
  x.strokeStyle = '#c9a84c'; x.lineWidth = 2; x.strokeRect(20, 20, 472, 344); x.strokeRect(28, 28, 456, 328);
  [[30, 30], [482, 30], [30, 354], [482, 354]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 5, 0, 6.28); x.fillStyle = '#c9a84c'; x.fill(); });
  x.font = 'bold 32px Georgia,serif'; x.fillStyle = '#ffd700'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('Dear 小宝 Doris', 256, 150);
  x.strokeStyle = '#c9a84c'; x.lineWidth = 1; x.beginPath(); x.moveTo(130, 185); x.lineTo(382, 185); x.stroke();
  x.font = '18px Georgia,serif'; x.fillStyle = '#c9a84c'; x.fillText('1998 / 09 / 03', 256, 215);
  x.font = '40px serif'; x.fillText('🎂', 256, 275);
  var tex = new THREE.CanvasTexture(c);
  var m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  m.visible = true; scene3d.add(m); return m;
}
var env = mkEnvelope();

// ─── Gesture ─────────────────────────────────────────────────────
var vid = document.getElementById('cam-preview'), hands = null, camUtil = null, gHist = [], gDeb = document.getElementById('gesture-debug');

// [BLOW_CANDLE] Added point_up detection to classify()
function classify(lm) {
  if (!lm || !lm.length) return null;
  var h = lm[0];
  var tips = [4, 8, 12, 16, 20], pips = [3, 6, 10, 14, 18];
  var ext = [];
  for (var i = 0; i < 5; i++) {
    ext.push(i === 0
      ? Math.abs(h[tips[i]].x - h[0].x) > Math.abs(h[pips[i]].x - h[0].x)
      : h[tips[i]].y < h[pips[i]].y);
  }
  var c = ext.filter(Boolean).length;

  // [BLOW_CANDLE] point_up: only index finger extended, others curled
  if (ext[1] && !ext[2] && !ext[3] && !ext[4]) return 'point_up';

  if (c >= 4) return 'palm_open';
  if (c === 0) return 'fist';
  if (Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y) < .05 && c <= 2) return 'pinch';
  return null;
}

function trackMot(lm) {
  if (!lm || !lm.length) return;
  var w = lm[0][0];
  gHist.push({ x: w.x, y: w.y, t: performance.now() });
  if (gHist.length > 10) gHist.shift();
  if (gHist.length < 5) return;
  var r = gHist.slice(-5), dx = r[4].x - r[0].x, dt = (r[4].t - r[0].t) / 1e3;
  if (dt < .1) return;
  var vx = dx / dt;
  if (Math.abs(vx) > 1.5) {
    state.gesture = vx > 0 ? 'swipe_right' : 'swipe_left';
    state.gestureConfidence = Math.min(1, Math.abs(vx) / 3);
  } else {
    state.gesture = null;
    state.gestureConfidence = 0;
  }
}

async function initHands() {
  try {
    hands = new Hands({ locateFile: function (f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/' + f; } });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: .6, minTrackingConfidence: .5 });
    hands.onResults(function (r) {
      var raw = classify(r.multiHandLandmarks);
      trackMot(r.multiHandLandmarks);

      if (raw === 'palm_open') {
        var h = r.multiHandLandmarks[0];
        state.gesture = 'palm_open';
        state.gestureConfidence = Math.min(1, Math.hypot(h[8].x - h[20].x, h[8].y - h[20].y) / .3);

        // [ROTATION] Map palm horizontal movement to rotation velocity
        if (state.scene === SCENES.CAKE && assembled && r.multiHandLandmarks[0]) {
          var wristX = r.multiHandLandmarks[0][0].x;
          if (state.lastHandX !== null) {
            var deltaX = wristX - state.lastHandX;
            // Convert screen-space delta to rotation impulse (inverted for natural feel)
            state.rotationVelocity += -deltaX * 15.0;
            // Clamp max rotation speed
            state.rotationVelocity = Math.max(-8, Math.min(8, state.rotationVelocity));
          }
          state.lastHandX = wristX;
        }
      }
      else if (raw === 'fist') {
        state.gesture = 'fist';
        state.lastHandX = null; // reset hand tracking on fist
      }
      // [BLOW_CANDLE] Track point_up gesture
      else if (raw === 'point_up') {
        state.gesture = 'point_up';
        state.lastHandX = null;
      }
      else if (raw) {
        state.gesture = raw;
        state.lastHandX = null;
      } else {
        state.lastHandX = null;
      }

      gDeb.textContent = '手势: ' + (state.gesture || '无') + '\n置信度: ' + state.gestureConfidence.toFixed(2);

      // CAKE scene gesture handling
      if (state.scene === SCENES.CAKE) {
        if (state.gesture === 'fist' && exploded) formCake();
        if (state.gesture === 'palm_open' && assembled) explodeCake();

        // [BLOW_CANDLE] point_up hold logic
        if (state.gesture === 'point_up' && assembled && state.candleLit && !state.candleExtinguishing) {
          if (state.pointUpStartTime === 0) {
            state.pointUpStartTime = performance.now();
          }
          var holdDuration = performance.now() - state.pointUpStartTime;
          // Visual feedback: show progress in hint
          var pct = Math.min(100, Math.floor(holdDuration / 20));
          setHint('🕯️ 许愿中... ' + pct + '%<br><small>保持食指竖起 ☝️</small>');
          if (holdDuration >= 2000) {
            // Trigger blow-out sequence
            state.candleExtinguishing = true;
            state.pointUpStartTime = 0;
            playBlowSound();
            setHint('✨ 愿望已许下...');
          }
        } else if (state.gesture !== 'point_up') {
          // Reset hold timer if gesture breaks
          state.pointUpStartTime = 0;
        }
      }

      // Swipe to navigate photos
      if (state.scene === SCENES.PHOTO_WALL) {
        if (state.gesture === 'swipe_left') nextPhotoPage();
        if (state.gesture === 'swipe_right') prevPhotoPage();
      }
    });
    camUtil = new Camera(vid, { onFrame: async function () { await hands.send({ image: vid }); }, width: 640, height: 480 });
    await camUtil.start();
    // [FIX] Reveal camera preview after successful start
    vid.style.display = 'block';
    setTimeout(function() { vid.style.opacity = '0.45'; }, 100);
    console.log('✅ Hands ready');
  } catch (e) { console.error('❌', e); setHint('摄像头失败，可用鼠标/键盘操作'); }
}

// ─── Photo Wall ──────────────────────────────────────────────────
var photoWallEl = document.getElementById('photo-wall');
var photoGridEl = document.getElementById('photo-grid');

function renderPhotoPage() {
  if (!photoGridEl) return;
  photoGridEl.innerHTML = '';
  var start = state.photoPage * PHOTOS_PER_PAGE;
  var end = Math.min(start + PHOTOS_PER_PAGE, TOTAL_PHOTOS);

  for (var i = start; i < end; i++) {
    var num = (i + 1 < 10 ? '0' : '') + (i + 1);
    var card = document.createElement('div');
    card.className = 'lomo-card';
    card.style.transform = 'rotate(' + (Math.random() * 3 - 1.5) + 'deg)';

    var imgWrap = document.createElement('div');
    imgWrap.className = 'lomo-img-wrap';

    var img = document.createElement('img');
    img.src = './assets/images/photos/photo_' + num + '.jpg';
    img.alt = 'Photo ' + (i + 1);
    img.loading = 'lazy';
    img.className = 'lomo-img';

    var vignette = document.createElement('div');
    vignette.className = 'lomo-vignette';

    imgWrap.appendChild(img);
    imgWrap.appendChild(vignette);
    card.appendChild(imgWrap);

    var pageNum = document.createElement('div');
    pageNum.className = 'lomo-num';
    pageNum.textContent = '#' + (i + 1);
    card.appendChild(pageNum);

    photoGridEl.appendChild(card);
  }

  var indicator = document.getElementById('page-indicator');
  if (indicator) indicator.textContent = (state.photoPage + 1) + ' / ' + totalPages;
}

function nextPhotoPage() {
  if (state.photoPage < totalPages - 1) {
    state.photoPage++;
    playPageTurn();
    renderPhotoPage();
  } else {
    go(SCENES.CAKE);
  }
}

function prevPhotoPage() {
  if (state.photoPage > 0) {
    state.photoPage--;
    playPageTurn();
    renderPhotoPage();
  }
}

// ─── UI refs ─────────────────────────────────────────────────────
var hintEl = document.getElementById('hint-text'), scLbl = document.getElementById('scene-label');
var startBtn = document.getElementById('start-btn'), wishBtn = document.getElementById('wish-btn');
var resetBtn = document.getElementById('reset-btn'), nextBtn = document.getElementById('next-btn');

function setHint(t) { hintEl.innerHTML = t; hintEl.classList.remove('hidden'); }
function hideHint() { hintEl.classList.add('hidden'); }

function go(s) {
  console.log('🎬 ' + state.scene + ' → ' + s);
  state.scene = s; scLbl.textContent = s;
  photoWallEl.style.display = 'none'; env.visible = false; pts.visible = false;
  wishBtn.style.display = 'none'; resetBtn.style.display = 'none'; nextBtn.style.display = 'none';

  switch (s) {
    case SCENES.COVER:
      env.visible = true;
      setHint('✋ 张开手掌 或 点击屏幕');
      break;
    case SCENES.PHOTO_WALL:
      photoWallEl.style.display = 'block';
      state.photoPage = 0;
      renderPhotoPage();
      setHint('📸 ← → 翻页浏览回忆 · 最后一页自动进入蛋糕环节<br><small>手势左右滑 / 键盘方向键 / 点击下方按钮</small>');
      nextBtn.style.display = 'inline-block';
      nextBtn.textContent = 'NEXT →';
      break;
    case SCENES.CAKE:
      pts.visible = true;
      // [FIX] Start assembled immediately — place particles at target positions
      for (var _i = 0; _i < N; _i++) {
        pos[_i*3] = tgt[_i*3]; pos[_i*3+1] = tgt[_i*3+1]; pos[_i*3+2] = tgt[_i*3+2];
        vel[_i*3] = 0; vel[_i*3+1] = 0; vel[_i*3+2] = 0;
      }
      assembled = true; exploded = false; asmProg = 1;
      // [ROTATION] Reset rotation state
      state.rotationVelocity = 0;
      state.lastHandX = null;
      // [BLOW_CANDLE] Reset candle state
      state.candleLit = true;
      state.candleExtinguishing = false;
      state.candleExtinguishProgress = 0;
      state.pointUpStartTime = 0;
      // [COLOR_BREATH] Reset hue burst
      state.explodeHueBurst = 0;
      // Updated hint with new gestures
      setHint('🖐 张手爆散星海 · ☝️ 食指竖起2秒许愿<br><small>✊ 握拳重新聚合 · 🖐 移动手掌旋转蛋糕</small>');
      break;
    case SCENES.WISH:
      pts.visible = true;
      setHint('🎉 Happy Birthday, 小宝 Doris!<br>愿所有美好如期而至 ✦');
      fire('celebration'); playChime();
      var fa = document.getElementById('finale-audio');
      if (fa) { fa.volume = 0.5; fa.play().catch(function () {}); }
      setTimeout(function () { wishBtn.style.display = 'inline-block'; resetBtn.style.display = 'inline-block'; }, 1200);
      break;
  }
}

// Mouse fallback
var mDown = false;
document.addEventListener('mousedown', function () {
  mDown = true;
  if (state.scene === SCENES.COVER) go(SCENES.PHOTO_WALL);
  if (state.scene === SCENES.CAKE && exploded) formCake();
});
document.addEventListener('mouseup', function () {
  mDown = false;
  if (state.scene === SCENES.CAKE && assembled) explodeCake();
});

// Keyboard navigation for photo wall
document.addEventListener('keydown', function (e) {
  if (state.scene === SCENES.PHOTO_WALL) {
    if (e.key === 'ArrowRight' || e.key === ' ') nextPhotoPage();
    if (e.key === 'ArrowLeft') prevPhotoPage();
  }
});

// Buttons
nextBtn.addEventListener('click', function () {
  if (state.scene === SCENES.PHOTO_WALL) nextPhotoPage();
  else go(SCENES.CAKE);
});
wishBtn.addEventListener('click', function () { if (assembled) go(SCENES.WISH); });
resetBtn.addEventListener('click', function () { go(SCENES.CAKE); });

// ─── Loop ────────────────────────────────────────────────────────
var clock = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  var dt = clock.getDelta();
  if (state.scene === SCENES.COVER) env.rotation.z = Math.sin(performance.now() * .001) * .02;

  // [BLOW_CANDLE] Extinguish animation progression
  if (state.candleExtinguishing && assembled) {
    state.candleExtinguishProgress += dt * 0.8; // ~1.25s full transition
    if (state.candleExtinguishProgress >= 1) {
      state.candleExtinguishProgress = 1;
      state.candleExtinguishing = false;
      state.candleLit = false;
      // Auto-transition to WISH after brief pause
      setTimeout(function () {
        if (state.scene === SCENES.CAKE) go(SCENES.WISH);
      }, 1500);
    }
  }

  updateParticles(dt);
  renderer.render(scene3d, cam);
})();

// ─── Init ────────────────────────────────────────────────────────
startBtn.addEventListener('click', async function () {
  startBtn.style.display = 'none';
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  startBGM();
  setHint('📷 启动摄像头...');
  await initHands();
  go(SCENES.COVER);
  var ck = setInterval(function () {
    if (state.scene === SCENES.COVER && state.gesture === 'palm_open') {
      go(SCENES.PHOTO_WALL); clearInterval(ck);
    }
  }, 200);
});

window.addEventListener('resize', function () {
  cam.aspect = window.innerWidth / window.innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
console.log('🎂 Dear 小宝 Doris - v6 (Tier 1 Enhanced) loaded.');
