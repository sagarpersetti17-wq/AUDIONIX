// ==========================================
// RIGCRAFT STUDIO - STAGE 1
// Interface interactions
// ==========================================

const navItems = document.querySelectorAll(".nav-item");
const pageViews = document.querySelectorAll(".page-view");
const breadcrumb = document.getElementById("breadcrumbPage");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const toast = document.getElementById("toast");

// TOAST MESSAGE

let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// NAVIGATION

function openView(viewName) {
  const target = document.getElementById("view-" + viewName);

  if (!target) return;

  pageViews.forEach(view => view.classList.remove("active"));
  target.classList.add("active");

  navItems.forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.view === viewName
    );
  });

  breadcrumb.textContent = viewName.toUpperCase();

  sidebar.classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navItems.forEach(item => {
  item.addEventListener("click", () => {
    openView(item.dataset.view);
  });
});

// LINKS INSIDE PANELS

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => {
    openView(button.dataset.goto);
  });
});

// MOBILE SIDEBAR

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document.addEventListener("click", event => {
  if (
    window.innerWidth <= 700 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !menuBtn.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});


let bpm = 120;

const bpmValue = document.getElementById("bpmValue");
const loopBpmValue = document.getElementById("loopBpmValue");

function updateProjectTempo() {
  bpmValue.textContent = bpm;

  if (loopBpmValue) {
    loopBpmValue.textContent = bpm;
  }
}

function changeProjectTempo(amount) {
  if (
    (typeof loopLength !== "undefined" && loopLength > 0) ||
    (typeof isCountingIn !== "undefined" && isCountingIn) ||
    (typeof activeRecorder !== "undefined" && activeRecorder)
  ) {
    showToast("Clear all loop tracks before changing tempo");
    return;
  }

  bpm = Math.max(30, Math.min(300, bpm + amount));

  updateProjectTempo();

  if (typeof updateSyncDisplay === "function") {
    updateSyncDisplay();
  }
}

updateProjectTempo();

document.getElementById("bpmUp").addEventListener("click", () => {
  changeProjectTempo(1);
});

document.getElementById("bpmDown").addEventListener("click", () => {
  changeProjectTempo(-1);
});


// TRANSPORT CONTROLS
// These are visual controls only in Stage 1.
// Actual audio playback will be implemented later.

let playing = false;
let recording = false;

const playBtn = document.getElementById("playBtn");
const recordBtn = document.getElementById("recordBtn");

playBtn.addEventListener("click", () => {
  playing = !playing;

  playBtn.textContent = playing ? "Ⅱ" : "▶";
  playBtn.classList.toggle("playing", playing);

  showToast(
    playing
      ? "Transport preview started"
      : "Transport preview paused"
  );
});

document.getElementById("stopBtn").addEventListener("click", () => {
  playing = false;
  recording = false;

  playBtn.textContent = "▶";
  playBtn.classList.remove("playing");

  recordBtn.style.color = "";
  recordBtn.style.borderColor = "";

  showToast("Transport stopped");
});

recordBtn.addEventListener("click", () => {
  recording = !recording;

  recordBtn.style.color = recording ? "#ed6565" : "";
  recordBtn.style.borderColor = recording ? "#ed6565" : "";

  showToast(
    recording
      ? "Recording preview selected — audio engine not connected"
      : "Recording preview stopped"
  );
});

// PEDAL BYPASS VISUALS
// Actual audio processing will be implemented in Stage 3.

document.querySelectorAll(".pedal").forEach(pedal => {
  pedal.addEventListener("click", () => {
    pedal.classList.toggle("off");

    const state = pedal.querySelector(".pedal-state");

    if (state) {
      state.textContent = pedal.classList.contains("off")
        ? "OFF"
        : "ON";
    }

    showToast(
      pedal.classList.contains("off")
        ? "Effect bypass preview"
        : "Effect enabled preview"
    );
  });
});

// NEW SESSION - STAGE 10

document.getElementById("newSessionBtn").addEventListener("click", () => {
  startNewSession();
});

// SAVE BUTTON - STAGE 10

document.getElementById("saveBtn").addEventListener(
  "click",
  saveProject
);

// LARGE PEDALBOARD

const largePedalGrid = document.getElementById("largePedalGrid");

const pedalNames = [
  ["ZNR", "NOISE GATE"],
  ["DRIVE", "OVERDRIVE"],
  ["COMP", "COMPRESSOR"],
  ["AMP", "AMPLIFIER"],
  ["CAB", "CABINET"],
  ["EQ", "EQUALISER"],
  ["CHORUS", "MODULATION"],
  ["DLY", "DELAY"],
  ["RV B", "REVERB"]
];

pedalNames.forEach((item, index) => {
  const pedal = document.createElement("button");

  pedal.className = "pedal";
  if (index % 3 === 1) pedal.classList.add("pedal-drive");
  if (index % 3 === 2) pedal.classList.add("pedal-amp");

  pedal.innerHTML = `
    <span class="pedal-led"></span>
    <span class="pedal-name">${item[0]}</span>
    <span class="pedal-type">${item[1]}</span>
    <span class="pedal-knob"></span>
    <span class="pedal-switch"></span>
    <span class="pedal-state">ON</span>
  `;

  pedal.addEventListener("click", () => {
    pedal.classList.toggle("off");

    pedal.querySelector(".pedal-state").textContent =
      pedal.classList.contains("off") ? "OFF" : "ON";

    showToast("Effect bypass preview");
  });

  largePedalGrid.appendChild(pedal);
});

// INITIAL STATE

openView("studio");
// ==========================================
// AUDIONIX - STAGE 2
// LIVE AUDIO INPUT ENGINE
// ==========================================

const audioDevice = document.getElementById("audioDevice");
const connectAudioBtn = document.getElementById("connectAudioBtn");
const disconnectAudioBtn = document.getElementById("disconnectAudioBtn");

const audioStatus = document.getElementById("audioStatus");
const levelBar = document.getElementById("levelBar");
const levelValue = document.getElementById("levelValue");

let audioContext = null;
let audioStream = null;
let audioSource = null;
let analyser = null;
let audioAnimation = null;


// ------------------------------------------
// UPDATE DEVICE LIST
// ------------------------------------------

async function loadAudioDevices() {

  try {

    const devices = await navigator.mediaDevices.enumerateDevices();

    const audioInputs = devices.filter(
      device => device.kind === "audioinput"
    );

    const previousDevice = audioDevice.value;

    audioDevice.innerHTML = "";

    if (audioInputs.length === 0) {

      audioDevice.innerHTML =
        '<option value="">No input devices found</option>';

      return;
    }

    audioInputs.forEach((device, index) => {

      const option = document.createElement("option");

      option.value = device.deviceId;

      option.textContent =
        device.label || `Audio Input ${index + 1}`;

      audioDevice.appendChild(option);

    });

    if (audioInputs.some(device => device.deviceId === previousDevice)) {
      audioDevice.value = previousDevice;
    }

  } catch (error) {

    console.error("Device detection error:", error);

  }

}


// ------------------------------------------
// CONNECTION STATUS
// ------------------------------------------

function updateAudioStatus(message, connected) {

  audioStatus.innerHTML = `
    <span class="status-dot"></span>
    ${message}
  `;

  audioStatus.classList.toggle("connected", connected);

}


// ------------------------------------------
// CONNECT AUDIO INPUT
// ------------------------------------------

async function connectAudio() {

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

    showToast("Audio input requires a supported secure browser context");
    return;

  }

  try {

    connectAudioBtn.disabled = true;

    updateAudioStatus("Requesting audio permission...", false);

    const selectedDevice = audioDevice.value;

    const constraints = {

      audio: {
        deviceId: selectedDevice
          ? { exact: selectedDevice }
          : undefined,

        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false

      }

    };

    audioStream = await navigator.mediaDevices.getUserMedia(constraints);

    await loadAudioDevices();

    audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();

    await audioContext.resume();

    audioSource = audioContext.createMediaStreamSource(audioStream);

    analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;

    audioSource.connect(analyser);
    setupGuitarEffects();

    connectAudioBtn.disabled = true;
    disconnectAudioBtn.disabled = false;
    audioDevice.disabled = true;

    updateAudioStatus("Audio input connected", true);

    showToast("AUDIONIX audio input connected");

    startLevelMeter();

  } catch (error) {

    console.error("Audio connection error:", error);

    stopAudio();

    let message = "Unable to connect audio input";

    if (error.name === "NotAllowedError") {
      message = "Microphone permission denied";
    }

    if (error.name === "NotFoundError") {
      message = "No audio input device found";
    }

    if (error.name === "NotReadableError") {
      message = "Audio device is unavailable or in use";
    }

    updateAudioStatus(message, false);

    showToast(message);

    connectAudioBtn.disabled = false;

  }

}


// ------------------------------------------
// LIVE INPUT LEVEL METER
// ------------------------------------------

function startLevelMeter() {

  const buffer = new Float32Array(analyser.fftSize);

  function updateMeter() {

    if (!analyser) return;

    analyser.getFloatTimeDomainData(buffer);

    let sum = 0;

    for (let i = 0; i < buffer.length; i++) {

      sum += buffer[i] * buffer[i];

    }

    const rms = Math.sqrt(sum / buffer.length);

    const db = rms > 0
      ? 20 * Math.log10(rms)
      : -Infinity;

    const percentage = Math.min(
      100,
      Math.max(0, (db + 60) / 60 * 100)
    );

    levelBar.style.width = percentage + "%";

    if (db > -6) {
      levelBar.className = "clipping";
    } else if (db > -18) {
      levelBar.className = "warning";
    } else {
      levelBar.className = "";
    }

    levelValue.textContent =
      Number.isFinite(db) ? db.toFixed(1) + " dB" : "-∞ dB";

    audioAnimation = requestAnimationFrame(updateMeter);

  }

  updateMeter();

}


// ------------------------------------------
// DISCONNECT AUDIO INPUT
// ------------------------------------------

function stopAudio() {

  if (audioAnimation) {

    cancelAnimationFrame(audioAnimation);
    audioAnimation = null;

  }

  if (audioStream) {

    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;

  }

  if (audioContext) {

    audioContext.close();
    audioContext = null;

  }

  audioSource = null;
  analyser = null;

  levelBar.style.width = "0%";
  levelBar.className = "";
  levelValue.textContent = "-∞ dB";

  connectAudioBtn.disabled = false;
  disconnectAudioBtn.disabled = true;
  audioDevice.disabled = false;

  updateAudioStatus("Audio input disconnected", false);

}


// ------------------------------------------
// BUTTON EVENTS
// ------------------------------------------

connectAudioBtn.addEventListener("click", connectAudio);

disconnectAudioBtn.addEventListener("click", () => {

  stopAudio();

  showToast("Audio input disconnected");

});


// ------------------------------------------
// DEVICE CHANGE DETECTION
// ------------------------------------------

if (navigator.mediaDevices) {

  loadAudioDevices();

  navigator.mediaDevices.addEventListener(
    "devicechange",
    loadAudioDevices
  );

}

// ==========================================
// AUDIONIX - STAGE 3
// REAL-TIME GUITAR EFFECTS
// ==========================================

let effectInput = null;
let distortion = null;
let bassFilter = null;
let midFilter = null;
let trebleFilter = null;
let masterGain = null;

let monitoring = false;


// ------------------------------------------
// DISTORTION CURVE
// ------------------------------------------

function makeDistortionCurve(amount) {

  const samples = 44100;
  const curve = new Float32Array(samples);

  const intensity = amount / 100;

  for (let i = 0; i < samples; i++) {

    const x = (i * 2) / samples - 1;

    curve[i] =
      ((3 + intensity * 80) * x * 20 * Math.PI / 180) /
      (Math.PI + intensity * 80 * Math.abs(x));

  }

  return curve;

}


// ------------------------------------------
// BUILD EFFECT CHAIN
// ------------------------------------------

function setupGuitarEffects() {

  if (!audioContext || !audioSource) return;

  effectInput = audioContext.createGain();

  distortion = audioContext.createWaveShaper();
  distortion.oversample = "4x";

  bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = "lowshelf";
  bassFilter.frequency.value = 250;

  midFilter = audioContext.createBiquadFilter();
  midFilter.type = "peaking";
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 0.8;

  trebleFilter = audioContext.createBiquadFilter();
  trebleFilter.type = "highshelf";
  trebleFilter.frequency.value = 4000;

  masterGain = audioContext.createGain();

  // Monitoring stays muted until manually enabled.
  masterGain.gain.value = 0;

  effectInput.connect(distortion);
  distortion.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(trebleFilter);
  // DRY SIGNAL
trebleFilter.connect(masterGain);

// DELAY EFFECT
delayNode = audioContext.createDelay(2);
delayNode.delayTime.value = 0.32;

delayFeedback = audioContext.createGain();
delayFeedback.gain.value = 0.25;

delayWet = audioContext.createGain();
delayWet.gain.value = 0;

trebleFilter.connect(delayNode);
delayNode.connect(delayWet);
delayWet.connect(masterGain);

delayNode.connect(delayFeedback);
delayFeedback.connect(delayNode);

// REVERB EFFECT
reverbNode = audioContext.createConvolver();
reverbNode.buffer = createReverbImpulse(audioContext, 2.5, 2.5);

reverbWet = audioContext.createGain();
reverbWet.gain.value = 0;

trebleFilter.connect(reverbNode);
reverbNode.connect(reverbWet);
reverbWet.connect(masterGain);

  masterGain.connect(audioContext.destination);

  // Send the guitar input into the effects chain.
  audioSource.connect(effectInput);

  updateDrive();
  updateTone();
  updateOutput();
  updateDelay();
  updateReverb();

}


// ------------------------------------------
// DRIVE CONTROL
// ------------------------------------------

const driveAmount = document.getElementById("driveAmount");
const driveValue = document.getElementById("driveValue");

function updateDrive() {

  if (!distortion || !driveAmount) return;

  const enabled = !document
    .querySelector('[data-pedal="drive"]')
    ?.classList.contains("off");

  distortion.curve = enabled
    ? makeDistortionCurve(Number(driveAmount.value))
    : makeDistortionCurve(0);

  driveValue.textContent = driveAmount.value + "%";

}

driveAmount.addEventListener("input", updateDrive);


// ------------------------------------------
// AMPLIFIER TONE CONTROLS
// ------------------------------------------

const bassAmount = document.getElementById("bassAmount");
const midAmount = document.getElementById("midAmount");
const trebleAmount = document.getElementById("trebleAmount");

function updateTone() {

  if (!bassFilter) return;

  const ampEnabled = !document
    .querySelector('[data-pedal="amp"]')
    ?.classList.contains("off");

  bassFilter.gain = ampEnabled ? Number(bassAmount.value) : 0;
  midFilter.gain = ampEnabled ? Number(midAmount.value) : 0;
  trebleFilter.gain = ampEnabled ? Number(trebleAmount.value) : 0;

  document.getElementById("bassValue").textContent =
    bassAmount.value + " dB";

  document.getElementById("midValue").textContent =
    midAmount.value + " dB";

  document.getElementById("trebleValue").textContent =
    trebleAmount.value + " dB";

}

[bassAmount, midAmount, trebleAmount].forEach(control => {
  control.addEventListener("input", updateTone);
});


// ------------------------------------------
// OUTPUT LEVEL
// ------------------------------------------

const outputAmount = document.getElementById("outputAmount");
const outputValue = document.getElementById("outputValue");

function updateOutput() {

  if (!masterGain) return;

  const volume = Number(outputAmount.value) / 100;

  masterGain.gain.setTargetAtTime(
    monitoring ? volume : 0,
    audioContext.currentTime,
    0.03
  );

  outputValue.textContent = outputAmount.value + "%";

}

outputAmount.addEventListener("input", updateOutput);


// ------------------------------------------
// AUDIO MONITORING
// ------------------------------------------

const monitorBtn = document.getElementById("monitorBtn");

monitorBtn.addEventListener("click", async () => {

  if (!audioContext || !audioSource) {
    showToast("Connect an audio input first");
    return;
  }

  monitoring = !monitoring;

  await audioContext.resume();

  monitorBtn.textContent = monitoring
    ? "DISABLE AUDIO MONITORING"
    : "ENABLE AUDIO MONITORING";

  monitorBtn.classList.toggle("active", monitoring);

  updateOutput();

  showToast(
    monitoring
      ? "Audio monitoring enabled"
      : "Audio monitoring disabled"
  );

});


// ------------------------------------------
// PEDAL BYPASS CONNECTION
// ------------------------------------------

// Assign IDs to the larger pedalboard.
const pedalIds = [
  "gate",
  "drive",
  "comp",
  "amp",
  "cab",
  "eq",
  "chorus",
  "delay",
  "reverb"
];

document.querySelectorAll("#largePedalGrid .pedal").forEach((pedal, index) => {
  pedal.dataset.pedal = pedalIds[index];
});


// Connect the Drive and Amp pedal switches to real processing.
document.querySelectorAll(".pedal").forEach(pedal => {

  pedal.addEventListener("click", () => {

    const effect = pedal.dataset.pedal;

    if (effect !== "drive" && effect !== "amp") return;

    // The original pedal click handler runs first.
    // Read its updated ON/OFF state.
    const isOff = pedal.classList.contains("off");

    // Keep matching pedals in both views synchronised.
    document.querySelectorAll(`[data-pedal="${effect}"]`).forEach(other => {

      other.classList.toggle("off", isOff);

      const state = other.querySelector(".pedal-state");

      if (state) {
        state.textContent = isOff ? "OFF" : "ON";
      }

    });

    if (effect === "drive") updateDrive();
    if (effect === "amp") updateTone();

  });

});


// ------------------------------------------
// RESET MONITORING WHEN DISCONNECTING
// ------------------------------------------

const originalStopAudio = stopAudio;

stopAudio = function() {

  monitoring = false;

  monitorBtn.textContent = "ENABLE AUDIO MONITORING";
  monitorBtn.classList.remove("active");

  originalStopAudio();

  effectInput = null;
  distortion = null;
  bassFilter = null;
  midFilter = null;
  trebleFilter = null;
  masterGain = null;

};

// ==========================================
// AUDIONIX - BUILT-IN TEST SIGNAL
// ==========================================

let testOscillator = null;
let testGain = null;

const startTestSignalBtn =
  document.getElementById("startTestSignal");

const stopTestSignalBtn =
  document.getElementById("stopTestSignal");


// ------------------------------------------
// START TEST SIGNAL
// ------------------------------------------

async function startTestSignal() {

  if (audioContext) {
    showToast("Disconnect the current input first");
    return;
  }

  try {

    audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();

    await audioContext.resume();

    // Generate a test tone.
    testOscillator = audioContext.createOscillator();

    testOscillator.type = "sawtooth";
    testOscillator.frequency.value = 110;

    // Keep the signal at a safe level.
    testGain = audioContext.createGain();
    testGain.gain.value = 0.12;

    testOscillator.connect(testGain);

    // Use the generated signal as our audio input.
    audioSource = testGain;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    audioSource.connect(analyser);

    // Send it through the real effects chain.
    setupGuitarEffects();

    testOscillator.start();

    startLevelMeter();

    startTestSignalBtn.disabled = true;
    stopTestSignalBtn.disabled = false;

    connectAudioBtn.disabled = true;
    audioDevice.disabled = true;
    disconnectAudioBtn.disabled = true;

    updateAudioStatus("Built-in test signal running", true);

    showToast("Test signal started");

  } catch (error) {

    console.error("Test signal error:", error);

    stopAudio();

    showToast("Unable to start test signal");

  }

}


