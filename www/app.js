const $ = (selector) => document.querySelector(selector);
const fileInput = $('#file-input');
const chooseButton = $('#choose-track');
const playButton = $('#play-button');
const playIcon = $('#play-icon');
const seek = $('#seek');
const status = $('#status');
const presets = [...document.querySelectorAll('.preset')];
const presetSettings = {
  original: { rate: 1, bass: 0, cutoff: 20000, resonance: 0.0001, drive: 0, delay: 0, feedback: 0 },
  bass: { rate: 1, bass: 9, cutoff: 20000, resonance: 0.0001, drive: 0, delay: 0, feedback: 0 },
  slow: { rate: 0.78, bass: 2, cutoff: 20000, resonance: 0.0001, drive: 0, delay: 0, feedback: 0 },
  echo: { rate: 1, bass: 1, cutoff: 15000, resonance: 0.0001, drive: 0, delay: 0.34, feedback: 0.3 },
  lofi: { rate: 1, bass: 2, cutoff: 4200, resonance: 0.6, drive: 11, delay: 0.08, feedback: 0.12 }
};
let audioContext;
let buffer;
let source;
let nodes;
let selectedPreset = 'original';
let offset = 0;
let startedAt = 0;
let isPlaying = false;
let volume = 0.8;
let animationFrame;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function setStatus(message) { status.textContent = message; }
function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}
function makeDistortion(amount) {
  const curve = new Float32Array(44100);
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / curve.length - 1;
    curve[i] = amount ? Math.tanh(x * (1 + amount / 8)) / Math.tanh(1 + amount / 8) : x;
  }
  return curve;
}
function connectGraph(sourceNode) {
  const ctx = getAudioContext();
  const settings = presetSettings[selectedPreset];
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowshelf';
  filter.frequency.value = 180;
  filter.gain.value = settings.bass;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = settings.cutoff;
  tone.Q.value = settings.resonance;
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortion(settings.drive);
  shaper.oversample = '2x';
  const master = ctx.createGain();
  master.gain.value = volume;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = settings.delay || 0.001;
  const feedback = ctx.createGain();
  feedback.gain.value = settings.feedback;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = settings.delay ? 0.48 : 0;
  sourceNode.connect(filter);
  filter.connect(tone);
  tone.connect(shaper);
  shaper.connect(master);
  shaper.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(echoLevel);
  echoLevel.connect(master);
  master.connect(ctx.destination);
  nodes = { filter, tone, shaper, master, delay, feedback, echoLevel };
}
function refreshProgress() {
  if (!buffer) return;
  const elapsed = isPlaying ? offset + (getAudioContext().currentTime - startedAt) * presetSettings[selectedPreset].rate : offset;
  const position = Math.min(elapsed, buffer.duration);
  $('#current-time').textContent = formatTime(position);
  seek.value = String(Math.round((position / buffer.duration) * 1000));
  if (isPlaying && position >= buffer.duration) stopPlayback(true);
  animationFrame = requestAnimationFrame(refreshProgress);
}
function stopPlayback(ended = false) {
  if (source) {
    source.onended = null;
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
    source = null;
  }
  isPlaying = false;
  if (ended) offset = 0;
  playIcon.textContent = '▶';
  playButton.setAttribute('aria-label', 'Play');
  if (animationFrame) cancelAnimationFrame(animationFrame);
  refreshProgress();
  if (ended) setStatus('Track finished. Play it again whenever you like.');
}
async function startPlayback() {
  if (!buffer) return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  if (source) {
    source.onended = null;
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
  }
  source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = presetSettings[selectedPreset].rate;
  connectGraph(source);
  source.onended = () => {
    if (isPlaying) stopPlayback(true);
  };
  startedAt = ctx.currentTime;
  isPlaying = true;
  source.start(0, Math.min(offset, Math.max(0, buffer.duration - 0.02)));
  playIcon.textContent = 'Ⅱ';
  playButton.setAttribute('aria-label', 'Pause');
  setStatus(`Playing with ${presets.find((p) => p.dataset.preset === selectedPreset).querySelector('strong').textContent.toLowerCase()}.`);
  refreshProgress();
}
function choosePreset(name) {
  selectedPreset = name;
  presets.forEach((button) => {
    const active = button.dataset.preset === name;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (isPlaying) {
    const elapsed = (getAudioContext().currentTime - startedAt) * presetSettings[selectedPreset].rate;
    offset += elapsed;
    startPlayback().catch((error) => setStatus(`Could not play audio: ${error.message}`));
  }
}
chooseButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  stopPlayback();
  setStatus('Loading audio…');
  try {
    const data = await file.arrayBuffer();
    buffer = await getAudioContext().decodeAudioData(data);
    offset = 0;
    $('#track-name').textContent = file.name;
    $('#track-detail').textContent = `${formatTime(buffer.duration)} · Ready to play`;
    $('#duration').textContent = formatTime(buffer.duration);
    $('#current-time').textContent = '0:00';
    seek.value = '0';
    seek.disabled = false;
    playButton.disabled = false;
    setStatus('Track ready. Choose a vibe and press play.');
  } catch (error) {
    buffer = null;
    playButton.disabled = true;
    setStatus('This audio file could not be opened. Try MP3, WAV, or M4A.');
    console.error('Audio decode failed', error);
  }
});
playButton.addEventListener('click', () => {
  if (isPlaying) {
    offset += (getAudioContext().currentTime - startedAt) * presetSettings[selectedPreset].rate;
    stopPlayback();
    setStatus('Paused.');
  } else {
    startPlayback().catch((error) => setStatus(`Could not start audio: ${error.message}`));
  }
});
seek.addEventListener('input', () => {
  if (!buffer) return;
  offset = (Number(seek.value) / 1000) * buffer.duration;
  $('#current-time').textContent = formatTime(offset);
  if (isPlaying) startPlayback().catch((error) => setStatus(`Could not seek: ${error.message}`));
});
presets.forEach((button) => button.addEventListener('click', () => choosePreset(button.dataset.preset)));
$('#volume').addEventListener('input', (event) => {
  volume = Number(event.target.value) / 100;
  $('#volume-value').textContent = `${event.target.value}%`;
  if (nodes?.master && audioContext) nodes.master.gain.setTargetAtTime(volume, audioContext.currentTime, 0.02);
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Offline support unavailable', error)));
}
