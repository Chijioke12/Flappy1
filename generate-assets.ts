import Jimp from 'jimp';
import shell from 'shelljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAssets() {
  const assetsDir = path.join(__dirname, 'public', 'assets');
  shell.mkdir('-p', assetsDir);

  console.log('Attempting to run Python asset generator...');
  const pyResult = shell.exec('python3 flappy_complete_generator.py');

  if (pyResult.code === 0) {
    console.log('Python generator succeeded!');
    shell.cp('-r', 'flappy_assets/*', assetsDir);
    return;
  }

  console.warn('Python generator failed (missing dependencies?). Generating fallback assets with Jimp...');

  // Fallback: Generate basic assets
  const createPlaceholder = async (name: string, w: number, h: number, color: number) => {
    const image = new Jimp(w, h, color);
    await image.writeAsync(path.join(assetsDir, name));
  };

  await Promise.all([
    createPlaceholder('bird_mid.png', 34, 24, 0xFFFF00FF), // Yellow
    createPlaceholder('bird_up.png', 34, 24, 0xFFFF00FF),
    createPlaceholder('bird_down.png', 34, 24, 0xFFFF00FF),
    createPlaceholder('pipe_top.png', 52, 320, 0x00FF00FF), // Green
    createPlaceholder('pipe_bottom.png', 52, 320, 0x00FF00FF),
    createPlaceholder('base.png', 336, 112, 0xDED895FF), // Ground color
    createPlaceholder('background_day.png', 288, 512, 0x70C5CEFF), // Sky blue
  ]);

  console.log('Fallback assets generated in', assetsDir);
}

generateAssets().catch(console.error);