// ------------------------------------------
// STOP TEST SIGNAL
// ------------------------------------------

function stopTestSignal() {

  if (testOscillator) {

    try {
      testOscillator.stop();
    } catch (error) {}

    testOscillator = null;

  }

  testGain = null;

  monitoring = false;

  stopAudio();

  startTestSignalBtn.disabled = false;
  stopTestSignalBtn.disabled = true;

  showToast("Test signal stopped");

}


// ------------------------------------------
// BUTTON EVENTS
// ------------------------------------------

startTestSignalBtn.addEventListener(
  "click",
  startTestSignal
);

stopTestSignalBtn.addEventListener(
  "click",
  stopTestSignal
);

// ==========================================
// AUDIONIX - STAGE 3.2
// DELAY AND REVERB
// ==========================================

let delayNode = null;
let delayFeedback = null;
let delayWet = null;

let reverbNode = null;
let reverbWet = null;

const delayAmount = document.getElementById("delayAmount");
const delayValue = document.getElementById("delayValue");

const reverbAmount = document.getElementById("reverbAmount");
const reverbValue = document.getElementById("reverbValue");


// ------------------------------------------
// GENERATE REVERB IMPULSE
// ------------------------------------------

function createReverbImpulse(context, duration, decay) {

  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;

  const impulse = context.createBuffer(
    2,
    length,
    sampleRate
  );

  for (let channel = 0; channel < 2; channel++) {

    const data = impulse.getChannelData(channel);

    for (let i = 0; i < length; i++) {

      const fade = Math.pow(1 - i / length, decay);

      data[i] = (Math.random() * 2 - 1) * fade;

    }

  }

  return impulse;

}


// ------------------------------------------
// UPDATE DELAY
// ------------------------------------------

function updateDelay() {

  if (!delayWet) return;

  const amount = Number(delayAmount.value);

  delayWet.gain.setTargetAtTime(
    amount / 100 * 0.45,
    audioContext.currentTime,
    0.03
  );

  delayValue.textContent = amount + "%";

}

delayAmount.addEventListener("input", updateDelay);


// ------------------------------------------
// UPDATE REVERB
// ------------------------------------------

function updateReverb() {

  if (!reverbWet) return;

  const amount = Number(reverbAmount.value);

  reverbWet.gain.setTargetAtTime(
    amount / 100 * 0.4,
    audioContext.currentTime,
    0.03
  );

  reverbValue.textContent = amount + "%";

}

reverbAmount.addEventListener("input", updateReverb);


// ------------------------------------------
// RESET EFFECT NODES ON DISCONNECT
// ------------------------------------------

const previousStopAudio = stopAudio;

stopAudio = function() {

  previousStopAudio();

  delayNode = null;
  delayFeedback = null;
  delayWet = null;

  reverbNode = null;
  reverbWet = null;

};

// AUDIONIX - STAGE 6
// TEMPO-SYNCED MULTITRACK LOOP STATION
// ==========================================

const loopRecordBtn = document.getElementById("loopRecordBtn");
const loopStopBtn = document.getElementById("loopStopBtn");
const loopPlayBtn = document.getElementById("loopPlayBtn");
const loopStopPlaybackBtn = document.getElementById("loopStopPlaybackBtn");
const loopClearBtn = document.getElementById("loopClearBtn");

const loopStatus = document.getElementById("loopStatus");
const recordTime = document.getElementById("recordTime");
const loopDuration = document.getElementById("loopDuration");

const multitrackList = document.getElementById("multitrackList");
const armedTrackName = document.getElementById("armedTrackName");
const tracksUsed = document.getElementById("tracksUsed");
const loopTimerLabel = document.getElementById("loopTimerLabel");

const loopBars = document.getElementById("loopBars");
const metronomeBtn = document.getElementById("metronomeBtn");
const countInBtn = document.getElementById("countInBtn");
const syncStatus = document.getElementById("syncStatus");
const countInDisplay = document.getElementById("countInDisplay");

const trackDefinitions = [
  { name: "Guitar Rhythm", color: "#d5a057" },
  { name: "Bass", color: "#70a9e5" },
  { name: "Vocals", color: "#ce85a2" },
  { name: "Keyboard", color: "#8fc9a0" }
];

const loopTracks = trackDefinitions.map((definition, index) => ({
  id: index,
  name: definition.name,
  color: definition.color,
  buffer: null,
  duration: 0,
  clips: [],
  muted: false,
  solo: false,
  volume: 80,
  pan: 0,
  source: null,
  gainNode: null,
  panNode: null
}));

let armedTrack = 0;
let loopLength = 0;

let activeRecorder = null;
let activeDestination = null;
let recordingSource = null;
let recordingTrack = null;

let recordingStartedAt = 0;
let recordingTimer = null;
let autoStopTimer = null;

let isPlaying = false;
let isCountingIn = false;

let playbackPaused = false;
let pausedPlaybackOffset = 0;

let masterVolume = 85;
let masterMixGain = null;

let countInTimer = null;
let countInDisplayTimer = null;

let countInEnabled = true;
let metronomeEnabled = false;

let metronomeTimer = null;
let nextBeatTime = 0;
let metronomeBeat = 0;

// ==========================================
// STAGE 11.2 - CLIP ENGINE
// ==========================================

let selectedTimelineClipId = null;
let clipUndoStack = [];
let timelineDragState = null;

let clipIdCounter = 0;

function createTimelineClip(
  buffer,
  start = 0,
  duration = buffer.duration,
  sourceStart = 0
) {
  clipIdCounter++;

  return {
    id: "clip-" + Date.now() + "-" + clipIdCounter,
    buffer,
    start,
    duration,
    sourceStart
  };
}


// ------------------------------------------
// ENSURE TRACK HAS CLIP DATA
// ------------------------------------------

function ensureTrackClips(track) {
  if (!Array.isArray(track.clips)) {
    track.clips = [];
  }

  if (track.clips.length === 0 && track.buffer) {
    track.clips.push(
      createTimelineClip(
        track.buffer,
        0,
        track.buffer.duration,
        0
      )
    );
  }

  return track.clips;
}


// ------------------------------------------
// REBUILD ACTUAL TRACK AUDIO FROM CLIPS
// ------------------------------------------

function rebuildTrackArrangement(track) {

  if (!audioContext || !loopLength || !track.clips.length) {
    track.buffer = null;
    track.duration = 0;
    return;
  }

  const sampleRate = track.clips[0].buffer.sampleRate;

  const frameCount = Math.ceil(loopLength * sampleRate);

  const channelCount = Math.max(
    1,
    ...track.clips.map(clip => clip.buffer.numberOfChannels)
  );

  const arrangement = audioContext.createBuffer(
    channelCount,
    frameCount,
    sampleRate
  );

  const outputChannels = [];

  for (let channel = 0; channel < channelCount; channel++) {
    outputChannels.push(
      arrangement.getChannelData(channel)
    );
  }

  track.clips.forEach(clip => {

    const destinationStart = Math.round(
      clip.start * sampleRate
    );

    const sourceStart = Math.round(
      clip.sourceStart * clip.buffer.sampleRate
    );

    const requestedFrames = Math.round(
      clip.duration * sampleRate
    );

    const availableSourceFrames =
      clip.buffer.length - sourceStart;

    const availableDestinationFrames =
      frameCount - destinationStart;

    const copyFrames = Math.min(
      requestedFrames,
      availableSourceFrames,
      availableDestinationFrames
    );

    if (
      copyFrames <= 0 ||
      destinationStart < 0 ||
      sourceStart < 0
    ) {
      return;
    }

    for (let channel = 0; channel < channelCount; channel++) {

      const sourceChannel = Math.min(
        channel,
        clip.buffer.numberOfChannels - 1
      );

      const sourceData =
        clip.buffer.getChannelData(sourceChannel);

      const destinationData =
        outputChannels[channel];

      for (let i = 0; i < copyFrames; i++) {

        destinationData[destinationStart + i] +=
          sourceData[sourceStart + i];

      }
    }

  });

  // Prevent clipping when clips overlap.

  for (const channelData of outputChannels) {

    for (let i = 0; i < channelData.length; i++) {

      channelData[i] = Math.max(
        -1,
        Math.min(1, channelData[i])
      );

    }

  }

  track.buffer = arrangement;
  track.duration = loopLength;
}


// ------------------------------------------
// CLIP UNDO SNAPSHOTS
// ------------------------------------------

function captureClipUndoState() {

  return loopTracks.map(track => ({

    buffer: track.buffer,

    duration: track.duration,

    clips: (track.clips || []).map(clip => ({
      ...clip
    }))

  }));

}


function pushClipUndoState(snapshot = null) {

  clipUndoStack.push(
    snapshot || captureClipUndoState()
  );

  if (clipUndoStack.length > 30) {
    clipUndoStack.shift();
  }

  updateClipEditorControls();

}


// ------------------------------------------
// RESTORE CLIP STATE
// ------------------------------------------

function restoreClipUndoState(snapshot) {

  snapshot.forEach((savedTrack, index) => {

    const track = loopTracks[index];

    track.buffer = savedTrack.buffer;
    track.duration = savedTrack.duration;

    track.clips = savedTrack.clips.map(clip => ({
      ...clip
    }));

  });

  renderTracks();

}


// ------------------------------------------
// GET SELECTED CLIP
// ------------------------------------------

function getSelectedTimelineClip() {

  if (selectedTimelineTrackId === null) {
    return null;
  }

  const track = loopTracks[selectedTimelineTrackId];

  if (!track) return null;

  return track.clips.find(
    clip => clip.id === selectedTimelineClipId
  ) || null;

}


// ------------------------------------------
// CURRENT PLAYHEAD TIME
// ------------------------------------------

function getCurrentTimelinePosition() {

  if (isPlaying && audioContext && loopLength > 0) {

    const elapsed =
      audioContext.currentTime - timelineStartTime;

    return ((elapsed % loopLength) + loopLength) % loopLength;

  }

  if (playbackPaused) {
    return pausedPlaybackOffset;
  }

  return 0;

}


// ------------------------------------------
// UPDATE CLIP BUTTONS
// ------------------------------------------

function updateClipEditorControls() {

  const selectedClip = getSelectedTimelineClip();

  const hasSelection = selectedClip !== null;

  if (splitClipBtn) {
    splitClipBtn.disabled = !hasSelection;
  }

  if (deleteClipBtn) {
    deleteClipBtn.disabled = !hasSelection;
  }

  if (undoClipBtn) {
    undoClipBtn.disabled = clipUndoStack.length === 0;
  }

  if (!hasSelection && selectedClipName) {
    selectedClipName.textContent = "No clip selected";
  }

}
// ------------------------------------------
// MUSICAL TIMING
// ------------------------------------------

function getBeatDuration() {
  return 60 / bpm;
}

function getBarDuration() {
  return getBeatDuration() * 4;
}

function getSelectedLoopDuration() {
  const bars = Number(loopBars.value);
  return getBarDuration() * bars;
}

// ------------------------------------------
// UPDATE SYNC DISPLAY
// ------------------------------------------

function updateSyncDisplay() {
  loopBpmValue.textContent = bpm;

  const locked =
    loopLength > 0 ||
    isCountingIn ||
    activeRecorder !== null;

  loopBars.disabled = locked;

  syncStatus.textContent = locked
    ? "TEMPO LOCKED"
    : "SYNC READY";

  syncStatus.classList.toggle("locked", locked);
}

// ------------------------------------------
// TIME FORMAT
// ------------------------------------------

function formatLoopTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return String(mins).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0");
}

// ------------------------------------------
// METRONOME CLICK SOUND
// ------------------------------------------

function scheduleMetronomeClick(time, accented) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = accented ? 1300 : 850;

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.7, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(time);
  oscillator.stop(time + 0.05);
}

// ------------------------------------------
// METRONOME SCHEDULER
// ------------------------------------------

function startMetronomeScheduler() {
  if (!audioContext || metronomeTimer) return;

  nextBeatTime = audioContext.currentTime + 0.05;
  metronomeBeat = 0;

  metronomeTimer = setInterval(() => {
    if (!audioContext) return;

    const lookAhead = audioContext.currentTime + 0.12;

    while (nextBeatTime < lookAhead) {
      scheduleMetronomeClick(
        nextBeatTime,
        metronomeBeat === 0
      );

      nextBeatTime += getBeatDuration();
      metronomeBeat = (metronomeBeat + 1) % 4;
    }
  }, 25);
}

function stopMetronomeScheduler() {
  if (metronomeTimer) {
    clearInterval(metronomeTimer);
    metronomeTimer = null;
  }
}

function updateMetronome() {
  if (metronomeEnabled || isCountingIn) {
    startMetronomeScheduler();
  } else {
    stopMetronomeScheduler();
  }
}

// ------------------------------------------
// METRONOME BUTTON
// ------------------------------------------

metronomeBtn.addEventListener("click", () => {
  metronomeEnabled = !metronomeEnabled;

  metronomeBtn.textContent = metronomeEnabled
    ? "ON"
    : "OFF";

  metronomeBtn.classList.toggle(
    "active",
    metronomeEnabled
  );

  updateMetronome();

  showToast(
    metronomeEnabled
      ? "Metronome enabled"
      : "Metronome disabled"
  );
});

// ------------------------------------------
// COUNT-IN BUTTON
// ------------------------------------------

countInBtn.addEventListener("click", () => {
  countInEnabled = !countInEnabled;

  countInBtn.textContent = countInEnabled
    ? "ON"
    : "OFF";

  countInBtn.classList.toggle(
    "active",
    countInEnabled
  );
});

// ------------------------------------------
// LOOP LENGTH SELECTION
// ------------------------------------------

loopBars.addEventListener("change", () => {
  updateSyncDisplay();
});

// ------------------------------------------
// COUNT-IN
// ------------------------------------------

async function beginCountIn() {
  if (!audioContext) return;

  await audioContext.resume();

  isCountingIn = true;

  loopRecordBtn.disabled = true;
  loopStopBtn.disabled = false;

  loopStatus.textContent = "Count-in in progress";

  countInDisplay.className = "count-in-display counting";

  const beatDuration = getBeatDuration();
  const startTime = audioContext.currentTime + 0.05;

  // Keep existing tracks running during the count-in.
  // One complete bar brings them back to the loop boundary.

  if (loopLength > 0 && !isPlaying) {
    startAllTracks(startTime);
  }

  updateMetronome();

  let displayedBeat = 0;

  function updateCountInDisplay() {
    if (!isCountingIn) return;

    displayedBeat++;

    countInDisplay.textContent =
      "COUNT-IN  ·  " + displayedBeat + " / 4";
  }

  updateCountInDisplay();

  countInDisplayTimer = setInterval(
    updateCountInDisplay,
    beatDuration * 1000
  );

  const countInDuration = beatDuration * 4 * 1000;

  countInTimer = setTimeout(() => {
    countInTimer = null;

    clearInterval(countInDisplayTimer);
    countInDisplayTimer = null;

    isCountingIn = false;

    updateMetronome();

    countInDisplay.className =
      "count-in-display recording-state";

    countInDisplay.textContent = "RECORDING";

    const targetDuration = loopLength > 0
  ? loopLength
  : null;

beginLoopRecording(targetDuration);

  }, countInDuration);

  updateSyncDisplay();
}

// ------------------------------------------
// CANCEL COUNT-IN
// ------------------------------------------

function cancelCountIn() {
  if (countInTimer) {
    clearTimeout(countInTimer);
    countInTimer = null;
  }

  if (countInDisplayTimer) {
    clearInterval(countInDisplayTimer);
    countInDisplayTimer = null;
  }

  isCountingIn = false;

  updateMetronome();

  countInDisplay.className = "count-in-display";
  countInDisplay.textContent = "COUNT-IN CANCELLED";

  loopRecordBtn.disabled = false;
  loopStopBtn.disabled = true;

  if (loopLength > 0) {
    stopAllTracks();
  }

  updateSyncDisplay();
}

// ------------------------------------------
// RENDER TRACKS
// ------------------------------------------

function renderTracks() {
  multitrackList.innerHTML = "";

  loopTracks.forEach(track => {
    const isArmed = track.id === armedTrack;

    const row = document.createElement("div");

    row.className = "multitrack-row";

    if (isArmed) {
      row.classList.add("armed");
    }

    row.innerHTML = `
      <div class="multitrack-main">
        <span
          class="multitrack-color"
          style="background:${track.color}">
        </span>

        <div class="multitrack-details">
          <strong>${track.name}</strong>

          <span class="multitrack-track-status">
            ${track.buffer ? formatLoopTime(track.duration) : "EMPTY"}
          </span>
        </div>

        <button
          class="track-arm ${isArmed ? "selected" : ""}"
          data-action="arm"
          data-id="${track.id}">
          ${isArmed ? "ARMED" : "ARM"}
        </button>
      </div>

      <div class="multitrack-actions">
        <button
          class="track-toggle ${track.muted ? "selected" : ""}"
          data-action="mute"
          data-id="${track.id}">
          M
        </button>

        <button
          class="track-toggle ${track.solo ? "selected" : ""}"
          data-action="solo"
          data-id="${track.id}">
          S
        </button>

        <input
          class="track-volume"
          type="range"
          min="0"
          max="100"
          value="${track.volume}"
          data-action="volume"
          data-id="${track.id}"
          aria-label="${track.name} volume">

        <button
          class="track-delete"
          data-action="clear"
          data-id="${track.id}"
          ${track.buffer ? "" : "disabled"}>
          ×
        </button>
      </div>
    `;

    multitrackList.appendChild(row);
  });

  armedTrackName.textContent = loopTracks[armedTrack].name;

  const used = loopTracks.filter(track => track.buffer).length;

  tracksUsed.textContent = `${used} / 4`;

  loopClearBtn.disabled = !loopTracks[armedTrack].buffer;
  loopPlayBtn.disabled = used === 0;

  updateSyncDisplay();
  renderTimeline();
  renderMixer();
}

// ------------------------------------------
// TRACK MIXING
// ------------------------------------------

function updateTrackMix() {
  if (!audioContext) return;

  const hasSolo = loopTracks.some(track => track.solo);

  loopTracks.forEach(track => {
        if (track.panNode && !trackHasPanAutomation(track)) {
      track.panNode.pan.setTargetAtTime(
        track.pan / 100,
        audioContext.currentTime,
        0.025
      );
    }

    if (!track.gainNode) return;

    const audible =
      !track.muted &&
      (!hasSolo || track.solo);

    const volume = audible
      ? track.volume / 100
      : 0;

    track.gainNode.gain.setTargetAtTime(
      volume,
      audioContext.currentTime,
      0.025
    );
  });

  if (masterMixGain) {
    masterMixGain.gain.setTargetAtTime(
      masterVolume / 100,
      audioContext.currentTime,
      0.025
    );
  }
}

