const MAX_ENERGY = 200;
const LEVEL_COUNT = 15;
const SHAKE_COOLDOWN_MS = 90;
const ACCELERATION_THRESHOLD = 5.5;
const GRAVITY_DELTA_THRESHOLD = 8;

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
let lastShakeAt = 0;
let lastGravitySample = null;
let lastHapticStep = 0;

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
  const chargedLevels = Math.ceil((displayedEnergy / MAX_ENERGY) * LEVEL_COUNT);

  jouleValue.textContent = displayedEnergy;
  battery.querySelectorAll(".battery__level").forEach((level, index) => {
    level.classList.toggle("is-charged", index < chargedLevels);
    level.classList.toggle("is-high", index < chargedLevels && displayedEnergy >= 120);
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

function vectorMagnitude(vector) {
  if (!vector) return 0;
  return Math.hypot(vector.x || 0, vector.y || 0, vector.z || 0);
}

function gravityDelta(current) {
  if (!current) return 0;

  const sample = {
    x: current.x || 0,
    y: current.y || 0,
    z: current.z || 0,
  };
  const delta = lastGravitySample
    ? Math.hypot(
        sample.x - lastGravitySample.x,
        sample.y - lastGravitySample.y,
        sample.z - lastGravitySample.z,
      )
    : 0;

  lastGravitySample = sample;
  return delta;
}

function handleMotion(event) {
  if (!playing) return;

  const now = performance.now();
  if (now - lastShakeAt < SHAKE_COOLDOWN_MS) return;

  const directAcceleration = vectorMagnitude(event.acceleration);
  const fallbackDelta = gravityDelta(event.accelerationIncludingGravity);
  const usesDirectAcceleration = directAcceleration > 0;
  const force = usesDirectAcceleration ? directAcceleration : fallbackDelta;
  const threshold = usesDirectAcceleration ? ACCELERATION_THRESHOLD : GRAVITY_DELTA_THRESHOLD;

  if (force < threshold) return;

  lastShakeAt = now;
  const intensity = Math.min(1, (force - threshold) / 12);
  addEnergy(2.2 + intensity * 2.8);
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
  lastShakeAt = 0;
  lastGravitySample = null;
  lastHapticStep = 0;
  renderEnergy();
  showScreen(gameScreen);
  window.addEventListener("devicemotion", handleMotion, { passive: true });
}

function finishGame() {
  playing = false;
  window.removeEventListener("devicemotion", handleMotion);
  energy = MAX_ENERGY;
  renderEnergy();

  if (navigator.vibrate) navigator.vibrate([80, 50, 140]);
  window.setTimeout(() => showScreen(endScreen), 280);
}

function restartGame() {
  playing = false;
  window.removeEventListener("devicemotion", handleMotion);
  permissionMessage.textContent = "";
  showScreen(startScreen);
}

function simulateShake() {
  addEnergy(10);
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
