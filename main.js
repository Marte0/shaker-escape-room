const MAX_ENERGY = 200;
const LEVEL_COUNT = 16;
const ENERGY_PER_COLOR = 50;
const BATTERY_COLORS = ["is-yellow", "is-green", "is-blue", "is-pink"];
// Stessa taratura del progetto shake originale:
// p5 raddoppia l'accelerazione, deviceMoved usa una soglia di 0,5 per asse,
// e 30.000 unità di movimento vengono mappate su 350 joule.
const MOTION_SCALE = 2;
const MOVE_THRESHOLD = 0.5;
const MOVEMENT_RANGE = 30000;
const ENERGY_RANGE = 350;
const SAMPLE_EVERY_FRAMES = 4;

const startScreen = document.querySelector("#start-screen");
const gameScreen = document.querySelector("#game-screen");
const endScreen = document.querySelector("#end-screen");
const rechargeButton = document.querySelector("#recharge-button");
const restartButton = document.querySelector("#restart-button");
const testShakeButton = document.querySelector("#test-shake-button");
const permissionMessage = document.querySelector("#permission-message");
const battery = document.querySelector("#battery");
const jouleValue = document.querySelector("#joule-value");

let energy = 0;
let playing = false;
let lastHapticStep = 0;
let previousAcceleration = { x: 0, y: 0, z: 0 };
let shakeStrength = 0;
let totalMovement = 0;
let sampleFrame = 0;
let animationFrameId = null;

function createBatteryLevels() {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < LEVEL_COUNT; index += 1) {
    const level = document.createElement("div");
    level.className = "battery__level";
    fragment.append(level);
  }

  battery.replaceChildren(fragment);
}

function showScreen(screen) {
  [startScreen, gameScreen, endScreen].forEach((element) => {
    element.hidden = element !== screen;
  });
}

function renderEnergy() {
  const displayedEnergy = Math.min(MAX_ENERGY, Math.round(energy));
  const completedColors = Math.floor(displayedEnergy / ENERGY_PER_COLOR);
  const isFull = displayedEnergy === MAX_ENERGY;
  const baseColorIndex = completedColors - 1;
  const nextColorIndex = Math.min(completedColors, BATTERY_COLORS.length - 1);
  const energyInCurrentColor = isFull
    ? ENERGY_PER_COLOR
    : displayedEnergy % ENERGY_PER_COLOR;
  const transitioningLevels = Math.ceil(
    (energyInCurrentColor / ENERGY_PER_COLOR) * LEVEL_COUNT,
  );

  jouleValue.textContent = displayedEnergy;
  battery.querySelectorAll(".battery__level").forEach((level, index) => {
    level.className = "battery__level";
    const colorIndex = index < transitioningLevels ? nextColorIndex : baseColorIndex;
    if (colorIndex >= 0) level.classList.add(BATTERY_COLORS[colorIndex]);
  });
}

function addEnergy(amount) {
  if (!playing) return;

  energy = Math.min(MAX_ENERGY, energy + amount);
  renderEnergy();

  const hapticStep = Math.floor(energy / 25);
  if (hapticStep > lastHapticStep && navigator.vibrate) {
    navigator.vibrate(12);
  }
  lastHapticStep = hapticStep;

  if (energy >= MAX_ENERGY) finishGame();
}

function handleMotion(event) {
  if (!playing || !event.acceleration) return;

  const currentAcceleration = {
    x: (event.acceleration.x || 0) * MOTION_SCALE,
    y: (event.acceleration.y || 0) * MOTION_SCALE,
    z: (event.acceleration.z || 0) * MOTION_SCALE,
  };
  const hasMoved = ["x", "y", "z"].some(
    (axis) =>
      Math.abs(currentAcceleration[axis] - previousAcceleration[axis]) > MOVE_THRESHOLD,
  );

  previousAcceleration = currentAcceleration;
  if (hasMoved) {
    shakeStrength = Math.hypot(
      currentAcceleration.x,
      currentAcceleration.y,
      currentAcceleration.z,
    );
  }
}

function sampleMovement() {
  if (!playing) return;

  sampleFrame += 1;
  if (sampleFrame % SAMPLE_EVERY_FRAMES === 0) {
    totalMovement += shakeStrength;
    shakeStrength = 0;
    const calibratedEnergy = Math.round((totalMovement / MOVEMENT_RANGE) * ENERGY_RANGE);

    if (calibratedEnergy > energy) addEnergy(calibratedEnergy - energy);
  }

  if (playing) animationFrameId = requestAnimationFrame(sampleMovement);
}

async function requestMotionPermission() {
  if (typeof DeviceMotionEvent === "undefined") return true;
  if (typeof DeviceMotionEvent.requestPermission !== "function") return true;

  try {
    return (await DeviceMotionEvent.requestPermission()) === "granted";
  } catch (error) {
    console.error("Impossibile richiedere il permesso per il movimento:", error);
    return false;
  }
}

async function startGame() {
  rechargeButton.disabled = true;
  permissionMessage.textContent = "";

  const permissionGranted = await requestMotionPermission();
  rechargeButton.disabled = false;

  if (!permissionGranted) {
    permissionMessage.textContent =
      "Per giocare, consenti l’accesso al movimento del dispositivo e premi di nuovo Ricarica.";
    return;
  }

  energy = 0;
  playing = true;
  lastHapticStep = 0;
  previousAcceleration = { x: 0, y: 0, z: 0 };
  shakeStrength = 0;
  totalMovement = 0;
  sampleFrame = 0;
  renderEnergy();
  showScreen(gameScreen);
  window.addEventListener("devicemotion", handleMotion, { passive: true });
  animationFrameId = requestAnimationFrame(sampleMovement);
}

function finishGame() {
  playing = false;
  window.removeEventListener("devicemotion", handleMotion);
  cancelAnimationFrame(animationFrameId);
  energy = MAX_ENERGY;
  renderEnergy();

  if (navigator.vibrate) navigator.vibrate([80, 50, 140]);
  window.setTimeout(() => showScreen(endScreen), 280);
}

function restartGame() {
  playing = false;
  window.removeEventListener("devicemotion", handleMotion);
  cancelAnimationFrame(animationFrameId);
  permissionMessage.textContent = "";
  showScreen(startScreen);
}

function simulateShake() {
  addEnergy(5);
}

rechargeButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
testShakeButton.addEventListener("click", simulateShake);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && playing) {
    event.preventDefault();
    simulateShake();
  }
});

createBatteryLevels();
renderEnergy();