// ------------------------------------------
// TRACK CONTROLS
// ------------------------------------------

multitrackList.addEventListener("click", event => {
  const button = event.target.closest("button");

  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);

  const track = loopTracks[id];

  if (!track) return;

  if (action === "arm") {
    if (activeRecorder || isCountingIn) {
      showToast("Wait until recording starts or stops");
      return;
    }

    armedTrack = id;

    renderTracks();

    showToast(track.name + " armed");
  }

  if (action === "mute") {
    track.muted = !track.muted;

    updateTrackMix();
    renderTracks();
  }

  if (action === "solo") {
    track.solo = !track.solo;

    updateTrackMix();
    renderTracks();
  }

  if (action === "clear") {
    clearTrack(id);
  }
});

multitrackList.addEventListener("input", event => {
  if (event.target.dataset.action !== "volume") return;

  const id = Number(event.target.dataset.id);

  loopTracks[id].volume = Number(event.target.value);

  updateTrackMix();

  if (typeof syncMixerControls === "function") {
    syncMixerControls();
  }
});

// ------------------------------------------
// START ALL TRACKS TOGETHER
// ------------------------------------------

function startAllTracks(startTime, offset = 0) {
  if (!audioContext) return;

  stopAllTracks();

  masterMixGain = audioContext.createGain();
  masterMixGain.gain.value = (masterVolume / 100) * 5.0; // Boosted 5x for normal web playback volume
  masterMixGain.connect(audioContext.destination);

  loopTracks.forEach(track => {
    if (!track.buffer) return;

    const source = audioContext.createBufferSource();
    const panner = audioContext.createStereoPanner();
    const gain = audioContext.createGain();

    source.buffer = track.buffer;
    source.loop = true;

    panner.pan.value = track.pan / 100;

    source.connect(panner);
    panner.connect(gain);
    gain.connect(masterMixGain);

    track.source = source;
    track.panNode = panner;
    track.gainNode = gain;

    source.start(startTime, offset);
  });

  isPlaying = true;
  playbackPaused = false;
  pausedPlaybackOffset = 0;

  timelineStartTime = startTime - offset;
  startTimelinePlayhead();

  updateTrackMix();

  loopStatus.textContent = "Playing all tracks";

  loopPlayBtn.textContent = "PAUSE ALL";
  loopStopPlaybackBtn.disabled = false;

  updateMixerPlaybackButton();
}

// ------------------------------------------
// STOP ALL TRACKS
// ------------------------------------------

function stopAllTracks() {
  loopTracks.forEach(track => {
    if (track.source) {
      try {
        track.source.stop();
      } catch (error) {}

      track.source.disconnect();
      track.source = null;
    }

    if (track.gainNode) {
      track.gainNode.disconnect();
      track.gainNode = null;
    }

    if (track.panNode) {
      track.panNode.disconnect();
      track.panNode = null;
    }
  });

  if (masterMixGain) {
    masterMixGain.disconnect();
    masterMixGain = null;
  }

  isPlaying = false;
  playbackPaused = false;
  pausedPlaybackOffset = 0;

  stopTimelinePlayhead();

  loopPlayBtn.textContent = "PLAY ALL";
  loopStopPlaybackBtn.disabled = true;

  updateMixerPlaybackButton();
}

// ------------------------------------------
// TRIM RECORDING TO EXACT LOOP LENGTH
// ------------------------------------------

function trimAudioBuffer(sourceBuffer, targetDuration) {
  const sampleRate = sourceBuffer.sampleRate;

  const targetSamples = Math.round(
    targetDuration * sampleRate
  );

  const channels = sourceBuffer.numberOfChannels;

  const outputBuffer = audioContext.createBuffer(
    channels,
    targetSamples,
    sampleRate
  );

  for (let channel = 0; channel < channels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const outputData = outputBuffer.getChannelData(channel);

    const copyLength = Math.min(
      sourceData.length,
      targetSamples
    );

    outputData.set(
      sourceData.subarray(0, copyLength)
    );
  }

  return outputBuffer;
}

// ------------------------------------------
// START LOOP RECORDING
// ------------------------------------------

async function startLoopRecording() {
  if (!audioContext || !audioSource) {
    showToast("Connect an input or start the test signal first");
    return;
  }

  if (activeRecorder || isCountingIn) {
    showToast("Recording is already in progress");
    return;
  }

  await audioContext.resume();

  if (countInEnabled) {
    await beginCountIn();
  } else {
    const targetDuration = loopLength > 0
  ? loopLength
  : null;

   beginLoopRecording(targetDuration);
  }
}

async function beginLoopRecording(targetDuration) {
  if (!audioContext || !audioSource) return;

  const track = loopTracks[armedTrack];
  const isFirstTake = loopLength === 0;

  try {
    await audioContext.resume();

    // First take establishes the loop length manually.
    // Overdubs use the existing loop length.

    const destination =
      audioContext.createMediaStreamDestination();

    recordingSource = effectInput || audioSource;
    recordingSource.connect(destination);

    activeDestination = destination;
    recordingTrack = track;

    const recorder = new MediaRecorder(destination.stream);
    activeRecorder = recorder;

    const chunks = [];

    recorder.ondataavailable = event => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm"
        });

        const arrayBuffer = await blob.arrayBuffer();

        const decodedBuffer =
          await audioContext.decodeAudioData(arrayBuffer);

        // First take: keep the complete recording.
        // Overdubs: trim to the established loop length.

        const finalBuffer = isFirstTake
          ? decodedBuffer
          : trimAudioBuffer(decodedBuffer, targetDuration);

        track.buffer = finalBuffer;
track.duration = finalBuffer.duration;

if (isFirstTake) {
  loopLength = finalBuffer.duration;
}

// Every new recording starts as one timeline clip.

track.clips = [
  createTimelineClip(
    finalBuffer,
    0,
    finalBuffer.duration,
    0
  )
];

        loopDuration.textContent =
          formatLoopTime(loopLength);

        recordTime.textContent =
          formatLoopTime(finalBuffer.duration);

        loopStatus.textContent =
          track.name + " saved successfully";

        countInDisplay.className =
          "count-in-display recording-state";

        countInDisplay.textContent = "LOOP LAYER SAVED";

        showToast(track.name + " recording saved");

      } catch (error) {
        console.error("Track decoding error:", error);

        loopStatus.textContent =
          "Unable to process recording";

        showToast("Recording could not be processed");

        if (isFirstTake && !loopTracks.some(item => item.buffer)) {
          loopLength = 0;
          loopDuration.textContent = "Not set";
        }
      }

      if (activeDestination) {
        try {
          recordingSource.disconnect(activeDestination);
        } catch (error) {}

        activeDestination.stream
          .getTracks()
          .forEach(track => track.stop());
      }

      activeDestination = null;
      activeRecorder = null;
      recordingSource = null;
      recordingTrack = null;

      clearInterval(recordingTimer);
      recordingTimer = null;

      clearTimeout(autoStopTimer);
      autoStopTimer = null;

      loopRecordBtn.disabled = false;
      loopRecordBtn.textContent = "RECORD LAYER";
      loopRecordBtn.classList.remove("recording");

      loopStopBtn.disabled = true;

      loopTimerLabel.textContent = "RECORDING TIME";

      renderTracks();
    };

    recorder.start(100);

    recordingStartedAt = Date.now();

    loopRecordBtn.disabled = true;
    loopRecordBtn.textContent = "RECORDING";
    loopRecordBtn.classList.add("recording");

    loopStopBtn.disabled = false;

    loopStatus.textContent = "Recording " + track.name;

    countInDisplay.className =
      "count-in-display recording-state";

    countInDisplay.textContent = "RECORDING";

    loopTimerLabel.textContent = "RECORDING TIME";

    updateSyncDisplay();

    recordingTimer = setInterval(() => {
      const elapsed =
        (Date.now() - recordingStartedAt) / 1000;

      recordTime.textContent =
        formatLoopTime(elapsed);
    }, 100);

    // Only overdubs have an automatic stop.
    // The first recording ends when STOP is pressed.

    if (!isFirstTake && targetDuration > 0) {
      autoStopTimer = setTimeout(() => {
        stopLoopRecording();
      }, targetDuration * 1000);
    }

  } catch (error) {
    console.error("Multitrack recording error:", error);

    showToast("Unable to start recording");

    activeRecorder = null;

    if (activeDestination) {
      activeDestination.stream
        .getTracks()
        .forEach(track => track.stop());

      activeDestination = null;
    }

    loopRecordBtn.disabled = false;
    loopStopBtn.disabled = true;

    updateSyncDisplay();
  }
}

// ------------------------------------------
// STOP CURRENT RECORDING
// ------------------------------------------

function stopLoopRecording() {
  if (isCountingIn) {
    cancelCountIn();
    return;
  }

  if (!activeRecorder) return;

  if (activeRecorder.state === "recording") {
    activeRecorder.stop();
  }

  clearTimeout(autoStopTimer);
  autoStopTimer = null;

  clearInterval(recordingTimer);
  recordingTimer = null;

  loopStopBtn.disabled = true;

  loopStatus.textContent = "Processing recording...";
}

// ------------------------------------------
// PLAY ALL TRACKS
// ------------------------------------------

async function playLoopRecording() {
  if (!audioContext) {
    showToast("Start an audio input first");
    return;
  }

  if (isCountingIn || activeRecorder) {
    showToast("Stop recording first");
    return;
  }

  const hasTracks = loopTracks.some(track => track.buffer);

  if (!hasTracks) return;

  await audioContext.resume();

  startAllTracks(audioContext.currentTime + 0.05);

  showToast("All tracks playing together");
}

// ------------------------------------------
// CLEAR INDIVIDUAL TRACK
// ------------------------------------------

function clearTrack(id) {
  if (activeRecorder || isCountingIn) {
    showToast("Stop recording before clearing tracks");
    return;
  }

  const track = loopTracks[id];

  if (!track) return;

  if (track.source) {
    try {
      track.source.stop();
    } catch (error) {}

    track.source.disconnect();
    track.source = null;
  }

  if (track.gainNode) {
    track.gainNode.disconnect();
    track.gainNode = null;
  }

  if (track.panNode) {
    track.panNode.disconnect();
    track.panNode = null;
  }

  track.buffer = null;
track.duration = 0;
track.clips = [];

if (selectedTimelineTrackId === id) {
  selectedTimelineTrackId = null;
  selectedTimelineClipId = null;
}

clipUndoStack = [];
updateClipEditorControls();

  track.muted = false;
  track.solo = false;
  track.volume = 80;
  track.pan = 0;

  const remainingTrack = loopTracks.find(item =>
    item.id !== id && item.buffer
  );

  if (remainingTrack) {
    loopLength = remainingTrack.duration;
  } else {
    loopLength = 0;

    stopAllTracks();

    loopDuration.textContent = "Not set";

    countInDisplay.className = "count-in-display";
    countInDisplay.textContent = "READY WHEN YOU ARE";
  }

  loopStatus.textContent = track.name + " cleared";

  renderTracks();

  showToast(track.name + " cleared");
}

// ------------------------------------------
// CLEAR ARMED TRACK
// ------------------------------------------

function clearArmedTrack() {
  clearTrack(armedTrack);
}

// ------------------------------------------
// BUTTON EVENTS
// ------------------------------------------

loopRecordBtn.addEventListener(
  "click",
  startLoopRecording
);

loopStopBtn.addEventListener(
  "click",
  stopLoopRecording
);

loopPlayBtn.addEventListener(
  "click",
  playLoopRecording
);

loopStopPlaybackBtn.addEventListener("click", () => {
  stopAllTracks();

  loopStatus.textContent = "Playback stopped";

  showToast("All tracks stopped");
});

loopClearBtn.addEventListener(
  "click",
  clearArmedTrack
);


// ==========================================
// AUDIONIX - STAGE 7
// DAW TIMELINE & WAVEFORM VISUALISATION
// ==========================================

const timelineContent =
  document.getElementById("timelineContent");

const timelineRuler =
  document.getElementById("timelineRuler");

const timelineTrackArea =
  document.getElementById("timelineTrackArea");

const timelineLength =
  document.getElementById("timelineLength");

const timelineStatus =
  document.getElementById("timelineStatus");

  // STAGE 11 - TIMELINE EDITOR

let selectedTimelineTrackId = null;

const selectedClipName =
  document.getElementById("selectedClipName");

const trimStartInput =
  document.getElementById("trimStart");

const trimEndInput =
  document.getElementById("trimEnd");

const applyTrimBtn =
  document.getElementById("applyTrimBtn");

  const splitTimeInput =
  document.getElementById("splitTime");

const usePlayheadBtn =
  document.getElementById("usePlayheadBtn");

const splitClipBtn =
  document.getElementById("splitClipBtn");

const deleteClipBtn =
  document.getElementById("deleteClipBtn");

const undoClipBtn =
  document.getElementById("undoClipBtn");

let timelineStartTime = 0;
let timelineAnimation = null;

const timelineLabelWidth = 150;
const timelinePixelsPerSecond = 80;


// ------------------------------------------
// DRAW TRACK WAVEFORM
// ------------------------------------------

function drawTrackWaveform(canvas, track, width) {

  const height = 76;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  context.clearRect(0, 0, width, height);

  if (!track.buffer) return;

  const audioData = track.buffer.getChannelData(0);

  const middle = height / 2;
  const samplesPerPixel = audioData.length / width;

  context.beginPath();

  context.strokeStyle = track.color;
  context.lineWidth = 1;

  for (let x = 0; x < width; x++) {

    const start = Math.floor(x * samplesPerPixel);

    const end = Math.min(
      audioData.length,
      Math.floor((x + 1) * samplesPerPixel)
    );

    let minimum = 1;
    let maximum = -1;

    for (let i = start; i < end; i++) {

      const sample = audioData[i];

      if (sample < minimum) minimum = sample;
      if (sample > maximum) maximum = sample;

    }

    const top = middle - maximum * middle * 0.85;
    const bottom = middle - minimum * middle * 0.85;

    context.moveTo(x, top);
    context.lineTo(x, bottom);

  }

  context.stroke();

}

// ------------------------------------------
// DRAW INDIVIDUAL CLIP WAVEFORM
// ------------------------------------------

function drawClipWaveform(canvas, clip, track) {

  const width = canvas.width;
  const height = canvas.height;

  const context = canvas.getContext("2d");

  context.clearRect(0, 0, width, height);

  const audioData =
    clip.buffer.getChannelData(0);

  const sampleRate = clip.buffer.sampleRate;

  const startFrame = Math.floor(
    clip.sourceStart * sampleRate
  );

  const endFrame = Math.min(
    audioData.length,
    Math.floor(
      (clip.sourceStart + clip.duration) * sampleRate
    )
  );

  const totalFrames = endFrame - startFrame;

  if (totalFrames <= 0) return;

  const middle = height / 2;

  const samplesPerPixel = totalFrames / width;

  context.beginPath();

  context.strokeStyle = track.color;
  context.lineWidth = 1;

  for (let x = 0; x < width; x++) {

    const start =
      startFrame + Math.floor(x * samplesPerPixel);

    const end = Math.min(
      endFrame,
      startFrame + Math.floor((x + 1) * samplesPerPixel)
    );

    let minimum = 1;
    let maximum = -1;

    for (let i = start; i < end; i++) {

      const sample = audioData[i];

      if (sample < minimum) minimum = sample;
      if (sample > maximum) maximum = sample;

    }

    const top = middle - maximum * middle * 0.85;
    const bottom = middle - minimum * middle * 0.85;

    context.moveTo(x, top);
    context.lineTo(x, bottom);

  }

  context.stroke();

}

// ------------------------------------------
// RENDER TIMELINE RULER
// ------------------------------------------

function renderTimelineRuler(width, duration) {

  timelineRuler.innerHTML = "";

  const label = document.createElement("div");

  label.className = "timeline-ruler-label";
  label.textContent = "TRACK / TIME";

  const rulerContent = document.createElement("div");

  rulerContent.className = "timeline-ruler-content";
  rulerContent.style.width = width + "px";

  // BAR MARKERS

  if (duration > 0) {

    const barDuration = getBarDuration();

    const totalBars = Math.ceil(duration / barDuration);

    for (let bar = 0; bar <= totalBars; bar++) {

      const position = bar * barDuration;

      if (position > duration) break;

      const tick = document.createElement("div");

      tick.className = "timeline-tick";

      tick.style.left =
        position * timelinePixelsPerSecond + "px";

      tick.innerHTML = `
        BAR ${bar + 1}
      `;

      rulerContent.appendChild(tick);

    }

    // SECOND MARKERS

    const totalSeconds = Math.floor(duration);

    for (let second = 5; second <= totalSeconds; second += 5) {

      const tick = document.createElement("div");

      tick.className = "timeline-tick";

      tick.style.left =
        second * timelinePixelsPerSecond + "px";

      tick.style.borderLeftStyle = "dashed";

      tick.style.opacity = "0.65";

      tick.innerHTML = `
        ${formatLoopTime(second)}
      `;

      rulerContent.appendChild(tick);

    }

  } else {

    const placeholder = document.createElement("div");

    placeholder.className = "timeline-tick";
    placeholder.textContent = "WAITING FOR FIRST RECORDING";

    rulerContent.appendChild(placeholder);

  }

  timelineRuler.appendChild(label);
  timelineRuler.appendChild(rulerContent);

}


// ------------------------------------------
// RENDER ALL TIMELINE TRACKS
// ------------------------------------------

