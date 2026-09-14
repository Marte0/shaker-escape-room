const GAME_DURATION_MS = 20000;
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

const RESULTS = [
  {
    "threshold": 100,
    "image": "lampada",
    "name": "Lampada",
    "code": "LUM3N",
    "copy": "Hai prodotto energia sufficiente solo per una lampadina per 20 secondi. Dovrebbe bastare"
  },
  {
    "threshold": 200,
    "image": "ventilatore",
    "name": "Ventilatore",
    "code": "W4TT",
    "copy": "Una ventata di energia! Potresti accendere un ventilatore per 20 secondi. Abbastanza per la nostra avventura"
  },
  {
    "threshold": 300,
    "image": "modem",
    "name": "Modem",
    "code": "V0LT",
    "copy": "Connessione attivata! Hai energia per tenere acceso un modem per 10 secondi. Riprendi l’avventura"
  },
  {
    "threshold": 400,
    "image": "pc",
    "name": "PC",
    "code": "J0ULE",
    "copy": "Sistemi pronti! Hai prodotto abbastanza energia per accendere un PC per 10 secondi. Riprendi l’avventura"
  },
  {
    "threshold": 500,
    "image": "microonde",
    "name": "Microonde",
    "code": "PO73NZA",
    "copy": "La tua energia alimenta un microonde per mezzo secondo. Un istante breve, ma una bella carica per partire."
  },
  {
    "threshold": 600,
    "image": "phon",
    "name": "Phon",
    "code": "EN3R61A",
    "copy": "Un soffio di potenza! Hai energia per accendere un phon per 0,4 secondi. L’avventura può cominciare!"
  }
];

const shakePrompt = document.querySelector("#shake-prompt");
const gameAppliance = document.querySelector("#game-appliance");
const resultCodeBlock = document.querySelector("#result-code-block");
const resultCode = document.querySelector("#result-code");
const gameTimer = document.querySelector("#game-timer");
const resultEnergy = document.querySelector("#result-energy");
const resultAppliance = document.querySelector("#result-appliance");
const resultCopy = document.querySelector("#result-copy");
const desktopScreen = document.querySelector("#desktop-screen");
const startScreen = document.querySelector("#start-screen");
const gameScreen = document.querySelector("#game-screen");
const endScreen = document.querySelector("#end-screen");
const rechargeButton = document.querySelector("#recharge-button");
const restartButton = document.querySelector("#restart-button");
const permissionMessage = document.querySelector("#permission-message");
const battery = document.querySelector("#battery");
const jouleValue = document.querySelector("#joule-value");

let deadline = 0;
let finishTimeoutId = null;
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

function isMobileDevice() {
  // iPadOS può presentarsi come macOS: il multitouch distingue l’iPad.
  const isIPad = /Macintosh|MacIntel/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || isIPad;
}

function showScreen(screen) {
  if (!isMobileDevice()) screen = desktopScreen;
  [desktopScreen, startScreen, gameScreen, endScreen].forEach((element) => {
    element.hidden = element !== screen;
  });
}

function getResult(value) {
  return [...RESULTS].reverse().find(({ threshold }) => value >= threshold);
}

function renderEnergy() {
  const displayedEnergy = Math.round(energy);
  const completedColors = Math.floor(displayedEnergy / ENERGY_PER_COLOR);
  const baseColorIndex = completedColors === 0
    ? -1
    : (completedColors - 1) % BATTERY_COLORS.length;
  const nextColorIndex = completedColors % BATTERY_COLORS.length;
  const energyInCurrentColor = displayedEnergy % ENERGY_PER_COLOR;
  const transitioningLevels = Math.ceil(
    (energyInCurrentColor / ENERGY_PER_COLOR) * LEVEL_COUNT,
  );

  jouleValue.textContent = displayedEnergy;
  const result = getResult(displayedEnergy);
  shakePrompt.hidden = Boolean(result);
  gameAppliance.hidden = !result;
  if (result) {
    const src = `assets/${result.image}.png`;
    if (gameAppliance.getAttribute("src") !== src) gameAppliance.src = src;
    gameAppliance.alt = result.name;
  } else {
    gameAppliance.removeAttribute("src");
    gameAppliance.alt = "";
  }
  battery.querySelectorAll(".battery__level").forEach((level, index) => {
    level.className = "battery__level";
    const colorIndex = index < transitioningLevels ? nextColorIndex : baseColorIndex;
    if (colorIndex >= 0) level.classList.add(BATTERY_COLORS[colorIndex]);
  });
}

function addEnergy(amount) {
  if (!playing) return;

  if (performance.now() >= deadline) {
    finishGame();
    return;
  }

  energy += amount;
  renderEnergy();

  const hapticStep = Math.floor(energy / 25);
  if (hapticStep > lastHapticStep && navigator.vibrate) {
    navigator.vibrate(12);
  }
  lastHapticStep = hapticStep;

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

  const remaining = Math.max(0, deadline - performance.now());
  gameTimer.textContent = `${Math.ceil(remaining / 1000)}s`;
  if (remaining === 0) {
    finishGame();
    return;
  }

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
  if (!isMobileDevice()) {
    showScreen(desktopScreen);
    return;
  }
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
  resultCode.textContent = "";
  resultCodeBlock.hidden = true;
  playing = true;
  deadline = performance.now() + GAME_DURATION_MS;
  gameTimer.textContent = "20s";
  clearTimeout(finishTimeoutId);
  finishTimeoutId = window.setTimeout(finishGame, GAME_DURATION_MS);
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
  if (!playing) return;
  playing = false;
  clearTimeout(finishTimeoutId);
  gameTimer.textContent = "0s";
  window.removeEventListener("devicemotion", handleMotion);
  cancelAnimationFrame(animationFrameId);
  renderEnergy();
  const displayedEnergy = Math.round(energy);
  const result = getResult(displayedEnergy);
  const appliance = result || RESULTS[0];
  resultCode.textContent = result ? result.code : "";
  resultCodeBlock.hidden = !result;
  resultEnergy.textContent = `${displayedEnergy} joule`;
  resultAppliance.src = `assets/${appliance.image}.png`;
  resultAppliance.alt = appliance.name;
  resultAppliance.style.opacity = result ? "1" : "0.5";
  resultCopy.textContent = result
    ? result.copy
    : "Non hai ancora abbastanza energia per accendere una lampada per 20 secondi. Riprova e scuoti più forte!";

  if (navigator.vibrate) navigator.vibrate([80, 50, 140]);
  showScreen(endScreen);
}

function restartGame() {
  playing = false;
  clearTimeout(finishTimeoutId);
  window.removeEventListener("devicemotion", handleMotion);
  cancelAnimationFrame(animationFrameId);
  permissionMessage.textContent = "";
  showScreen(startScreen);
}

rechargeButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

createBatteryLevels();
renderEnergy();
showScreen(startScreen);
