const webcam = document.getElementById("webcam");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ----------------------------
// Fullscreen canvas
// ----------------------------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ----------------------------
// Eye landmark indices
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
let fadeProgress = 0.0;
const FADE_STEP = 0.08;
const MAX_FADE = 1.0;

// ----------------------------
// Helper: Eye Aspect Ratio
// ----------------------------
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(eye) {
  const A = distance(eye[1], eye[5]);
  const B = distance(eye[2], eye[4]);
  const C = distance(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
}

// ----------------------------
// MediaPipe FaceMesh
// ----------------------------
const faceMesh = new FaceMesh({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  refineLandmarks: true,
  maxNumFaces: 1
});

faceMesh.onResults(onResults);

// ----------------------------
// Webcam setup
// ----------------------------
const camera = new Camera(webcam, {
  onFrame: async () => {
    await faceMesh.send({ image: webcam });
  },
  width: 640,
  height: 480
});
camera.start();

// ----------------------------
// Blink detection
// ----------------------------
function onResults(results) {
  if (!results.multiFaceLandmarks) return;

  const landmarks = results.multiFaceLandmarks[0];
  const leftEye = LEFT_EYE.map(i => landmarks[i]);
  const rightEye = RIGHT_EYE.map(i => landmarks[i]);

  const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;

  if (ear < EAR_THRESHOLD && !blinkDetected) {
    blinkDetected = true;

    // Update blur and fade
    blurLevel = Math.min(blurLevel + 1, MAX_BLUR / BLUR_STEP);
    fadeProgress = Math.min(fadeProgress + FADE_STEP, MAX_FADE);

    console.log("Blink detected!", blurLevel, fadeProgress.toFixed(2));
  }

  if (ear >= EAR_THRESHOLD) {
    blinkDetected = false;
  }
}

// ----------------------------
// Draw loop
// ----------------------------
function draw() {
  requestAnimationFrame(draw);

  if (video.readyState < 2) return;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const scale = Math.max(canvas.width / vw, canvas.height / vh);
  const w = vw * scale;
  const h = vh * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  // Blur
  ctx.filter = `blur(${blurLevel * BLUR_STEP}px)`;
  ctx.drawImage(video, x, y, w, h);
  ctx.filter = "none";

  // Fade to black
  ctx.fillStyle = `rgba(0,0,0,${fadeProgress})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ----------------------------
// Start video and draw loop
// ----------------------------
video.addEventListener("canplay", () => video.play());
webcam.addEventListener("canplay", () => webcam.play());
draw();