function renderTimeline() {

  if (!timelineContent || !timelineTrackArea) return;

  const duration = loopLength;

  const timelineWidth = Math.max(
    900,
    Math.ceil(duration * timelinePixelsPerSecond)
  );

  timelineContent.style.width =
    (timelineLabelWidth + timelineWidth) + "px";

  timelineTrackArea.innerHTML = "";

  timelineTrackArea.style.width =
    (timelineLabelWidth + timelineWidth) + "px";

  renderTimelineRuler(timelineWidth, duration);

  loopTracks.forEach(track => {

    ensureTrackClips(track);

    const lane = document.createElement("div");

    lane.className = "timeline-track-lane";
    lane.dataset.trackId = track.id;

    if (track.id === selectedTimelineTrackId) {
      lane.classList.add("selected");
    }

    if (isPlaying && track.buffer) {
      lane.classList.add("playing");
    }

    const label = document.createElement("div");

    label.className = "timeline-track-label";

    const dot = document.createElement("span");

    dot.className = "timeline-track-dot";
    dot.style.background = track.color;

    const name = document.createElement("span");

    name.textContent = track.name;

    label.appendChild(dot);
    label.appendChild(name);

    lane.appendChild(label);

    if (track.clips.length > 0) {

      const clipContainer = document.createElement("div");

      clipContainer.className = "timeline-clip-container";

      clipContainer.style.position = "relative";
      clipContainer.style.width = timelineWidth + "px";
      clipContainer.style.height = "76px";
      clipContainer.style.flex = "0 0 auto";

      track.clips.forEach((clip, clipIndex) => {

        const clipElement = document.createElement("div");

        clipElement.className = "timeline-clip";

        clipElement.dataset.clipId = clip.id;
        clipElement.dataset.trackId = track.id;

        const clipWidth = Math.max(
          10,
          clip.duration * timelinePixelsPerSecond
        );

        clipElement.style.position = "absolute";
        clipElement.style.left =
          clip.start * timelinePixelsPerSecond + "px";

        clipElement.style.top = "7px";
        clipElement.style.width = clipWidth + "px";
        clipElement.style.height = "60px";

        clipElement.style.boxSizing = "border-box";
        clipElement.style.overflow = "hidden";
        clipElement.style.borderRadius = "5px";
        clipElement.style.border =
          "1px solid " + track.color;

        clipElement.style.background =
          track.color + "22";

        clipElement.style.cursor = "grab";
        clipElement.style.touchAction = "none";

        if (clip.id === selectedTimelineClipId) {
          clipElement.classList.add("selected");
          clipElement.style.outline =
            "2px solid #ffffff";
        }

        const canvas = document.createElement("canvas");

        canvas.className = "timeline-waveform";

        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.pointerEvents = "none";

        canvas.width = Math.max(1, Math.floor(clipWidth));
        canvas.height = 60;

        drawClipWaveform(canvas, clip, track);

        clipElement.appendChild(canvas);

        const clipLabel = document.createElement("span");

        clipLabel.textContent =
          track.name + " · " + (clipIndex + 1);

        clipLabel.style.position = "absolute";
        clipLabel.style.left = "7px";
        clipLabel.style.top = "4px";
        clipLabel.style.fontSize = "10px";
        clipLabel.style.fontWeight = "600";
        clipLabel.style.color = "#ffffff";
        clipLabel.style.pointerEvents = "none";
        clipLabel.style.textShadow =
          "0 1px 3px #000000";

        clipElement.appendChild(clipLabel);

        // SELECT AND START DRAGGING

        clipElement.addEventListener(
          "pointerdown",
          event => {

            if (
              event.button !== 0 ||
              isPlaying ||
              activeRecorder ||
              isCountingIn
            ) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            selectTimelineClip(track.id, clip.id, false);

timelineTrackArea
  .querySelectorAll(".timeline-clip.selected")
  .forEach(element => {
    element.classList.remove("selected");
    element.style.outline = "none";
  });

clipElement.classList.add("selected");
clipElement.style.outline = "2px solid #ffffff";

            timelineDragState = {

              trackId: track.id,
              clipId: clip.id,

              startX: event.clientX,

              originalStart: clip.start,

              pendingStart: clip.start,

              snapshot: captureClipUndoState(),

              moved: false

            };

            clipElement.style.cursor = "grabbing";

            clipElement.setPointerCapture(event.pointerId);

          }
        );


        // DRAG MOVEMENT

        clipElement.addEventListener(
          "pointermove",
          event => {

            if (
              !timelineDragState ||
              timelineDragState.clipId !== clip.id
            ) {
              return;
            }

            const deltaX =
              event.clientX - timelineDragState.startX;

            if (Math.abs(deltaX) > 3) {
              timelineDragState.moved = true;
            }

            if (!timelineDragState.moved) return;

            const deltaSeconds =
              deltaX / timelinePixelsPerSecond;

            const maximumStart = Math.max(
              0,
              loopLength - clip.duration
            );

            const newStart = Math.max(
              0,
              Math.min(
                maximumStart,
                timelineDragState.originalStart +
                  deltaSeconds
              )
            );

            timelineDragState.pendingStart = newStart;

            clipElement.style.left =
              newStart * timelinePixelsPerSecond + "px";

          }
        );


        // FINISH DRAG

        clipElement.addEventListener(
          "pointerup",
          event => {

            if (
              !timelineDragState ||
              timelineDragState.clipId !== clip.id
            ) {
              return;
            }

            const drag = timelineDragState;

            timelineDragState = null;

            if (
              drag.moved &&
              Math.abs(
                drag.pendingStart - drag.originalStart
              ) > 0.001
            ) {

              pushClipUndoState(drag.snapshot);

              clip.start = drag.pendingStart;

              rebuildTrackArrangement(track);

              renderTracks();

              showToast("Clip moved successfully");

            } else {

              clipElement.style.cursor = "grab";

            }

          }
        );


        clipElement.addEventListener(
          "pointercancel",
          () => {

            timelineDragState = null;

            renderTimeline();

          }
        );

        clipContainer.appendChild(clipElement);

      });

      lane.appendChild(clipContainer);

    } else {

      const empty = document.createElement("div");

      empty.className =
        "timeline-waveform timeline-empty-label";

      empty.style.width = timelineWidth + "px";

      empty.style.display = "flex";
      empty.style.alignItems = "center";
      empty.style.paddingLeft = "18px";

      empty.textContent = "EMPTY TRACK";

      lane.appendChild(empty);

    }

    timelineTrackArea.appendChild(lane);

  });

  // PLAYHEAD

  const playhead = document.createElement("div");

  playhead.className = "timeline-playhead";
  playhead.id = "timelinePlayhead";

  playhead.style.left = timelineLabelWidth + "px";

  timelineTrackArea.appendChild(playhead);

  timelineLength.textContent = duration > 0
    ? formatLoopTime(duration)
    : "NOT SET";

  timelineStatus.textContent =
    loopTracks.some(track => track.buffer)
      ? (isPlaying ? "PLAYING" : "TRACKS READY")
      : "READY";

    renderAutomationOverlays();

  updateTimelinePlayhead();

  updateClipEditorControls();

}

// ------------------------------------------
// UPDATE PLAYHEAD POSITION
// ------------------------------------------

function updateTimelinePlayhead() {

  const playhead =
    document.getElementById("timelinePlayhead");

  if (!playhead || !audioContext || loopLength <= 0) return;

  let elapsed = audioContext.currentTime - timelineStartTime;

  elapsed = ((elapsed % loopLength) + loopLength) % loopLength;

  const position =
    elapsed / loopLength * 100;

  playhead.style.left =
    (timelineLabelWidth +
      (position / 100) *
      loopLength *
      timelinePixelsPerSecond) + "px";

}


// ------------------------------------------
// ANIMATE PLAYHEAD
// ------------------------------------------

function startTimelinePlayhead() {

  stopTimelinePlayhead();

  timelineStatus.textContent = "PLAYING";

  function animate() {

    if (!isPlaying || !audioContext) {
      stopTimelinePlayhead();
      return;
    }

    updateTimelinePlayhead();

    timelineAnimation =
      requestAnimationFrame(animate);

  }

  animate();

}


// ------------------------------------------
// STOP PLAYHEAD ANIMATION
// ------------------------------------------

function stopTimelinePlayhead() {

  if (timelineAnimation !== null) {

    cancelAnimationFrame(timelineAnimation);

    timelineAnimation = null;

  }

  if (timelineStatus) {

    timelineStatus.textContent =
      loopTracks.some(track => track.buffer)
        ? "TRACKS READY"
        : "READY";

  }

  updateTimelinePlayhead();

}


// ------------------------------------------
// INITIALISE TIMELINE
// ------------------------------------------

renderTimeline();



// ==========================================
// AUDIONIX - STAGE 8
// PROFESSIONAL MIXER CONSOLE
// ==========================================

const mixerChannels = document.getElementById("mixerChannels");
const mixerTrackCount = document.getElementById("mixerTrackCount");
const masterVolumeSlider = document.getElementById("masterVolume");
const masterVolumeValue = document.getElementById("masterVolumeValue");

function syncMixerControls() {
  loopTracks.forEach(track => {
    const volumeSlider = mixerChannels.querySelector(
      `[data-mixer-action="volume"][data-id="${track.id}"]`
    );
    const volumeValue = document.getElementById(
      `mixerVolumeValue${track.id}`
    );
    const panSlider = mixerChannels.querySelector(
      `[data-mixer-action="pan"][data-id="${track.id}"]`
    );
    const panValue = document.getElementById(
      `mixerPanValue${track.id}`
    );

    if (volumeSlider) volumeSlider.value = track.volume;
    if (volumeValue) volumeValue.textContent = `${track.volume}%`;

    if (panSlider) panSlider.value = track.pan;
    if (panValue) {
      panValue.textContent = track.pan === 0
        ? "CENTER"
        : track.pan < 0
          ? `${Math.abs(track.pan)}% L`
          : `${track.pan}% R`;
    }
  });
}

function renderMixer() {
  if (!mixerChannels) return;

  mixerChannels.innerHTML = "";

  const activeCount = loopTracks.filter(track => track.buffer).length;
  mixerTrackCount.textContent = `${activeCount} / 4 ACTIVE`;

  loopTracks.forEach(track => {
    const channel = document.createElement("div");
    channel.className = "mixer-channel";
    if (track.muted) channel.classList.add("is-muted");
    if (track.solo) channel.classList.add("is-solo");

    const panLabel = track.pan === 0
      ? "CENTER"
      : track.pan < 0
        ? `${Math.abs(track.pan)}% L`
        : `${track.pan}% R`;

    channel.innerHTML = `
      <div class="mixer-channel-head">
        <span class="mixer-channel-color" style="background:${track.color}"></span>
        <div class="mixer-channel-name">
          <strong>${track.name}</strong>
          <small>${track.buffer ? "AUDIO READY" : "EMPTY CHANNEL"}</small>
        </div>
      </div>

      <div class="mixer-channel-status">
        <span class="mixer-status-light"></span>
        <span>${track.muted ? "MUTED" : track.solo ? "SOLO" : track.buffer ? "ACTIVE" : "STANDBY"}</span>
      </div>

      <div class="mixer-pan-control">
        <div class="mixer-control-label">
          <label for="mixerPan${track.id}">PAN</label>
          <span id="mixerPanValue${track.id}">${panLabel}</span>
        </div>
        <input
          type="range"
          id="mixerPan${track.id}"
          class="mixer-range pan-range"
          min="-100"
          max="100"
          step="1"
          value="${track.pan}"
          data-mixer-action="pan"
          data-id="${track.id}"
          aria-label="${track.name} stereo pan">
        <div class="pan-scale"><span>L</span><span>C</span><span>R</span></div>
      </div>

      <div class="mixer-fader-area">
        <div class="mixer-fader-value" id="mixerVolumeValue${track.id}">${track.volume}%</div>
        <input
          type="range"
          class="mixer-range vertical-fader"
          min="0"
          max="100"
          step="1"
          value="${track.volume}"
          data-mixer-action="volume"
          data-id="${track.id}"
          aria-label="${track.name} channel volume">
        <div class="mixer-fader-scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
      </div>

      <div class="mixer-channel-buttons">
        <button class="mixer-toggle ${track.muted ? "active-mute" : ""}"
          data-mixer-action="mute" data-id="${track.id}" aria-pressed="${track.muted}">M</button>
        <button class="mixer-toggle ${track.solo ? "active-solo" : ""}"
          data-mixer-action="solo" data-id="${track.id}" aria-pressed="${track.solo}">S</button>
      </div>

      <div class="mixer-channel-bottom">${track.buffer ? "TRACK LOADED" : "NO RECORDING"}</div>
    `;

    mixerChannels.appendChild(channel);
  });

  if (masterVolumeSlider) masterVolumeSlider.value = masterVolume;
  if (masterVolumeValue) masterVolumeValue.textContent = `${masterVolume}%`;
}

mixerChannels.addEventListener("click", event => {
  const button = event.target.closest("button[data-mixer-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const track = loopTracks[id];
  if (!track) return;

  const action = button.dataset.mixerAction;

  if (action === "mute") {
    track.muted = !track.muted;
  } else if (action === "solo") {
    track.solo = !track.solo;
  }

  updateTrackMix();
  renderTracks();
});

mixerChannels.addEventListener("input", event => {
  const control = event.target;
  const action = control.dataset.mixerAction;
  if (!action) return;

  const id = Number(control.dataset.id);
  const track = loopTracks[id];
  if (!track) return;

  if (action === "volume") {
    track.volume = Number(control.value);
    const value = document.getElementById(`mixerVolumeValue${id}`);
    if (value) value.textContent = `${track.volume}%`;
  }

  if (action === "pan") {
    track.pan = Number(control.value);
    const label = track.pan === 0
      ? "CENTER"
      : track.pan < 0
        ? `${Math.abs(track.pan)}% L`
        : `${track.pan}% R`;

    const value = document.getElementById(`mixerPanValue${id}`);
    if (value) value.textContent = label;
  }

  updateTrackMix();

  const loopVolumeSlider = multitrackList.querySelector(
    `.track-volume[data-id="${id}"]`
  );
  if (loopVolumeSlider && action === "volume") {
    loopVolumeSlider.value = track.volume;
  }
});

masterVolumeSlider.addEventListener("input", () => {
  masterVolume = Number(masterVolumeSlider.value);
  masterVolumeValue.textContent = `${masterVolume}%`;
  updateTrackMix();
});

// Draw the initial four-channel console.
renderMixer();

// ------------------------------------------
// INITIALISE
// ------------------------------------------

renderTracks();

recordTime.textContent = "00:00";
loopDuration.textContent = "Not set";

updateProjectTempo();
updateSyncDisplay();


// ==========================================
// MIXER PLAY / PAUSE CONTROL
// ==========================================

const mixerPlaybackBtn =
  document.getElementById("mixerPlaybackBtn");

function updateMixerPlaybackButton() {
  if (!mixerPlaybackBtn) return;

  if (isPlaying) {
    mixerPlaybackBtn.textContent = "Ⅱ PAUSE";
    mixerPlaybackBtn.disabled = false;
  } else if (playbackPaused) {
    mixerPlaybackBtn.textContent = "▶ RESUME";
    mixerPlaybackBtn.disabled = false;
  } else {
    mixerPlaybackBtn.textContent = "▶ PLAY";
    mixerPlaybackBtn.disabled =
      !loopTracks.some(track => track.buffer);
  }
}

function pauseAllTracks() {
  if (!isPlaying || !audioContext || loopLength <= 0) return;

  let elapsed = audioContext.currentTime - timelineStartTime;

  pausedPlaybackOffset =
    ((elapsed % loopLength) + loopLength) % loopLength;

  timelineStartTime =
    audioContext.currentTime - pausedPlaybackOffset;

  stopAllTracks();

  playbackPaused = true;

  loopStatus.textContent = "Playback paused";
  loopPlayBtn.textContent = "RESUME ALL";
  loopStopPlaybackBtn.disabled = false;

  updateMixerPlaybackButton();
}

mixerPlaybackBtn.addEventListener("click", async () => {
  if (isPlaying) {
    pauseAllTracks();
    showToast("Playback paused");
    return;
  }

  await playLoopRecording();
});

updateMixerPlaybackButton();

// ==========================================
// AUDIONIX - STAGE 9
// AUDIO EXPORT & MIXDOWN
// ==========================================

const mixerExportBtn = document.getElementById("mixerExportBtn");


// ------------------------------------------
// CONVERT AUDIO BUFFER TO WAV
// ------------------------------------------

function audioBufferToWav(audioBuffer) {

  const numberOfChannels = 2;
  const sampleRate = audioBuffer.sampleRate;
  const numberOfFrames = audioBuffer.length;

  const bytesPerSample = 2;
  const dataSize = numberOfFrames * numberOfChannels * bytesPerSample;

  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // WAV HEADER

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);

  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);

  let offset = 44;

  // INTERLEAVE STEREO AUDIO

  for (let i = 0; i < numberOfFrames; i++) {

    let left = Math.max(-1, Math.min(1, leftChannel[i]));
    let right = Math.max(-1, Math.min(1, rightChannel[i]));

    view.setInt16(
      offset,
      left < 0 ? left * 32768 : left * 32767,
      true
    );

    offset += 2;

    view.setInt16(
      offset,
      right < 0 ? right * 32768 : right * 32767,
      true
    );

    offset += 2;
  }

  return new Blob([wavBuffer], {
    type: "audio/wav"
  });
}

// ------------------------------------------
// MP3 ENCODER
// ------------------------------------------

function audioBufferToMp3(audioBuffer, bitrate) {

  if (!window.lamejs) {
    throw new Error("MP3 encoder is unavailable");
  }

  const encoder = new window.lamejs.Mp3Encoder(
    2,
    audioBuffer.sampleRate,
    bitrate
  );

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  function convertToInt16(channel) {

    const output = new Int16Array(channel.length);

    for (let i = 0; i < channel.length; i++) {

      const sample = Math.max(-1, Math.min(1, channel[i]));

      output[i] = sample < 0
        ? sample * 32768
        : sample * 32767;

    }

    return output;
  }

  const leftSamples = convertToInt16(left);
  const rightSamples = convertToInt16(right);

  const mp3Data = [];
  const chunkSize = 1152;

  for (let i = 0; i < leftSamples.length; i += chunkSize) {

    const leftChunk = leftSamples.subarray(
      i,
      i + chunkSize
    );

    const rightChunk = rightSamples.subarray(
      i,
      i + chunkSize
    );

    const encoded = encoder.encodeBuffer(
      leftChunk,
      rightChunk
    );

    if (encoded.length > 0) {
      mp3Data.push(new Uint8Array(encoded));
    }

  }

  const finalChunk = encoder.flush();

  if (finalChunk.length > 0) {
    mp3Data.push(new Uint8Array(finalChunk));
  }

  return new Blob(mp3Data, {
    type: "audio/mpeg"
  });

}

// ------------------------------------------
// EXPORT MIX
// ------------------------------------------

