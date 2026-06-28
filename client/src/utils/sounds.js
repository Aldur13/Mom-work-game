let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

export function playLock() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.frequency.value = 520;
  g.gain.setValueAtTime(0.22, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.start();
  osc.stop(c.currentTime + 0.12);
}

export function playCorrect() {
  const c = getCtx();
  if (!c) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.frequency.value = freq;
    const t = c.currentTime + i * 0.1;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.22);
  });
}

export function playWrong() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(250, c.currentTime);
  osc.frequency.linearRampToValueAtTime(100, c.currentTime + 0.28);
  g.gain.setValueAtTime(0.18, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28);
  osc.start();
  osc.stop(c.currentTime + 0.28);
}

export function playReveal() {
  const c = getCtx();
  if (!c) return;
  [392, 523, 659, 880].forEach((freq, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.frequency.value = freq;
    const t = c.currentTime + i * 0.09;
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
