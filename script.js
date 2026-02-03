const webcam = document.getElementById("webcam");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");

// ----------------------------
// Canvas
// ----------------------------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ----------------------------
// Blink detection
// ----------------------------
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_THRESHOLD = 0.25;
let blinkDetected = false;

// ----------------------------
// Blur + fade
// ----------------------------
let blurLevel = 0;
const BLUR_STEP = 4;
const MAX_BLUR = 40;

let fadeProgress = 0;
const FADE_STEP = 0.05;

// ----------------------------
// Helpers
// ----------------------------
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(eye) {
  const A = distance(eye[1], eye[5]);
  const B = distance(eye[2], eye[4]);
  const C = distance(eye[0], eye[3]);
  return (A + B) / (2 * C);
}

// ----------------------------
// MediaPipe
// ----------------------------
const faceMesh = new FaceMesh({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  refineLandmarks: true,
  maxNumFaces: 1
});

faceMesh.onResults(results => {
  if (!results.multiFaceLandmarks) return;

  const lm = results.multiFaceLandmarks[0];
  const left = LEFT_EYE.map(i => lm[i]);
  const right = RIGHT_EYE.map(i => lm[i]);
  const ear = (eyeAspectRatio(left) + eyeAspectRatio(right)) / 2;

  if (ear < EAR_THRESHOLD && !blinkDetected) {
    blinkDetected = true;
    blurLevel = Math.min(blurLevel + 1, MAX_BLUR / BLUR_STEP);
    fadeProgress = Math.min(fadeProgress + FADE_STEP, 1);
  }

  if (ear >= EAR_THRESHOLD) blinkDetected = false;
});

// ----------------------------
// Webcam
// ----------------------------
const camera = new Camera(webcam, {
  onFrame: async () => {
    await faceMesh.send({ image: webcam });
  },
  width: 640,
  height: 480
});

// ----------------------------
// Draw loop
// ----------------------------
function draw() {
  requestAnimationFrame(draw);

  if (video.readyState < 2) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const scale = Math.max(
    canvas.width / vw,
    canvas.height / vh
  );

  const w = vw * scale;
  const h = vh * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.filter = `blur(${blurLevel * BLUR_STEP}px)`;
  ctx.drawImage(video, x, y, w, h);
  ctx.filter = "none";

  ctx.fillStyle = `rgba(0,0,0,${fadeProgress})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ----------------------------
// Start everything on click
// ----------------------------
async function start() {
  hint.remove();

  video.muted = false;
  video.loop = true;

  await video.play();
  await webcam.play();
  camera.start();

  draw();
}

document.body.addEventListener("click", start, { once: true });
