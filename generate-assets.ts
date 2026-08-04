import { createCanvas, loadImage } from 'canvas';
import shell from 'shelljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAssets() {
  const assetsDir = path.join(__dirname, 'public', 'assets');
  shell.mkdir('-p', assetsDir);

  const drawBird = (wingState: 'up' | 'mid' | 'down', size = 128) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const YELLOW = '#FFDB00';
    const YELLOW_DARK = '#E6AC00';
    const YELLOW_LIGHT = '#FFF078';
    const OUTLINE = '#000000';
    const WHITE = '#FFFFFF';
    const BEAK = '#FF7C00';
    const BLUSH = 'rgba(255, 105, 180, 0.7)';

    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';

    // Tail
    ctx.fillStyle = YELLOW_DARK;
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(22, 66);
    ctx.lineTo(8, 58);
    ctx.lineTo(8, 76);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.ellipse(64, 62, 40, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.ellipse(50, 48, 20, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW_LIGHT;
    ctx.fill();

    // Belly
    ctx.beginPath();
    ctx.ellipse(61, 76, 29, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = WHITE;
    ctx.fill();
    ctx.stroke();

    // Wing
    ctx.fillStyle = YELLOW_DARK;
    ctx.beginPath();
    if (wingState === 'up') {
      ctx.moveTo(18, 38); ctx.lineTo(58, 30); ctx.lineTo(60, 50); ctx.lineTo(22, 58);
    } else if (wingState === 'mid') {
      ctx.moveTo(22, 50); ctx.lineTo(64, 48); ctx.lineTo(62, 74); ctx.lineTo(24, 76);
    } else {
      ctx.moveTo(26, 64); ctx.lineTo(68, 68); ctx.lineTo(60, 90); ctx.lineTo(28, 86);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Beak
    ctx.fillStyle = BEAK;
    ctx.beginPath();
    ctx.moveTo(86, 54); ctx.lineTo(118, 64); ctx.lineTo(86, 74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(86, 64); ctx.lineTo(104, 64);
    ctx.stroke();

    // Eye
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(77, 49, 17, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const pupilY = wingState === 'up' ? 49 : 53;
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.ellipse(79, pupilY, 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(78, pupilY - 4, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = BLUSH;
    ctx.beginPath();
    ctx.ellipse(58, 68, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  };

  const drawPipe = (isTop: boolean, width = 52, height = 320) => {
    const capH = 24;
    const capW = width + 8;
    const over = (capW - width) / 2;
    const canvas = createCanvas(capW, height);
    const ctx = canvas.getContext('2d');

    const GREEN = '#73BF2E';
    const GREEN_DARK = '#4C8C1E';
    const GREEN_LIGHT = '#A8E94F';
    const OUTLINE = '#000000';

    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;

    if (isTop) {
      // Body
      ctx.fillStyle = GREEN;
      ctx.fillRect(over, 0, width, height - capH);
      ctx.strokeRect(over, 0, width, height - capH);
      // Cap at the bottom
      ctx.fillRect(0, height - capH, capW, capH);
      ctx.strokeRect(0, height - capH, capW, capH);
      // Detail lines
      ctx.fillStyle = GREEN_LIGHT;
      ctx.fillRect(over + 4, 0, 6, height - capH);
    } else {
      // Cap at the top
      ctx.fillStyle = GREEN;
      ctx.fillRect(0, 0, capW, capH);
      ctx.strokeRect(0, 0, capW, capH);
      // Body
      ctx.fillRect(over, capH, width, height - capH);
      ctx.strokeRect(over, capH, width, height - capH);
      // Detail lines
      ctx.fillStyle = GREEN_LIGHT;
      ctx.fillRect(over + 4, capH, 6, height - capH);
    }

    return canvas;
  };

  const drawBase = (width = 240, height = 60) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Ground
    ctx.fillStyle = '#DED895';
    ctx.fillRect(0, 12, width, height - 12);
    
    // Grass top
    ctx.fillStyle = '#7ED321';
    ctx.fillRect(0, 0, width, 12);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
    
    return canvas;
  };

  const drawBackground = (w = 240, h = 320) => {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#70C5CE');
    grad.addColorStop(1, '#DEF3FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Add some clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const drawCloud = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.arc(x + 15, y - 10, 25, 0, Math.PI * 2);
      ctx.arc(x + 35, y, 20, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(40, 60);
    drawCloud(180, 40);
    drawCloud(100, 100);

    return canvas;
  };

  console.log('Generating high-fidelity assets using Canvas...');

  const birds = ['up', 'mid', 'down'].map(s => ({ name: `bird_${s}.png`, canvas: drawBird(s as any) }));
  const others = [
    { name: 'pipe_top.png', canvas: drawPipe(true) },
    { name: 'pipe_bottom.png', canvas: drawPipe(false) },
    { name: 'base.png', canvas: drawBase() },
    { name: 'background_day.png', canvas: drawBackground() }
  ];

  for (const asset of [...birds, ...others]) {
    const buffer = asset.canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, asset.name), buffer);
  }

  console.log('High-fidelity image assets generated in', assetsDir);

  // Generate sounds
  const soundsDir = path.join(assetsDir, 'sounds');
  shell.mkdir('-p', soundsDir);

  const SR = 44100;

  function envelope_adsr(n: number, a = 0.01, d = 0.05, s = 0.7, r = 0.1, sr = SR) {
    const a_n = Math.floor(a * sr);
    const d_n = Math.floor(d * sr);
    const r_n = Math.floor(r * sr);
    const s_n = Math.max(0, n - a_n - d_n - r_n);
    const env = new Float32Array(n);
    
    if (a_n > 0) {
      for (let i = 0; i < a_n; i++) env[i] = i / a_n;
    }
    if (d_n > 0) {
      for (let i = 0; i < d_n; i++) env[a_n + i] = 1 - (1 - s) * (i / d_n);
    }
    for (let i = 0; i < s_n; i++) {
      env[a_n + d_n + i] = s;
    }
    if (r_n > 0) {
      for (let i = 0; i < r_n; i++) env[a_n + d_n + s_n + i] = s * (1 - i / r_n);
    }
    return env;
  }

  function make_wing(): Float32Array {
    const dur = 0.12;
    const n = Math.floor(SR * dur);
    const audio = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const freq = 250 + (750 - 250) * (t / dur);
      phase += 2 * Math.PI * freq / SR;
      const wave = Math.sin(phase);
      const env = Math.exp(-t * 18) * (1 - Math.exp(-t * 80));
      audio[i] = wave * env * 0.8;
    }
    return audio;
  }

  function make_point(): Float32Array {
    const t1_dur = 0.08;
    const gap_dur = 0.02;
    const t2_dur = 0.18;
    
    const n1 = Math.floor(SR * t1_dur);
    const nGap = Math.floor(SR * gap_dur);
    const n2 = Math.floor(SR * t2_dur);
    
    const audio = new Float32Array(n1 + nGap + n2);
    
    // Tone 1
    for (let i = 0; i < n1; i++) {
      const t = i / SR;
      audio[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 6) * 0.6;
    }
    
    // Tone 2
    const env = envelope_adsr(n2, 0.005, 0.02, 0.6, 0.08);
    for (let i = 0; i < n2; i++) {
      const t = i / SR;
      const tone2 = Math.sin(2 * Math.PI * 1200 * t) * env[i] + 
                    0.3 * Math.sin(2 * Math.PI * 2400 * t) * env[i];
      audio[n1 + nGap + i] = tone2 * 0.6;
    }
    return audio;
  }

  function make_hit(): Float32Array {
    const dur = 0.25;
    const n = Math.floor(SR * dur);
    const audio = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const base = Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 12) + 
                   0.4 * Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 8);
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.5;
      audio[i] = Math.tanh((base + noise) * 1.5) * 0.8;
    }
    return audio;
  }

  function make_die(): Float32Array {
    const dur = 0.7;
    const n = Math.floor(SR * dur);
    const audio = new Float32Array(n);
    let phase = 0;
    const env = envelope_adsr(n, 0.01, 0.1, 0.5, 0.25);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const freq = 600 * Math.pow(80 / 600, t / dur);
      phase += 2 * Math.PI * freq / SR;
      const sine = Math.sin(phase);
      const wave = sine + 0.3 * Math.sign(sine);
      audio[i] = wave * env[i] * Math.exp(-t * 0.5) * 0.7;
    }
    return audio;
  }

  function make_swoosh(): Float32Array {
    const dur = 0.3;
    const n = Math.floor(SR * dur);
    const audio = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const noise = Math.random() * 2 - 1;
      const freq = 900 + (200 - 900) * (t / dur);
      phase += 2 * Math.PI * freq / SR;
      const carrier = Math.sin(phase);
      const wave = noise * 0.4 + carrier * 0.6;
      const env = Math.pow(Math.sin(Math.PI * t / dur), 0.8);
      audio[i] = wave * env * 0.6;
    }
    return audio;
  }

  function saveWav(filePath: string, channelData: Float32Array, sampleRate = 44100) {
    const numSamples = channelData.length;
    const bitsPerSample = 16;
    const numChannels = 1;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const subChunk2Size = numSamples * blockAlign;
    const chunkSize = 36 + subChunk2Size;

    const buffer = Buffer.alloc(44 + subChunk2Size);

    // RIFF Header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(chunkSize, 4);
    buffer.write('WAVE', 8);

    // "fmt " Subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // "data" Subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(subChunk2Size, 40);

    // PCM values
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
      buffer.writeInt16LE(Math.floor(val), offset);
      offset += 2;
    }

    fs.writeFileSync(filePath, buffer);
  }

  console.log('Generating mathematical WAV audio assets...');
  saveWav(path.join(soundsDir, 'wing.wav'), make_wing());
  saveWav(path.join(soundsDir, 'point.wav'), make_point());
  saveWav(path.join(soundsDir, 'hit.wav'), make_hit());
  saveWav(path.join(soundsDir, 'die.wav'), make_die());
  saveWav(path.join(soundsDir, 'swoosh.wav'), make_swoosh());

  console.log('All high-fidelity graphics and sound assets generated in', assetsDir);
}

generateAssets().catch(console.error);