async function exportMixerAudio() {

  if (activeRecorder || isCountingIn) {
    showToast("Stop recording before exporting");
    return;
  }

  const activeTracks = loopTracks.filter(track => track.buffer);

  if (activeTracks.length === 0) {
    showToast("Record at least one track before exporting");
    return;
  }

  const OfflineContext =
    window.OfflineAudioContext ||
    window.webkitOfflineAudioContext;

  if (!OfflineContext) {
    showToast("WAV export is not supported in this browser");
    return;
  }

  mixerExportBtn.disabled = true;
  mixerExportBtn.textContent = "RENDERING MIX...";

  try {

    // USE THE PROJECT LOOP LENGTH

    const exportDuration = loopLength > 0
      ? loopLength
      : Math.max(...activeTracks.map(track => track.duration));

    // QUALITY-BASED EXPORT SAMPLE RATE

const sampleRates = {
  high: 48000,
  medium: 44100,
  low: 22050
};

const sampleRate =
  sampleRates[settingsRecordingQuality.value];

    const frameCount = Math.ceil(
      exportDuration * sampleRate
    );

    const offlineContext = new OfflineContext(
      2,
      frameCount,
      sampleRate
    );

    // MASTER OUTPUT

    const exportMaster = offlineContext.createGain();

    exportMaster.gain.value = masterVolume / 100;

    exportMaster.connect(offlineContext.destination);

    // SOLO LOGIC

    const hasSolo = activeTracks.some(track => track.solo);

    // MIX EACH TRACK

    activeTracks.forEach(track => {

      if (track.muted) return;

      if (hasSolo && !track.solo) return;

      const source = offlineContext.createBufferSource();

      const gain = offlineContext.createGain();

      const panner = offlineContext.createStereoPanner();

            const autoGain = offlineContext.createGain();

      source.buffer = track.buffer;
      source.loop = true;

      gain.gain.value = track.volume / 100;

      panner.pan.value = track.pan / 100;

            const effectChain = buildTrackEffectsChain(
  offlineContext,
  source,
  track.effects
);

applyTrackEffectsToRefs(effectChain.refs, track.effects);   // <-- ADD THIS LINE

effectChain.output.connect(panner);

panner.connect(autoGain);
autoGain.connect(gain);
gain.connect(exportMaster);

scheduleAutomationPass(
  autoGain.gain,
  track.automation.volume,
  0,
  exportDuration,
  0.01
);

if (trackHasPanAutomation(track)) {
  scheduleAutomationPass(
    panner.pan,
    track.automation.pan,
    0,
    exportDuration,
    0.01
  );
}

      source.start(0);

    });

    // RENDER THE COMPLETE MIX

    showToast("Rendering your AUDIONIX mix...");

    const renderedBuffer =
      await offlineContext.startRendering();

    // CONVERT TO SELECTED FORMAT

const exportFormat = settingsRecordingFormat.value;

const bitrates = {
  high: 320,
  medium: 192,
  low: 128
};

const exportBlob = exportFormat === "mp3"
  ? audioBufferToMp3(
      renderedBuffer,
      bitrates[settingsRecordingQuality.value]
    )
  : audioBufferToWav(renderedBuffer);


// DOWNLOAD FILE

const downloadUrl = URL.createObjectURL(exportBlob);

const downloadLink = document.createElement("a");

downloadLink.href = downloadUrl;

downloadLink.download =
  "AUDIONIX_Mix_" +
  new Date().toISOString().replace(/[:.]/g, "-") +
  "." + exportFormat;

document.body.appendChild(downloadLink);

downloadLink.click();

downloadLink.remove();

setTimeout(() => {
  URL.revokeObjectURL(downloadUrl);
}, 1000);

showToast(
  "Your " + exportFormat.toUpperCase() +
  " mix has been exported!"
);

  } catch (error) {

    console.error("AUDIONIX export error:", error);

    showToast("Export failed. Check the browser console.");

  } finally {

    mixerExportBtn.disabled = false;
mixerExportBtn.textContent =
  "↓ EXPORT " + settingsRecordingFormat.value.toUpperCase();

  }
}


// ------------------------------------------
// EXPORT BUTTON EVENT
// ------------------------------------------

mixerExportBtn.addEventListener(
  "click",
  exportMixerAudio
);

// ==========================================
// AUDIONIX - STAGE 10
// PROJECT SAVE & LOAD SYSTEM
// ==========================================

let currentProjectId = null;

const projectsList = document.getElementById("projectsList");
const projectsEmpty = document.getElementById("projectsEmpty");


// ------------------------------------------
// OPEN PROJECT DATABASE
// ------------------------------------------

let projectDatabasePromise = null;

function openProjectDatabase() {

  if (projectDatabasePromise) {
    return projectDatabasePromise;
  }

  projectDatabasePromise = new Promise((resolve, reject) => {

    const request = indexedDB.open("AUDIONIX_PROJECTS", 1);

    request.onupgradeneeded = event => {

      const database = event.target.result;

      if (!database.objectStoreNames.contains("projects")) {

        database.createObjectStore("projects", {
          keyPath: "id"
        });

      }

    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      projectDatabasePromise = null;
      reject(request.error);
    };

  });

  return projectDatabasePromise;
}


// ------------------------------------------
// UPDATE PROJECT TITLE
// ------------------------------------------

function updateProjectTitle(name) {

  const title = document.querySelector(".project-title");

  if (title) {
    title.textContent = name;
  }

}


// ------------------------------------------
// SAVE PROJECT
// ------------------------------------------

// ------------------------------------------
// AUDIO BUFFER SERIALIZATION
// ------------------------------------------

function serializeAudioBuffer(buffer) {

  if (!buffer) return null;

  return {

    sampleRate: buffer.sampleRate,

    numberOfChannels: buffer.numberOfChannels,

    length: buffer.length,

    channels: Array.from(
      { length: buffer.numberOfChannels },
      (_, index) =>
        buffer.getChannelData(index).slice()
    )

  };

}


function restoreAudioBuffer(savedBuffer) {

  if (!savedBuffer) return null;

  const restored = audioContext.createBuffer(
    savedBuffer.numberOfChannels,
    savedBuffer.length,
    savedBuffer.sampleRate
  );

  savedBuffer.channels.forEach((channel, index) => {

    restored.copyToChannel(
      new Float32Array(channel),
      index
    );

  });

  return restored;

}

async function saveProject() {

  if (activeRecorder || isCountingIn) {
    showToast("Stop recording before saving");
    return;
  }

  const existingName = currentProjectId
    ? document.querySelector(".project-title").textContent
    : "";

  const projectName = prompt(
    "Enter a name for your project:",
    existingName || "My AUDIONIX Session"
  );

  if (!projectName || !projectName.trim()) {
    return;
  }

  try {

    const database = await openProjectDatabase();

    const project = {

      id: currentProjectId || Date.now(),

      name: projectName.trim(),

      savedAt: new Date().toISOString(),

      bpm: bpm,

      loopBars: Number(loopBars.value),

      loopLength: loopLength,

      armedTrack: armedTrack,

      masterVolume: masterVolume,

      tracks: loopTracks.map(track => {

  ensureTrackClips(track);

  // Save each unique clip source buffer only once.

  const clipBufferMap = new Map();

  const clipBuffers = [];

  const savedClips = track.clips.map(clip => {

    let bufferIndex = clipBufferMap.get(
      clip.buffer
    );

    if (bufferIndex === undefined) {

      bufferIndex = clipBuffers.length;

      clipBufferMap.set(
        clip.buffer,
        bufferIndex
      );

      clipBuffers.push(
        serializeAudioBuffer(clip.buffer)
      );

    }

    return {

      id: clip.id,

      bufferIndex,

      start: clip.start,

      duration: clip.duration,

      sourceStart: clip.sourceStart

    };

  });

  return {

    id: track.id,

    name: track.name,

    volume: track.volume,

    pan: track.pan,

    muted: track.muted,

    solo: track.solo,

    duration: track.duration,

    // Retain the arrangement buffer for compatibility.

    buffer: serializeAudioBuffer(track.buffer),

    // Save the editable clip arrangement.

    clips: savedClips,
    clipBuffers,
        effects: normalizeTrackEffects(track.effects),
    automation: normalizeTrackAutomation(track.automation)
  };

})
    };

    const transaction = database.transaction(
      ["projects"],
      "readwrite"
    );

    transaction.objectStore("projects").put(project);

    await new Promise((resolve, reject) => {

      transaction.oncomplete = resolve;

      transaction.onerror = () => reject(transaction.error);

      transaction.onabort = () => reject(transaction.error);

    });

    currentProjectId = project.id;

    updateProjectTitle(project.name);

    await refreshProjectsList();

    showToast("Project saved successfully!");

  } catch (error) {

    console.error("Project save error:", error);

    showToast("Unable to save project");

  }

}


// ------------------------------------------
// GET ALL SAVED PROJECTS
// ------------------------------------------

async function getSavedProjects() {

  const database = await openProjectDatabase();

  return new Promise((resolve, reject) => {

    const transaction = database.transaction(
      ["projects"],
      "readonly"
    );

    const request = transaction
      .objectStore("projects")
      .getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };

  });

}


// ------------------------------------------
// DISPLAY PROJECT LIBRARY
// ------------------------------------------

