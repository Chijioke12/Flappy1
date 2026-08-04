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

  console.log('High-fidelity assets generated in', assetsDir);
}

generateAssets().catch(console.error);