async function refreshProjectsList() {

  try {

    const projects = await getSavedProjects();

    projects.sort((a, b) =>
      new Date(b.savedAt) - new Date(a.savedAt)
    );

    projectsList.innerHTML = "";

    projectsEmpty.hidden = projects.length > 0;

    projects.forEach(project => {

      const card = document.createElement("div");

      card.className = "project-card";

      const title = document.createElement("h3");
      title.textContent = project.name;

      const date = document.createElement("p");
      date.textContent =
        "Last saved: " +
        new Date(project.savedAt).toLocaleString();

      const trackCount = document.createElement("p");

      const count = project.tracks.filter(
        track => track.buffer
      ).length;

      trackCount.textContent =
        count + " / 4 tracks recorded";

      const tempo = document.createElement("p");
      tempo.textContent = project.bpm + " BPM";

      const actions = document.createElement("div");
      actions.className = "project-card-actions";

      const loadButton = document.createElement("button");
      loadButton.textContent = "LOAD PROJECT";

      loadButton.addEventListener("click", () => {
        loadProject(project.id);
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "DELETE";
      deleteButton.className = "project-delete-button";

      deleteButton.addEventListener("click", () => {
        deleteProject(project.id);
      });

      actions.appendChild(loadButton);
      actions.appendChild(deleteButton);

      card.appendChild(title);
      card.appendChild(date);
      card.appendChild(trackCount);
      card.appendChild(tempo);
      card.appendChild(actions);

      projectsList.appendChild(card);

    });

  } catch (error) {

    console.error("Project library error:", error);

    showToast("Unable to load project library");

  }

}


// ------------------------------------------
// LOAD PROJECT
// ------------------------------------------

async function loadProject(projectId) {

  if (activeRecorder || isCountingIn) {
    showToast("Stop recording before loading a project");
    return;
  }

  if (!confirm("Load this project? Your current unsaved session will be replaced.")) {
    return;
  }

  try {

    const database = await openProjectDatabase();

    const project = await new Promise((resolve, reject) => {

      const transaction = database.transaction(
        ["projects"],
        "readonly"
      );

      const request = transaction
        .objectStore("projects")
        .get(projectId);

      request.onsuccess = () => resolve(request.result);

      request.onerror = () => reject(request.error);

    });

    if (!project) {
      showToast("Project not found");
      return;
    }

    // STOP CURRENT PLAYBACK

    if (audioContext) {
      stopAllTracks();
    }

    isPlaying = false;
    playbackPaused = false;
    pausedPlaybackOffset = 0;

    if (typeof stopTimelinePlayhead === "function") {
      stopTimelinePlayhead();
    }

    // CREATE AUDIO CONTEXT IF NEEDED

    if (!audioContext) {

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      audioContext = new AudioContextClass();

    }

    await audioContext.resume();

    // RESTORE PROJECT SETTINGS

    bpm = project.bpm || 120;

    loopBars.value = String(project.loopBars || 2);

    loopLength = project.loopLength || 0;

    armedTrack = project.armedTrack || 0;

    masterVolume = project.masterVolume ?? 85;

    updateProjectTempo();

    // RESTORE TRACKS

    project.tracks.forEach(savedTrack => {

  const track = loopTracks[savedTrack.id];

  if (!track) return;

  track.volume = savedTrack.volume ?? 80;
  track.pan = savedTrack.pan ?? 0;
  track.effects = normalizeTrackEffects(savedTrack.effects);
    track.automation = normalizeTrackAutomation(savedTrack.automation);

  track.muted = savedTrack.muted ?? false;
  track.solo = savedTrack.solo ?? false;

  track.duration = savedTrack.duration ?? 0;

  track.buffer = null;
  track.clips = [];

  // Restore the existing arrangement buffer.

  if (savedTrack.buffer) {
    track.buffer = restoreAudioBuffer(
      savedTrack.buffer
    );
  }

  // RESTORE NEW CLIP FORMAT

  if (
    Array.isArray(savedTrack.clips) &&
    Array.isArray(savedTrack.clipBuffers)
  ) {

    const restoredClipBuffers =
      savedTrack.clipBuffers.map(buffer =>
        restoreAudioBuffer(buffer)
      );

    track.clips = savedTrack.clips.map(savedClip => ({

      id: savedClip.id,

      buffer:
        restoredClipBuffers[savedClip.bufferIndex],

      start: savedClip.start,

      duration: savedClip.duration,

      sourceStart: savedClip.sourceStart

    }));

    // Rebuild the arrangement from the saved clips.

    if (track.clips.length > 0) {
      rebuildTrackArrangement(track);
    }

  } else if (track.buffer) {

    // BACKWARD COMPATIBILITY:
    // Older saved projects have one buffer per track.

    track.clips = [
      createTimelineClip(
        track.buffer,
        0,
        track.buffer.duration,
        0
      )
    ];

  }

});

    // UPDATE INTERFACE

    currentProjectId = project.id;
    selectedTimelineTrackId = null;
selectedTimelineClipId = null;

clipUndoStack = [];

updateClipEditorControls();

    updateProjectTitle(project.name);

    loopDuration.textContent = loopLength > 0
      ? formatLoopTime(loopLength)
      : "Not set";

    loopStatus.textContent = "Project loaded";

    recordTime.textContent = "00:00";

    renderTracks();

    syncMixerControls();

updateTrackMix();

updateMixerPlaybackButton();

// Refresh Effects Rack with restored project settings
if (typeof renderEffectsPanel === "function") {
  renderEffectsPanel();
}

openView("looper");

    showToast("Project loaded successfully!");

  } catch (error) {

    console.error("Project load error:", error);

    showToast("Unable to load project");

  }

}


// ------------------------------------------
// DELETE PROJECT
// ------------------------------------------

async function deleteProject(projectId) {

  if (!confirm("Permanently delete this saved project?")) {
    return;
  }

  try {

    const database = await openProjectDatabase();

    const transaction = database.transaction(
      ["projects"],
      "readwrite"
    );

    transaction.objectStore("projects").delete(projectId);

    await new Promise((resolve, reject) => {

      transaction.oncomplete = resolve;

      transaction.onerror = () => reject(transaction.error);

    });

    if (currentProjectId === projectId) {
      currentProjectId = null;
    }

    await refreshProjectsList();

    showToast("Project deleted");

  } catch (error) {

    console.error("Project delete error:", error);

    showToast("Unable to delete project");

  }

}


// ------------------------------------------
// PROJECT LIBRARY NAVIGATION
// ------------------------------------------

document.querySelectorAll('[data-view="projects"]').forEach(button => {

  button.addEventListener("click", () => {
    refreshProjectsList();
  });

});


// INITIALISE PROJECT LIBRARY

refreshProjectsList();

// ==========================================
// AUDIONIX - STAGE 10
// NEW SESSION SYSTEM
// ==========================================

function startNewSession() {

  if (activeRecorder || isCountingIn) {
    showToast("Stop recording before starting a new session");
    return;
  }

  const hasExistingWork = loopTracks.some(track => track.buffer);

  if (hasExistingWork) {
    const confirmed = confirm(
      "Start a fresh session? Your current unsaved work will be cleared."
    );

    if (!confirmed) return;
  }

  // STOP PLAYBACK

  stopAllTracks();
  stopMetronomeScheduler();

  // CLEAR ALL FOUR TRACKS

  loopTracks.forEach(track => {

    track.buffer = null;
track.duration = 0;
track.clips = [];

    track.volume = 80;
    track.pan = 0;
        track.automation = createDefaultTrackAutomation();

    track.muted = false;
    track.solo = false;

  });

  // RESET PROJECT SETTINGS

  currentProjectId = null;

  selectedTimelineTrackId = null;
selectedTimelineClipId = null;
clipUndoStack = [];

updateClipEditorControls();

  // APPLY SAVED STUDIO DEFAULTS

bpm = Number(settingsDefaultTempo.value);
loopBars.value = settingsDefaultLoopBars.value;

countInEnabled =
  settingsDefaultCountIn.value === "true";

metronomeEnabled =
  settingsDefaultMetronome.value === "true";

  loopLength = 0;
  armedTrack = 0;

  masterVolume = 85;

  // RESET PLAYBACK STATE

  isPlaying = false;
  playbackPaused = false;
  pausedPlaybackOffset = 0;

  // RESET PROJECT TITLE

  updateProjectTitle("Untitled Session");

  // RESET DISPLAY

  recordTime.textContent = "00:00";
  loopDuration.textContent = "Not set";

  loopStatus.textContent = "Ready for recording";

  countInDisplay.className = "count-in-display";
  countInDisplay.textContent = "READY";

  document.getElementById("timeDisplay").textContent = "00:00:00";

  // APPLY METRONOME AND COUNT-IN BUTTON STATES

metronomeBtn.textContent =
  metronomeEnabled ? "ON" : "OFF";

metronomeBtn.classList.toggle(
  "active",
  metronomeEnabled
);

countInBtn.textContent =
  countInEnabled ? "ON" : "OFF";

countInBtn.classList.toggle(
  "active",
  countInEnabled
);

updateMetronome();

  // RESET MASTER VOLUME

  masterVolumeSlider.value = 85;
  masterVolumeValue.textContent = "85%";

  // REFRESH INTERFACE

  updateProjectTempo();
  updateSyncDisplay();

  renderTracks();
  syncMixerControls();
  updateTrackMix();

  updateMixerPlaybackButton();

  // OPEN THE FRESH STUDIO SESSION

  openView("looper");

  showToast("Fresh session created!");

}

// ==========================================
// AUDIONIX - STAGE 11
// CLIP SELECTION & TRIMMING
// ==========================================


// ------------------------------------------
// SELECT TIMELINE CLIP
// ------------------------------------------

function selectTimelineClip(trackId, clipId, refresh = true) {

  const track = loopTracks[trackId];

  if (!track) return;

  const clip = track.clips.find(
    item => item.id === clipId
  );

  if (!clip) return;

  selectedTimelineTrackId = trackId;
  selectedTimelineClipId = clipId;

  selectedClipName.textContent =
    track.name + " · Clip";

  trimStartInput.value = "0";

  trimEndInput.value =
    track.buffer.duration.toFixed(2);

  trimEndInput.max = track.buffer.duration;
  trimStartInput.max = track.buffer.duration;

  applyTrimBtn.disabled = false;

  if (refresh) {
    renderTimeline();
  } else {
    updateClipEditorControls();
  }

  showToast(track.name + " clip selected");

}


timelineTrackArea.addEventListener("click", event => {

  const clipElement =
    event.target.closest(".timeline-clip");

  if (clipElement) {

    selectTimelineClip(
      Number(clipElement.dataset.trackId),
      clipElement.dataset.clipId
    );

    return;
  }

  const lane =
    event.target.closest(".timeline-track-lane");

  if (!lane) return;

  const trackId = Number(lane.dataset.trackId);

  const track = loopTracks[trackId];

  if (!track || !track.clips.length) {
    showToast("This track has no clips");
    return;
  }

  selectTimelineClip(
    trackId,
    track.clips[0].id
  );

});

// ------------------------------------------
// APPLY TRIM TO SELECTED CLIP
// ------------------------------------------

function applyTimelineTrim() {

  if (activeRecorder || isCountingIn) {
    showToast("Stop recording before editing");
    return;
  }

  if (isPlaying) {
    showToast("Stop playback before trimming");
    return;
  }

  if (selectedTimelineTrackId === null) {
    showToast("Select a clip first");
    return;
  }

  const track = loopTracks[selectedTimelineTrackId];

  if (!track || !track.buffer) return;

  const startSeconds = Number(trimStartInput.value);

  const endSeconds = Number(trimEndInput.value);

  const originalBuffer = track.buffer;

  const duration = originalBuffer.duration;

  // VALIDATE TRIM RANGE

  if (
    !Number.isFinite(startSeconds) ||
    !Number.isFinite(endSeconds) ||
    startSeconds < 0 ||
    endSeconds > duration ||
    startSeconds >= endSeconds
  ) {

    showToast("Enter a valid trim range");

    return;
  }

  const startFrame = Math.floor(
    startSeconds * originalBuffer.sampleRate
  );

  const endFrame = Math.floor(
    endSeconds * originalBuffer.sampleRate
  );

  if (endFrame <= startFrame) {
    showToast("Trim range is too short");
    return;
  }

  try {

    // CREATE A NEW BUFFER WITH THE ORIGINAL
    // PROJECT LENGTH, SO THE LOOP STAYS IN SYNC.

    const editedBuffer = audioContext.createBuffer(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate
    );

    // COPY ONLY THE SELECTED AUDIO SECTION.
    // THE REMAINING SPACE WILL BE SILENCE.

    for (
      let channel = 0;
      channel < originalBuffer.numberOfChannels;
      channel++
    ) {

      const originalData =
        originalBuffer.getChannelData(channel);

      const selectedAudio = originalData.slice(
        startFrame,
        endFrame
      );

      editedBuffer.copyToChannel(
        selectedAudio,
        channel,
        0
      );

    }

    // REPLACE ONLY THE SELECTED TRACK BUFFER.

    track.buffer = editedBuffer;
    track.clips = [
  createTimelineClip(
    editedBuffer,
    0,
    editedBuffer.duration,
    0
  )
];

selectedTimelineClipId = track.clips[0].id;

clipUndoStack = [];

    // REFRESH THE INTERFACE.

    trimStartInput.value = "0";

    trimEndInput.value = duration.toFixed(2);

    renderTracks();

    selectedClipName.textContent =
      track.name + " (Trimmed)";

    showToast(track.name + " trimmed successfully");

  } catch (error) {

    console.error("Timeline trim error:", error);

    showToast("Unable to trim this clip");

  }

}


// ------------------------------------------
// TRIM BUTTON
// ------------------------------------------

applyTrimBtn.addEventListener(
  "click",
  applyTimelineTrim
);

// ==========================================
// STAGE 11.2 - CLIP EDITING CONTROLS
// ==========================================


// ------------------------------------------
// USE CURRENT PLAYHEAD POSITION
// ------------------------------------------

usePlayheadBtn.addEventListener("click", () => {

  const position = getCurrentTimelinePosition();

  splitTimeInput.value = position.toFixed(2);

  showToast("Playhead position selected");

});


// ------------------------------------------
// SPLIT SELECTED CLIP
// ------------------------------------------

function splitSelectedClip() {

  if (activeRecorder || isCountingIn) {
    showToast("Stop recording before editing");
    return;
  }

  const track =
    loopTracks[selectedTimelineTrackId];

  const clip = getSelectedTimelineClip();

  if (!track || !clip) {
    showToast("Select a clip first");
    return;
  }

  // If the input is empty, use the current playhead.

  const splitTime = splitTimeInput.value.trim() === ""
    ? getCurrentTimelinePosition()
    : Number(splitTimeInput.value);

  if (!Number.isFinite(splitTime)) {
    showToast("Enter a valid split position");
    return;
  }

  const clipEnd = clip.start + clip.duration;

  if (
    splitTime <= clip.start ||
    splitTime >= clipEnd
  ) {
    showToast("Split position must be inside the selected clip");
    return;
  }

  // Capture the current playhead before stopping playback.

  if (isPlaying) {
    stopAllTracks();
  }

  const snapshot = captureClipUndoState();

  const leftDuration =
    splitTime - clip.start;

  const rightDuration =
    clip.duration - leftDuration;

  const rightClip = createTimelineClip(
    clip.buffer,
    splitTime,
    rightDuration,
    clip.sourceStart + leftDuration
  );

  pushClipUndoState(snapshot);

  // Keep the original ID for the left clip.

  clip.duration = leftDuration;

  track.clips.push(rightClip);

  selectedTimelineClipId = rightClip.id;

  rebuildTrackArrangement(track);

  renderTracks();

  selectedClipName.textContent =
    track.name + " · Clip 2";

  showToast("Clip split successfully");

}


// ------------------------------------------
// SPLIT BUTTON
// ------------------------------------------

splitClipBtn.addEventListener(
  "click",
  splitSelectedClip
);


// ------------------------------------------
// DELETE SELECTED CLIP
// ------------------------------------------

function deleteSelectedClip() {

  if (activeRecorder || isCountingIn || isPlaying) {
    showToast("Stop playback or recording before deleting");
    return;
  }

  const track =
    loopTracks[selectedTimelineTrackId];

  const clip = getSelectedTimelineClip();

  if (!track || !clip) {
    showToast("Select a clip first");
    return;
  }

  const snapshot = captureClipUndoState();

  pushClipUndoState(snapshot);

  track.clips = track.clips.filter(
    item => item.id !== clip.id
  );

  if (track.clips.length === 0) {

    track.buffer = null;
    track.duration = 0;

    selectedTimelineTrackId = null;
    selectedTimelineClipId = null;

    applyTrimBtn.disabled = true;

  } else {

    selectedTimelineClipId =
      track.clips[0].id;

    rebuildTrackArrangement(track);

  }

  renderTracks();

  showToast("Clip deleted");

}


// ------------------------------------------
// DELETE BUTTON
// ------------------------------------------

deleteClipBtn.addEventListener(
  "click",
  deleteSelectedClip
);


// ------------------------------------------
// UNDO LAST CLIP EDIT
// ------------------------------------------

function undoClipEdit() {

  if (isPlaying || activeRecorder || isCountingIn) {
    showToast("Stop playback or recording before undo");
    return;
  }

  if (clipUndoStack.length === 0) {
    showToast("Nothing to undo");
    return;
  }

  const previousState =
    clipUndoStack.pop();

  restoreClipUndoState(previousState);

  // Keep a valid clip selected.

  if (
    selectedTimelineTrackId !== null &&
    selectedTimelineClipId !== null
  ) {

    const track =
      loopTracks[selectedTimelineTrackId];

    const stillExists = track?.clips.some(
      clip => clip.id === selectedTimelineClipId
    );

    if (!stillExists) {

      selectedTimelineTrackId = null;
      selectedTimelineClipId = null;

    }

  }

  updateClipEditorControls();

  showToast("Last clip edit undone");

}


undoClipBtn.addEventListener(
  "click",
  undoClipEdit
);


// ------------------------------------------
// INITIALISE CLIP EDITOR BUTTONS
// ------------------------------------------

updateClipEditorControls();


// ==========================================
// AUDIONIX - STAGE 12.3
// TRACK EFFECTS PROCESSING ENGINE
// ==========================================


// ------------------------------------------
// DEFAULT EFFECT SETTINGS
// ------------------------------------------

function createDefaultTrackEffects() {
  return {
    eq: {
      enabled: false,
      low: 0,
      mid: 0,
      high: 0
    },

    compressor: {
      enabled: false,
      threshold: -24,
      ratio: 4,
      attack: 10,
      release: 150
    },

    reverb: {
      enabled: false,
      mix: 25,
      decay: 4
    },

    delay: {
      enabled: false,
      time: 300,
      feedback: 30,
      mix: 25
    }
  };
}


function normalizeTrackEffects(saved) {
  const defaults = createDefaultTrackEffects();
  saved = saved || {};

  return {
    eq: {
      ...defaults.eq,
      ...(saved.eq || {})
    },

    compressor: {
      ...defaults.compressor,
      ...(saved.compressor || {})
    },

    reverb: {
      ...defaults.reverb,
      ...(saved.reverb || {})
    },

    delay: {
      ...defaults.delay,
      ...(saved.delay || {})
    }
  };
}


// ------------------------------------------
// INITIALISE EFFECT SETTINGS
// ------------------------------------------

loopTracks.forEach(track => {
  track.effects = normalizeTrackEffects(track.effects);
  track.effectNodes = [];
  track.effectNodeRefs = null;
});


// ------------------------------------------
// GENERATE REVERB IMPULSE RESPONSE
// ------------------------------------------

function createReverbImpulse(context, decay) {
  const sampleRate = context.sampleRate;

  const length = Math.max(
    1,
    Math.floor(sampleRate * decay)
  );

  const impulse = context.createBuffer(
    2,
    length,
    sampleRate
  );

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);

    for (let i = 0; i < length; i++) {
      const envelope = Math.exp(-6 * i / length);

      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }

  return impulse;
}


// ------------------------------------------
// BUILD COMPLETE EFFECTS CHAIN
// ------------------------------------------

function buildTrackEffectsChain(context, source, savedSettings) {

  const settings = normalizeTrackEffects(savedSettings);

  const nodes = [];

  const refs = {};


  // EQUALIZER

  const low = context.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = 120;

  const mid = context.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1000;
  mid.Q.value = 0.8;

  const high = context.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = 8000;


  // COMPRESSOR

  const compressor = context.createDynamicsCompressor();


  // REVERB

  const reverbDry = context.createGain();
  const reverbWet = context.createGain();
  const reverbSum = context.createGain();

  const convolver = context.createConvolver();

  convolver.buffer = createReverbImpulse(
    context,
    settings.reverb.decay
  );


  // DELAY

  const delayDry = context.createGain();
  const delayWet = context.createGain();
  const delaySum = context.createGain();

  const delay = context.createDelay(2);
  const feedback = context.createGain();


  // CONNECT EQ AND COMPRESSOR

  source.connect(low);
  low.connect(mid);
  mid.connect(high);
  high.connect(compressor);


  // CONNECT REVERB PARALLEL PATH

  compressor.connect(reverbDry);
  compressor.connect(convolver);

  reverbDry.connect(reverbSum);

  convolver.connect(reverbWet);
  reverbWet.connect(reverbSum);


  // CONNECT DELAY PARALLEL PATH

  reverbSum.connect(delayDry);
  reverbSum.connect(delay);

  delay.connect(delayWet);

  delay.connect(feedback);
  feedback.connect(delay);

  delayDry.connect(delaySum);
  delayWet.connect(delaySum);


  // STORE NODE REFERENCES

  refs.low = low;
  refs.mid = mid;
  refs.high = high;

  refs.compressor = compressor;

  refs.reverbDry = reverbDry;
  refs.reverbWet = reverbWet;

  refs.delayDry = delayDry;
  refs.delayWet = delayWet;

  refs.delay = delay;
  refs.feedback = feedback;


  nodes.push(
    low,
    mid,
    high,
    compressor,
    reverbDry,
    reverbWet,
    reverbSum,
    convolver,
    delayDry,
    delayWet,
    delaySum,
    delay,
    feedback
  );


  return {
    output: delaySum,
    nodes,
    refs
  };
}


// ------------------------------------------
// APPLY SETTINGS TO LIVE EFFECT NODES
// ------------------------------------------

function applyTrackEffectsToNodes(track) {

  if (!audioContext || !track.effectNodeRefs) return;

  const settings = normalizeTrackEffects(track.effects);
  const refs = track.effectNodeRefs;

  const now = audioContext.currentTime;
  const smooth = 0.025;


  // EQ

  refs.low.gain.setTargetAtTime(
    settings.eq.enabled ? settings.eq.low : 0,
    now,
    smooth
  );

  refs.mid.gain.setTargetAtTime(
    settings.eq.enabled ? settings.eq.mid : 0,
    now,
    smooth
  );

  refs.high.gain.setTargetAtTime(
    settings.eq.enabled ? settings.eq.high : 0,
    now,
    smooth
  );


  // COMPRESSOR

  refs.compressor.threshold.setTargetAtTime(
    settings.compressor.enabled
      ? settings.compressor.threshold
      : 0,
    now,
    smooth
  );

  refs.compressor.ratio.setTargetAtTime(
    settings.compressor.enabled
      ? settings.compressor.ratio
      : 1,
    now,
    smooth
  );

  refs.compressor.attack.setTargetAtTime(
    settings.compressor.attack / 1000,
    now,
    smooth
  );

  refs.compressor.release.setTargetAtTime(
    settings.compressor.release / 1000,
    now,
    smooth
  );


  // REVERB

  const reverbMix = settings.reverb.enabled
    ? settings.reverb.mix / 100
    : 0;

  refs.reverbDry.gain.setTargetAtTime(
    1 - reverbMix,
    now,
    smooth
  );

  refs.reverbWet.gain.setTargetAtTime(
    reverbMix,
    now,
    smooth
  );


  // DELAY

  const delayMix = settings.delay.enabled
    ? settings.delay.mix / 100
    : 0;

  refs.delayDry.gain.setTargetAtTime(
    1 - delayMix,
    now,
    smooth
  );

  refs.delayWet.gain.setTargetAtTime(
    delayMix,
    now,
    smooth
  );

  refs.delay.delayTime.setTargetAtTime(
    settings.delay.time / 1000,
    now,
    smooth
  );

  refs.feedback.gain.setTargetAtTime(
    settings.delay.enabled
      ? Math.min(0.9, settings.delay.feedback / 100)
      : 0,
    now,
    smooth
  );

}

// ------------------------------------------
// APPLY EFFECT SETTINGS INSTANTLY (USED BY EXPORT)
// ------------------------------------------

function applyTrackEffectsToRefs(refs, effects) {

  const settings = normalizeTrackEffects(effects);

  // EQ
  refs.low.gain.value  = settings.eq.enabled ? settings.eq.low  : 0;
  refs.mid.gain.value  = settings.eq.enabled ? settings.eq.mid  : 0;
  refs.high.gain.value = settings.eq.enabled ? settings.eq.high : 0;

  // COMPRESSOR
  refs.compressor.threshold.value = settings.compressor.enabled
    ? settings.compressor.threshold
    : 0;
  refs.compressor.ratio.value = settings.compressor.enabled
    ? settings.compressor.ratio
    : 1;
  refs.compressor.attack.value  = settings.compressor.attack / 1000;
  refs.compressor.release.value = settings.compressor.release / 1000;

  // REVERB
  const reverbMix = settings.reverb.enabled
    ? settings.reverb.mix / 100
    : 0;
  refs.reverbDry.gain.value = 1 - reverbMix;
  refs.reverbWet.gain.value = reverbMix;

  // DELAY
  const delayMix = settings.delay.enabled
    ? settings.delay.mix / 100
    : 0;
  refs.delayDry.gain.value = 1 - delayMix;
  refs.delayWet.gain.value = delayMix;
  refs.delay.delayTime.value = settings.delay.time / 1000;
  refs.feedback.gain.value = settings.delay.enabled
    ? Math.min(0.9, settings.delay.feedback / 100)
    : 0;
}


// ------------------------------------------
// DISCONNECT EFFECT NODES
// ------------------------------------------

function disconnectTrackEffectNodes(track) {

  if (!track || !track.effectNodes) return;

  track.effectNodes.forEach(node => {
    try {
      node.disconnect();
    } catch (error) {}
  });

  track.effectNodes = [];
  track.effectNodeRefs = null;
}

// ==========================================
// AUDIONIX - STAGE 14
// TRACK AUTOMATION ENGINE
// ==========================================

const automationFadeSeconds = 2;

function createDefaultTrackAutomation() {
  return { volume: [], pan: [] };
}

function normalizeAutomationPoints(points, minValue, maxValue) {
  if (!Array.isArray(points)) return [];

  return points
    .filter(p => p && Number.isFinite(p.time) && Number.isFinite(p.value))
    .map(p => ({
      time: Math.max(0, p.time),
      value: Math.min(maxValue, Math.max(minValue, p.value))
    }))
    .sort((a, b) => a.time - b.time);
}

function normalizeTrackAutomation(saved) {
  saved = saved || {};

  return {
    volume: normalizeAutomationPoints(saved.volume, 0, 100),
    pan: normalizeAutomationPoints(saved.pan, -100, 100)
  };
}

loopTracks.forEach(track => {
  track.automation = normalizeTrackAutomation(track.automation);
  track.automationGainNode = null;
});

function trackHasPanAutomation(track) {
  return !!(track.automation && track.automation.pan.length > 0);
}

// Value of an automation lane at time t (seconds)
function evaluateAutomationLane(points, t, fallback) {
  if (!points || points.length === 0) return fallback;

  if (t <= points[0].time) return points[0].value;

  const last = points[points.length - 1];
  if (t >= last.time) return last.value;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    if (t >= a.time && t <= b.time) {
      const span = b.time - a.time;
      if (span <= 0) return b.value;
      return a.value + (b.value - a.value) * ((t - a.time) / span);
    }
  }

  return last.value;
}

// Schedule one pass (one loop) of a lane onto an AudioParam
function scheduleAutomationPass(param, points, passStart, loopLen, scale, startFrom = 0) {
  if (!points || points.length === 0 || loopLen <= 0) return;

  param.setValueAtTime(
    evaluateAutomationLane(points, startFrom, 0) * scale,
    passStart + startFrom
  );

  points.forEach(point => {
    if (point.time <= startFrom || point.time >= loopLen) return;

    param.linearRampToValueAtTime(
      point.value * scale,
      passStart + point.time
    );
  });

  param.linearRampToValueAtTime(
    evaluateAutomationLane(points, loopLen, 0) * scale,
    passStart + loopLen
  );
}

// ------------------------------------------
// LIVE PLAYBACK AUTOMATION
// ------------------------------------------

let automationTimer = null;
let automationNextPass = 0;

function scheduleLiveAutomationPass(passStart, startFrom = 0) {
  loopTracks.forEach(track => {

    if (track.automationGainNode) {
      scheduleAutomationPass(
        track.automationGainNode.gain,
        track.automation.volume,
        passStart,
        loopLength,
        0.01,
        startFrom
      );
    }

    if (track.panNode && trackHasPanAutomation(track)) {
      scheduleAutomationPass(
        track.panNode.pan,
        track.automation.pan,
        passStart,
        loopLength,
        0.01,
        startFrom
      );
    }

  });
}

function scheduleLiveAutomationWindow() {
  if (!audioContext || !isPlaying || loopLength <= 0) return;

  const horizon =
    audioContext.currentTime + Math.max(10, loopLength * 2);

  while (
    timelineStartTime + automationNextPass * loopLength < horizon
  ) {
    scheduleLiveAutomationPass(
      timelineStartTime + automationNextPass * loopLength
    );

    automationNextPass++;
  }
}

function startLiveAutomation() {
  stopLiveAutomation();

  automationNextPass = 0;

  scheduleLiveAutomationWindow();

  automationTimer = setInterval(scheduleLiveAutomationWindow, 1000);
}

function stopLiveAutomation() {
  if (automationTimer !== null) {
    clearInterval(automationTimer);
    automationTimer = null;
  }
}

// Call this after automation points are edited during playback
function refreshLiveAutomation() {
  if (!audioContext || !isPlaying || loopLength <= 0) return;

  const now = audioContext.currentTime;

  const passIndex = Math.max(
    0,
    Math.floor((now - timelineStartTime) / loopLength)
  );

  const passStart = timelineStartTime + passIndex * loopLength;
  const position = now - passStart;

  loopTracks.forEach(track => {

    if (track.automationGainNode) {
      const g = track.automationGainNode.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(
        evaluateAutomationLane(track.automation.volume, position, 100) * 0.01,
        now
      );
    }

    if (track.panNode) {
      const p = track.panNode.pan;
      p.cancelScheduledValues(now);
      p.setValueAtTime(
        trackHasPanAutomation(track)
          ? evaluateAutomationLane(track.automation.pan, position, 0) * 0.01
          : track.pan / 100,
        now
      );
    }

  });

  scheduleLiveAutomationPass(passStart, position);

  automationNextPass = passIndex + 1;

  scheduleLiveAutomationWindow();
}

// ------------------------------------------
// REPLACE LIVE PLAYBACK WITH EFFECTS
// ------------------------------------------

startAllTracks = function(startTime, offset = 0) {

  if (!audioContext) return;

  stopAllTracks();

  masterMixGain = audioContext.createGain();

  masterMixGain.gain.value = (masterVolume / 100) * 5.0; // Boosted 5x for normal web playback volume

  masterMixGain.connect(audioContext.destination);


  loopTracks.forEach(track => {

    if (!track.buffer) return;

    const source = audioContext.createBufferSource();

    const panner = audioContext.createStereoPanner();

    const gain = audioContext.createGain();

        const autoGain = audioContext.createGain();


    source.buffer = track.buffer;
    source.loop = true;

    panner.pan.value = track.pan / 100;


    // INSERT THE EFFECTS CHAIN

    const effectChain = buildTrackEffectsChain(
      audioContext,
      source,
      track.effects
    );

    effectChain.output.connect(panner);


        panner.connect(autoGain);
    autoGain.connect(gain);
    gain.connect(masterMixGain);


    track.source = source;

    track.panNode = panner;

    track.gainNode = gain;

        track.automationGainNode = autoGain;

    track.effectNodes = effectChain.nodes;

    track.effectNodeRefs = effectChain.refs;


    applyTrackEffectsToNodes(track);


    source.start(startTime, offset);

  });


  isPlaying = true;

  playbackPaused = false;

  pausedPlaybackOffset = 0;

  timelineStartTime = startTime - offset;

    startLiveAutomation();

  startTimelinePlayhead();

  updateTrackMix();

  loopStatus.textContent = "Playing all tracks";

  loopPlayBtn.textContent = "PAUSE ALL";

  loopStopPlaybackBtn.disabled = false;

  updateMixerPlaybackButton();

};


// ------------------------------------------
// REPLACE STOP FUNCTION WITH SAFE CLEANUP
// ------------------------------------------

stopAllTracks = function() {

  loopTracks.forEach(track => {

    if (track.source) {

      try {
        track.source.stop();
      } catch (error) {}

      track.source.disconnect();

      track.source = null;
    }


    disconnectTrackEffectNodes(track);


    if (track.gainNode) {
      track.gainNode.disconnect();
      track.gainNode = null;
    }

    if (track.panNode) {
      track.panNode.disconnect();
      track.panNode = null;
    }

        if (track.automationGainNode) {
      track.automationGainNode.disconnect();
      track.automationGainNode = null;
    }

  });


  if (masterMixGain) {
    masterMixGain.disconnect();
    masterMixGain = null;
  }

    stopLiveAutomation();

  isPlaying = false;

  playbackPaused = false;

  pausedPlaybackOffset = 0;

  stopTimelinePlayhead();

  loopPlayBtn.textContent = "PLAY ALL";

  loopStopPlaybackBtn.disabled = true;

  updateMixerPlaybackButton();

};


// ------------------------------------------
// EFFECTS RACK UI
// ------------------------------------------

const effectsTrackSelector =
  document.getElementById("effectsTrackSelector");

const effectsSelectedTrackName =
  document.getElementById("effectsSelectedTrackName");

const effectsTrackStatus =
  document.getElementById("effectsTrackStatus");

const effectsRack =
  document.getElementById("view-effects");

let selectedEffectsTrackId = 0;


// ------------------------------------------
// EFFECT CONTROL MAP
// ------------------------------------------

const effectsControlMap = {

  eqEnabled: {
    section: "eq",
    key: "enabled",
    type: "checkbox"
  },

  eqLow: {
    section: "eq",
    key: "low",
    valueId: "eqLowValue"
  },

  eqMid: {
    section: "eq",
    key: "mid",
    valueId: "eqMidValue"
  },

  eqHigh: {
    section: "eq",
    key: "high",
    valueId: "eqHighValue"
  },


  compressorEnabled: {
    section: "compressor",
    key: "enabled",
    type: "checkbox"
  },

  compThreshold: {
    section: "compressor",
    key: "threshold",
    valueId: "compThresholdValue"
  },

  compRatio: {
    section: "compressor",
    key: "ratio",
    valueId: "compRatioValue"
  },

  compAttack: {
    section: "compressor",
    key: "attack",
    valueId: "compAttackValue"
  },

  compRelease: {
    section: "compressor",
    key: "release",
    valueId: "compReleaseValue"
  },


  rackReverbEnabled: {
    section: "reverb",
    key: "enabled",
    type: "checkbox"
  },

  rackReverbMix: {
    section: "reverb",
    key: "mix",
    valueId: "rackReverbMixValue"
  },

  rackReverbDecay: {
    section: "reverb",
    key: "decay",
    valueId: "rackReverbDecayValue"
  },


  rackDelayEnabled: {
    section: "delay",
    key: "enabled",
    type: "checkbox"
  },

  rackDelayTime: {
    section: "delay",
    key: "time",
    valueId: "rackDelayTimeValue"
  },

  rackDelayFeedback: {
    section: "delay",
    key: "feedback",
    valueId: "rackDelayFeedbackValue"
  },

  rackDelayMix: {
    section: "delay",
    key: "mix",
    valueId: "rackDelayMixValue"
  }

};


// ------------------------------------------
// FORMAT CONTROL VALUES
// ------------------------------------------

function formatEffectsValue(id, value) {

  if (id === "compRatio") return value + ":1";

  if (id === "rackReverbDecay") return value + " s";

  if (id === "rackDelayTime") return value + " ms";

  if (
    id === "rackReverbMix" ||
    id === "rackDelayFeedback" ||
    id === "rackDelayMix"
  ) {
    return value + "%";
  }

  if (
    id === "compAttack" ||
    id === "compRelease"
  ) {
    return value + " ms";
  }

  return value + " dB";
}


// ------------------------------------------
// REFRESH EFFECTS RACK DISPLAY
// ------------------------------------------

function renderEffectsPanel() {

  const track = loopTracks[selectedEffectsTrackId];

  if (!track) return;

  track.effects = normalizeTrackEffects(track.effects);


  effectsSelectedTrackName.textContent = track.name;


  effectsTrackSelector
    .querySelectorAll(".effects-track-button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        Number(button.dataset.track) === selectedEffectsTrackId
      );

    });


  Object.entries(effectsControlMap).forEach(([id, binding]) => {

    const control = document.getElementById(id);

    if (!control) return;

    const value = track.effects[binding.section][binding.key];

    if (binding.type === "checkbox") {

      control.checked = Boolean(value);

    } else {

      control.value = value;

      const valueLabel = document.getElementById(binding.valueId);

      if (valueLabel) {
        valueLabel.textContent = formatEffectsValue(id, value);
      }

    }

  });


  const anyEnabled =
    track.effects.eq.enabled ||
    track.effects.compressor.enabled ||
    track.effects.reverb.enabled ||
    track.effects.delay.enabled;

  effectsTrackStatus.textContent = anyEnabled
    ? "EFFECTS ACTIVE"
    : "EFFECTS BYPASSED";

}


// ------------------------------------------
// SELECT TRACK
// ------------------------------------------

effectsTrackSelector.addEventListener("click", event => {

  const button = event.target.closest(".effects-track-button");

  if (!button) return;

  selectedEffectsTrackId = Number(button.dataset.track);

  renderEffectsPanel();

});


// ------------------------------------------
// UPDATE EFFECT SETTINGS
// ------------------------------------------

function handleEffectsControl(event) {

  const control = event.target;

  const binding = effectsControlMap[control.id];

  if (!binding) return;


  const track = loopTracks[selectedEffectsTrackId];

  if (!track) return;


  track.effects = normalizeTrackEffects(track.effects);


  track.effects[binding.section][binding.key] =
    binding.type === "checkbox"
      ? control.checked
      : Number(control.value);


  if (binding.valueId) {

    const valueLabel = document.getElementById(binding.valueId);

    if (valueLabel) {
      valueLabel.textContent = formatEffectsValue(
        control.id,
        Number(control.value)
      );
    }

  }


  // UPDATE LIVE PLAYBACK WITHOUT RESTARTING IT

  applyTrackEffectsToNodes(track);


  const anyEnabled =
    track.effects.eq.enabled ||
    track.effects.compressor.enabled ||
    track.effects.reverb.enabled ||
    track.effects.delay.enabled;

  effectsTrackStatus.textContent = anyEnabled
    ? "EFFECTS ACTIVE"
    : "EFFECTS BYPASSED";

}


effectsRack.addEventListener("input", handleEffectsControl);

effectsRack.addEventListener("change", handleEffectsControl);


// ------------------------------------------
// INITIALISE EFFECTS RACK
// ------------------------------------------

renderEffectsPanel();


// RESET EFFECTS WHEN A TRACK IS CLEARED

const originalClearTrack = clearTrack;

clearTrack = function(id) {

  const track = loopTracks[id];

  if (track) {
    disconnectTrackEffectNodes(track);
    track.effects = createDefaultTrackEffects();
  }

  originalClearTrack(id);

  if (selectedEffectsTrackId === id) {
    renderEffectsPanel();
  }

};


// RESET EFFECTS WHEN STARTING A NEW SESSION

const originalStartNewSession = startNewSession;

startNewSession = function() {

  originalStartNewSession();

  loopTracks.forEach(track => {
    track.effects = createDefaultTrackEffects();
  });

  selectedEffectsTrackId = 0;

  renderEffectsPanel();

};

// ==========================================
// END OF STAGE 12.3 EFFECTS ENGINE
// ==========================================



// ==========================================
// AUDIONIX - STAGE 12.4
// PRESET LIBRARY STORAGE
// ==========================================

let presetDatabasePromise = null;
let customPresets = [];

function openPresetDatabase() {

  if (presetDatabasePromise) {
    return presetDatabasePromise;
  }

  presetDatabasePromise = new Promise((resolve, reject) => {

    const request = indexedDB.open("AUDIONIX_PRESETS", 1);

    request.onupgradeneeded = event => {

      const database = event.target.result;

      if (!database.objectStoreNames.contains("presets")) {
        database.createObjectStore("presets", {
          keyPath: "id"
        });
      }

    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      presetDatabasePromise = null;
      reject(request.error);
    };

  });

  return presetDatabasePromise;
}


// LOAD CUSTOM PRESETS

async function loadCustomPresets() {

  try {

    const database = await openPresetDatabase();

    customPresets = await new Promise((resolve, reject) => {

      const transaction = database.transaction(
        ["presets"],
        "readonly"
      );

      const request = transaction
        .objectStore("presets")
        .getAll();

      request.onsuccess = () => resolve(request.result || []);

      request.onerror = () => reject(request.error);

    });

    return customPresets;

  } catch (error) {

    console.error("Preset loading error:", error);
    showToast("Unable to load presets");

    return [];

  }

}


// SAVE A CUSTOM PRESET

async function storeCustomPreset(preset) {

  try {

    const database = await openPresetDatabase();

    await new Promise((resolve, reject) => {

      const transaction = database.transaction(
        ["presets"],
        "readwrite"
      );

      transaction.objectStore("presets").put(preset);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);

    });

    return true;

  } catch (error) {

    console.error("Preset saving error:", error);
    showToast("Unable to save preset");

    return false;

  }

}


// DELETE A CUSTOM PRESET

async function removeCustomPreset(presetId) {

  try {

    const database = await openPresetDatabase();

    await new Promise((resolve, reject) => {

      const transaction = database.transaction(
        ["presets"],
        "readwrite"
      );

      transaction.objectStore("presets").delete(presetId);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);

    });

    return true;

  } catch (error) {

    console.error("Preset deletion error:", error);
    showToast("Unable to delete preset");

    return false;

  }

}


// INITIALISE PRESET STORAGE


// ==========================================
// STAGE 12.4 - PRESET LIBRARY UI
// ==========================================

const presetLibraryGrid =
  document.getElementById("presetLibraryGrid");

const presetEmptyState =
  document.getElementById("presetEmptyState");

const saveCurrentPresetBtn =
  document.getElementById("saveCurrentPresetBtn");

const presetSearchInput =
  document.getElementById("presetSearchInput");

const presetCategoryFilters =
  document.getElementById("presetCategoryFilters");

let activePresetCategory = "all";


// ------------------------------------------
// BUILT-IN FACTORY PRESETS
// ------------------------------------------

function createFactoryPreset(id, name, category, trackName, settings) {
  return {
    id: "factory_" + id,
    name,
    category,
    trackName,
    effects: normalizeTrackEffects(settings),
    isFactory: true
  };
}

const factoryPresets = [

  // GUITAR

  createFactoryPreset("clean", "Clean", "guitar", "Guitar Rhythm", {
    eq: { enabled: true, low: 0, mid: 0, high: 2 },
    reverb: { enabled: true, mix: 12, decay: 2 }
  }),

  createFactoryPreset("crunch", "Crunch", "guitar", "Guitar Rhythm", {
    eq: { enabled: true, low: 2, mid: 3, high: 1 },
    compressor: { enabled: true, threshold: -25, ratio: 3 },
    reverb: { enabled: true, mix: 10, decay: 2 }
  }),

  createFactoryPreset("lead", "Lead", "guitar", "Guitar Rhythm", {
    eq: { enabled: true, low: 1, mid: 4, high: 2 },
    compressor: { enabled: true, threshold: -30, ratio: 4 },
    reverb: { enabled: true, mix: 20, decay: 3 },
    delay: { enabled: true, time: 380, feedback: 25, mix: 18 }
  }),

  createFactoryPreset("ambient", "Ambient", "guitar", "Guitar Rhythm", {
    eq: { enabled: true, low: 0, mid: -1, high: 2 },
    reverb: { enabled: true, mix: 55, decay: 8 },
    delay: { enabled: true, time: 550, feedback: 45, mix: 35 }
  }),


  // BASS

  createFactoryPreset("deep-bass", "Deep Bass", "bass", "Bass", {
    eq: { enabled: true, low: 5, mid: -2, high: -1 },
    compressor: { enabled: true, threshold: -30, ratio: 4 }
  }),

  createFactoryPreset("punchy-bass", "Punchy Bass", "bass", "Bass", {
    eq: { enabled: true, low: 3, mid: 3, high: 1 },
    compressor: { enabled: true, threshold: -24, ratio: 5, attack: 8, release: 100 }
  }),


  // VOCALS

  createFactoryPreset("warm-vocal", "Warm Vocal", "vocals", "Vocals", {
    eq: { enabled: true, low: 1, mid: 1, high: -1 },
    compressor: { enabled: true, threshold: -28, ratio: 3 },
    reverb: { enabled: true, mix: 18, decay: 2 }
  }),

  createFactoryPreset("studio-vocal", "Studio Vocal", "vocals", "Vocals", {
    eq: { enabled: true, low: -1, mid: 2, high: 3 },
    compressor: { enabled: true, threshold: -30, ratio: 4, attack: 5, release: 100 },
    reverb: { enabled: true, mix: 12, decay: 2 }
  }),

  createFactoryPreset("vocal-space", "Vocal Space", "vocals", "Vocals", {
    eq: { enabled: true, low: 0, mid: 1, high: 2 },
    compressor: { enabled: true, threshold: -28, ratio: 3 },
    reverb: { enabled: true, mix: 45, decay: 7 },
    delay: { enabled: true, time: 420, feedback: 30, mix: 22 }
  }),


  // KEYBOARD

  createFactoryPreset("grand-piano", "Grand Piano", "keyboard", "Keyboard", {
    eq: { enabled: true, low: 1, mid: 0, high: 2 },
    compressor: { enabled: true, threshold: -28, ratio: 2 },
    reverb: { enabled: true, mix: 18, decay: 3 }
  }),

  createFactoryPreset("soft-keys", "Soft Keys", "keyboard", "Keyboard", {
    eq: { enabled: true, low: -1, mid: 1, high: 1 },
    reverb: { enabled: true, mix: 22, decay: 4 }
  }),

  createFactoryPreset("ambient-keys", "Ambient Keys", "keyboard", "Keyboard", {
    eq: { enabled: true, low: 0, mid: -1, high: 2 },
    reverb: { enabled: true, mix: 50, decay: 8 },
    delay: { enabled: true, time: 500, feedback: 35, mix: 25 }
  })

];


// ------------------------------------------
// TRACK CATEGORY
// ------------------------------------------

function getPresetCategory(trackId) {

  const categories = [
    "guitar",
    "bass",
    "vocals",
    "keyboard"
  ];

  return categories[trackId] || "custom";

}


// ------------------------------------------
// RENDER PRESET CARDS
// ------------------------------------------

function renderPresetLibrary() {

  if (!presetLibraryGrid) return;

  const searchTerm =
    presetSearchInput.value.trim().toLowerCase();

const allPresets = [...factoryPresets, ...customPresets];

const filteredPresets = allPresets.filter(preset => {

    const matchesCategory =
  activePresetCategory === "all" ||
  (activePresetCategory === "custom" && !preset.isFactory) ||
  preset.category === activePresetCategory;

    const matchesSearch =
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.trackName.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;

  });

  presetLibraryGrid.innerHTML = "";

  filteredPresets.forEach(preset => {

    const card = document.createElement("div");
    card.className = "preset-card";

    const category = document.createElement("span");
    category.className = "preset-card-category";
    category.textContent = preset.category.toUpperCase();

    const title = document.createElement("h3");
    title.textContent = preset.name;

    const description = document.createElement("p");
    description.textContent =
      "Created from " + preset.trackName;

    const customLabel = document.createElement("span");
    customLabel.className = "preset-custom-label";
customLabel.textContent = preset.isFactory
  ? "FACTORY"
  : "CUSTOM";
    const actions = document.createElement("div");
    actions.className = "preset-card-actions";

    const applyButton = document.createElement("button");
applyButton.className = "preset-apply-button";
applyButton.textContent = "APPLY";
applyButton.dataset.action = "apply";
applyButton.dataset.id = preset.id;

actions.appendChild(applyButton);

if (!preset.isFactory) {
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "DELETE";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = preset.id;

  actions.appendChild(deleteButton);
}

card.append(
  category,
  title,
  customLabel,
  description,
  actions
);

presetLibraryGrid.appendChild(card);

  });

  presetEmptyState.hidden = filteredPresets.length > 0;

}


// ------------------------------------------
// SAVE CURRENT TRACK AS PRESET
// ------------------------------------------

saveCurrentPresetBtn.addEventListener("click", async () => {

  const track = loopTracks[selectedEffectsTrackId];

  if (!track) return;

  const presetName = prompt(
    "Name your preset:"
  );

  if (!presetName || !presetName.trim()) return;

  const preset = {

    id: "preset_" + Date.now() + "_" + Math.random(),

    name: presetName.trim(),

    category: getPresetCategory(selectedEffectsTrackId),

    trackName: track.name,

    effects: normalizeTrackEffects(track.effects),

    createdAt: new Date().toISOString()

  };

  const saved = await storeCustomPreset(preset);

  if (!saved) return;

  customPresets.push(preset);

  activePresetCategory = "all";

  presetCategoryFilters
    .querySelectorAll(".preset-filter")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === "all"
      );
    });

  presetSearchInput.value = "";

  renderPresetLibrary();

  showToast("Preset saved successfully!");

});


// ------------------------------------------
// CATEGORY FILTERS
// ------------------------------------------

presetCategoryFilters.addEventListener("click", event => {

  const button = event.target.closest(".preset-filter");

  if (!button) return;

  activePresetCategory = button.dataset.category;

  presetCategoryFilters
    .querySelectorAll(".preset-filter")
    .forEach(filter => {
      filter.classList.toggle(
        "active",
        filter === button
      );
    });

  renderPresetLibrary();

});


// ------------------------------------------
// SEARCH PRESETS
// ------------------------------------------

presetSearchInput.addEventListener(
  "input",
  renderPresetLibrary
);


// ------------------------------------------
// APPLY OR DELETE PRESET
// ------------------------------------------

presetLibraryGrid.addEventListener("click", async event => {

  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const presetId = button.dataset.id;

  const preset = [...factoryPresets, ...customPresets].find(
  item => item.id === presetId
);

  if (!preset) return;


  // APPLY PRESET

  if (button.dataset.action === "apply") {

    const track = loopTracks[selectedEffectsTrackId];

    if (!track) return;

    track.effects = normalizeTrackEffects(preset.effects);

    applyTrackEffectsToNodes(track);

    renderEffectsPanel();

    showToast(
      preset.name + " applied to " + track.name
    );

  }


  // DELETE PRESET

  if (button.dataset.action === "delete") {

    const confirmed = confirm(
      'Delete preset "' + preset.name + '"?'
    );

    if (!confirmed) return;

    const deleted = await removeCustomPreset(presetId);

    if (!deleted) return;

    customPresets = customPresets.filter(
      item => item.id !== presetId
    );

    renderPresetLibrary();

    showToast("Preset deleted");

  }

});


// ------------------------------------------
// INITIALISE PRESET LIBRARY
// ------------------------------------------

loadCustomPresets().then(() => {
  renderPresetLibrary();
});


// ==========================================
// AUDIONIX - STUDIO SETTINGS
// SAVING AND APPLYING USER PREFERENCES
// ==========================================

const settingsDefaultTempo =
  document.getElementById("settingsDefaultTempo");

const settingsDefaultLoopBars =
  document.getElementById("settingsDefaultLoopBars");

const settingsDefaultMetronome =
  document.getElementById("settingsDefaultMetronome");

const settingsDefaultCountIn =
  document.getElementById("settingsDefaultCountIn");

const settingsRecordingFormat =
  document.getElementById("settingsRecordingFormat");

const settingsRecordingQuality =
  document.getElementById("settingsRecordingQuality");

const settingsAppearance =
  document.getElementById("settingsAppearance");


const SETTINGS_STORAGE_KEY = "AUDIONIX_STUDIO_SETTINGS";


const defaultStudioSettings = {
  tempo: 120,
  loopBars: "2",
  metronome: "false",
  countIn: "true",
  format: "wav",
  quality: "high",
  appearance: "dark"
};


// ------------------------------------------
// APPLY APPEARANCE
// ------------------------------------------

function applyStudioAppearance() {

  document.documentElement.dataset.theme =
    settingsAppearance.value;

}


// ------------------------------------------
// UPDATE EXPORT BUTTON
// ------------------------------------------

function updateExportButtonLabel() {

  mixerExportBtn.textContent =
    "↓ EXPORT " +
    settingsRecordingFormat.value.toUpperCase();

}


// ------------------------------------------
// LOAD SAVED SETTINGS
// ------------------------------------------

function loadStudioSettings() {

  let savedSettings = {};

  try {

    savedSettings = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}"
    );

  } catch (error) {

    console.error("Unable to load studio settings:", error);

  }


  const tempo = Number(savedSettings.tempo);

  settingsDefaultTempo.value =
    Number.isFinite(tempo) && tempo >= 30 && tempo <= 300
      ? tempo
      : defaultStudioSettings.tempo;


  const validLoopBars = ["1", "2", "4", "8"];

  settingsDefaultLoopBars.value =
    validLoopBars.includes(String(savedSettings.loopBars))
      ? String(savedSettings.loopBars)
      : defaultStudioSettings.loopBars;


  settingsDefaultMetronome.value =
    ["true", "false"].includes(savedSettings.metronome)
      ? savedSettings.metronome
      : defaultStudioSettings.metronome;


  settingsDefaultCountIn.value =
    ["true", "false"].includes(savedSettings.countIn)
      ? savedSettings.countIn
      : defaultStudioSettings.countIn;


  settingsRecordingFormat.value =
    ["wav", "mp3"].includes(savedSettings.format)
      ? savedSettings.format
      : defaultStudioSettings.format;


  settingsRecordingQuality.value =
    ["high", "medium", "low"].includes(savedSettings.quality)
      ? savedSettings.quality
      : defaultStudioSettings.quality;


  settingsAppearance.value =
    ["dark", "light"].includes(savedSettings.appearance)
      ? savedSettings.appearance
      : defaultStudioSettings.appearance;


  applyStudioAppearance();

  updateExportButtonLabel();

}


// ------------------------------------------
// SAVE SETTINGS
// ------------------------------------------

function saveStudioSettings() {

  let tempo = Number(settingsDefaultTempo.value);

  if (!Number.isFinite(tempo)) {
    tempo = 120;
  }

  tempo = Math.max(30, Math.min(300, tempo));

  settingsDefaultTempo.value = tempo;


  const settings = {

    tempo: tempo,

    loopBars: settingsDefaultLoopBars.value,

    metronome: settingsDefaultMetronome.value,

    countIn: settingsDefaultCountIn.value,

    format: settingsRecordingFormat.value,

    quality: settingsRecordingQuality.value,

    appearance: settingsAppearance.value

  };


  try {

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );

    applyStudioAppearance();

    updateExportButtonLabel();

    showToast("Studio settings saved");

  } catch (error) {

    console.error("Unable to save studio settings:", error);

    showToast("Unable to save studio settings");

  }

}


// ------------------------------------------
// CONNECT SETTINGS CONTROLS
// ------------------------------------------

[
  settingsDefaultTempo,
  settingsDefaultLoopBars,
  settingsDefaultMetronome,
  settingsDefaultCountIn,
  settingsRecordingFormat,
  settingsRecordingQuality,
  settingsAppearance
].forEach(control => {

  control.addEventListener(
    "change",
    saveStudioSettings
  );

});


// ------------------------------------------
// INITIALISE SETTINGS
// ------------------------------------------

loadStudioSettings();

// ==========================================
// AUDIONIX - STAGE 14.3
// AUTOMATION TIMELINE UI
// ==========================================

// "var" is used on purpose: renderTimeline() runs once while the page
// loads, before this part of the file has executed.
var automationEditMode = false;
var automationActiveLane = "volume";
var automationTargetTrackId = null;
var automationDrag = null;
var automationLastRefresh = 0;
var automationLaneHeight = 76;
var automationPad = 8;

const automationVolumeBtn = document.getElementById("automationVolumeBtn");
const automationPanBtn = document.getElementById("automationPanBtn");
const automationEditBtn = document.getElementById("automationEditBtn");
const automationTargetName = document.getElementById("automationTargetName");
const automationFadeLength = document.getElementById("automationFadeLength");
const fadeInBtn = document.getElementById("fadeInBtn");
const fadeOutBtn = document.getElementById("fadeOutBtn");
const clearAutomationBtn = document.getElementById("clearAutomationBtn");


// ------------------------------------------
// VALUE <-> POSITION HELPERS
// ------------------------------------------

function automationValueToY(lane, value) {
  const usable = automationLaneHeight - automationPad * 2;

  const ratio = lane === "pan"
    ? (value + 100) / 200
    : value / 100;

  return automationPad + (1 - ratio) * usable;
}

function automationYToValue(lane, y) {
  const usable = automationLaneHeight - automationPad * 2;

  let ratio = 1 - (y - automationPad) / usable;
  ratio = Math.min(1, Math.max(0, ratio));

  if (lane === "pan") {
    const pan = Math.round(ratio * 200 - 100);
    return Math.abs(pan) <= 3 ? 0 : pan;
  }

  return Math.round(ratio * 100);
}

function automationEventToPosition(event, svg, lane) {
  const rect = svg.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  let time = x / timelinePixelsPerSecond;
  time = Math.min(loopLength, Math.max(0, time));
  time = Math.round(time * 100) / 100;

  return {
    time,
    value: automationYToValue(lane, y)
  };
}

function automationSvg(name, attrs) {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    name
  );

  Object.keys(attrs || {}).forEach(key => {
    element.setAttribute(key, attrs[key]);
  });

  return element;
}


// ------------------------------------------
// DRAW AUTOMATION LINE AND POINTS
// ------------------------------------------

function drawAutomationContent(svg, track) {
  const lane = automationActiveLane === "pan" ? "pan" : "volume";
  const points = track.automation[lane];
  const endX = loopLength * timelinePixelsPerSecond;

  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  // Reference line (100% volume, or pan centre)
  const baseY = automationValueToY(lane, lane === "pan" ? 0 : 100);

  svg.appendChild(automationSvg("line", {
    class: "automation-baseline",
    x1: 0, y1: baseY, x2: endX, y2: baseY
  }));

  if (points.length > 0) {
    let d = "M 0 " + automationValueToY(lane, points[0].value);

    points.forEach(point => {
      d += " L " +
        (point.time * timelinePixelsPerSecond) + " " +
        automationValueToY(lane, point.value);
    });

    const last = points[points.length - 1];

    d += " L " + endX + " " + automationValueToY(lane, last.value);

    if (lane === "volume") {
      svg.appendChild(automationSvg("path", {
        class: "automation-fill",
        d: d + " L " + endX + " " + automationLaneHeight +
           " L 0 " + automationLaneHeight + " Z"
      }));
    }

    svg.appendChild(automationSvg("path", {
      class: "automation-line " + lane,
      d
    }));
  }

  points.forEach((point, index) => {
    svg.appendChild(automationSvg("circle", {
      class: "automation-point " + lane,
      cx: point.time * timelinePixelsPerSecond,
      cy: automationValueToY(lane, point.value),
      r: 5,
      "data-index": index
    }));
  });

  const label = automationSvg("text", {
    class: "automation-label",
    x: 6,
    y: 12
  });

  label.textContent = lane === "pan" ? "PAN" : "VOLUME";

  svg.appendChild(label);
}

function renderAutomationOverlays() {
  if (!timelineTrackArea) return;

  timelineTrackArea.classList.toggle(
    "automation-edit",
    !!automationEditMode
  );

  timelineTrackArea
    .querySelectorAll(".timeline-track-lane")
    .forEach(lane => {

      const track = loopTracks[Number(lane.dataset.trackId)];
      const container = lane.querySelector(".timeline-clip-container");

      if (!track || !track.automation || !container) return;

      const old = container.querySelector(".automation-overlay");
      if (old) old.remove();

      const svg = automationSvg("svg", {
        class: "automation-overlay",
        width: parseFloat(container.style.width) || 900,
        height: automationLaneHeight
      });

      svg.dataset.trackId = track.id;

      container.appendChild(svg);

      drawAutomationContent(svg, track);
    });
}


// ------------------------------------------
// TOOLBAR HELPERS
// ------------------------------------------

function getAutomationTrack() {
  const id = automationTargetTrackId !== null
    ? automationTargetTrackId
    : selectedTimelineTrackId;

  if (id === null || id === undefined) return null;

  return loopTracks[id] || null;
}

function updateAutomationToolbar() {
  const track = getAutomationTrack();

  automationTargetName.textContent = track ? track.name : "None";
}

function setAutomationLane(lane) {
  automationActiveLane = lane === "pan" ? "pan" : "volume";

  automationVolumeBtn.classList.toggle("active", automationActiveLane === "volume");
  automationPanBtn.classList.toggle("active", automationActiveLane === "pan");

  renderAutomationOverlays();
}

function scheduleAutomationRefresh() {
  const now = performance.now();

  if (now - automationLastRefresh < 120) return;

  automationLastRefresh = now;

  refreshLiveAutomation();
}


// ------------------------------------------
// ADD / MOVE / DELETE POINTS
// ------------------------------------------

function automationPointerDown(event) {
  if (!automationEditMode || event.button !== 0) return;

  const svg = event.target.closest
    ? event.target.closest(".automation-overlay")
    : null;

  if (!svg) return;

  if (loopLength <= 0) {
    showToast("Record a track first");
    return;
  }

  const track = loopTracks[Number(svg.dataset.trackId)];

  if (!track) return;

  event.preventDefault();
  event.stopPropagation();

  automationTargetTrackId = track.id;
  updateAutomationToolbar();

  const lane = automationActiveLane === "pan" ? "pan" : "volume";
  const points = track.automation[lane];

  let point = null;

  const pointElement = event.target.closest(".automation-point");

  if (pointElement) {
    point = points[Number(pointElement.dataset.index)];
  } else {
    const position = automationEventToPosition(event, svg, lane);

    point = { time: position.time, value: position.value };

    points.push(point);
    points.sort((a, b) => a.time - b.time);
  }

  if (!point) return;

  automationDrag = { track, lane, point, svg };

  svg.setPointerCapture(event.pointerId);

  drawAutomationContent(svg, track);

  scheduleAutomationRefresh();
}

function automationPointerMove(event) {
  if (!automationDrag) return;

  const { track, lane, point, svg } = automationDrag;

  const position = automationEventToPosition(event, svg, lane);

  point.time = position.time;
  point.value = position.value;

  track.automation[lane].sort((a, b) => a.time - b.time);

  drawAutomationContent(svg, track);

  scheduleAutomationRefresh();
}

function automationPointerUp(event) {
  if (!automationDrag) return;

  const { svg } = automationDrag;

  try {
    svg.releasePointerCapture(event.pointerId);
  } catch (error) {}

  automationDrag = null;

  refreshLiveAutomation();
}

function deleteAutomationPoint(event) {
  if (!automationEditMode) return;

  const pointElement = event.target.closest
    ? event.target.closest(".automation-point")
    : null;

  if (!pointElement) return;

  event.preventDefault();
  event.stopPropagation();

  const svg = pointElement.closest(".automation-overlay");
  const track = loopTracks[Number(svg.dataset.trackId)];

  if (!track) return;

  const lane = automationActiveLane === "pan" ? "pan" : "volume";

  track.automation[lane].splice(Number(pointElement.dataset.index), 1);

  drawAutomationContent(svg, track);

  refreshLiveAutomation();
}

timelineTrackArea.addEventListener("pointerdown", automationPointerDown);
timelineTrackArea.addEventListener("pointermove", automationPointerMove);
timelineTrackArea.addEventListener("pointerup", automationPointerUp);
timelineTrackArea.addEventListener("pointercancel", automationPointerUp);
timelineTrackArea.addEventListener("dblclick", deleteAutomationPoint);
timelineTrackArea.addEventListener("contextmenu", deleteAutomationPoint);

// Stop clicks on the overlay from selecting clips while editing
timelineTrackArea.addEventListener("click", event => {
  if (
    automationEditMode &&
    event.target.closest &&
    event.target.closest(".automation-overlay")
  ) {
    event.stopPropagation();
  }
}, true);


// ------------------------------------------
// FADE IN / FADE OUT / CLEAR
// ------------------------------------------

function applyAutomationFade(type) {
  const track = getAutomationTrack();

  if (!track) {
    showToast("Select a track first");
    return;
  }

  if (loopLength <= 0 || !track.buffer) {
    showToast("Record this track first");
    return;
  }

  let length = Number(automationFadeLength.value);

  if (!Number.isFinite(length) || length <= 0) {
    length = automationFadeSeconds;
  }

  length = Math.min(length, loopLength / 2);
  length = Math.round(length * 100) / 100;

  const points = track.automation.volume;

  if (type === "in") {

    const valueAtEnd = evaluateAutomationLane(points, length, 100);

    const kept = points.filter(point => point.time > length);

    kept.push(
      { time: 0, value: 0 },
      { time: length, value: valueAtEnd }
    );

    track.automation.volume = normalizeAutomationPoints(kept, 0, 100);

  } else {

    const startTime = loopLength - length;

    const valueAtStart = evaluateAutomationLane(points, startTime, 100);

    const kept = points.filter(point => point.time < startTime);

    kept.push(
      { time: startTime, value: valueAtStart },
      { time: loopLength, value: 0 }
    );

    track.automation.volume = normalizeAutomationPoints(kept, 0, 100);
  }

  automationTargetTrackId = track.id;

  updateAutomationToolbar();
  setAutomationLane("volume");
  refreshLiveAutomation();

  showToast(
    "Fade " + type + " applied to " + track.name
  );
}

function clearAutomationLane() {
  const track = getAutomationTrack();

  if (!track) {
    showToast("Select a track first");
    return;
  }

  const lane = automationActiveLane === "pan" ? "pan" : "volume";

  track.automation[lane] = [];

  renderAutomationOverlays();
  refreshLiveAutomation();

  showToast(
    track.name + " " + lane + " automation cleared"
  );
}


// ------------------------------------------
// TOOLBAR BUTTON EVENTS
// ------------------------------------------

automationVolumeBtn.addEventListener("click", () => setAutomationLane("volume"));
automationPanBtn.addEventListener("click", () => setAutomationLane("pan"));

automationEditBtn.addEventListener("click", () => {
  automationEditMode = !automationEditMode;

  automationEditBtn.textContent =
    "EDIT POINTS: " + (automationEditMode ? "ON" : "OFF");

  automationEditBtn.classList.toggle("active", automationEditMode);

  renderAutomationOverlays();
});

fadeInBtn.addEventListener("click", () => applyAutomationFade("in"));
fadeOutBtn.addEventListener("click", () => applyAutomationFade("out"));
clearAutomationBtn.addEventListener("click", clearAutomationLane);


// ------------------------------------------
// FOLLOW THE SELECTED CLIP'S TRACK
// ------------------------------------------

const stage14SelectClip = selectTimelineClip;

selectTimelineClip = function (trackId, clipId, refresh = true) {
  automationTargetTrackId = Number(trackId);

  stage14SelectClip(trackId, clipId, refresh);

  updateAutomationToolbar();
};

renderAutomationOverlays();
