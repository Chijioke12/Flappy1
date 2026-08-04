import { useState, useEffect, useRef } from 'preact/hooks';
import { Bird, Play, RefreshCw, Github, FileCode, Package, Layers, Cpu, Monitor } from 'lucide-react';
import GameRunner from './components/GameRunner';

type GameState = 'menu' | 'playing' | 'gameover';

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
  active: boolean;
}

interface GameImages {
  background: HTMLImageElement;
  pipeTop: HTMLImageElement;
  pipeBottom: HTMLImageElement;
  base: HTMLImageElement;
  birdUp: HTMLImageElement;
  birdMid: HTMLImageElement;
  birdDown: HTMLImageElement;
}

const SCREEN_WIDTH = 240;
const SCREEN_HEIGHT = 320;
const BIRD_X = 50;
const BIRD_W = 34;
const BIRD_H = 24;
const PIPE_W = 52;
const PIPE_GAP = 85;
const PIPE_SPEED = 1.8;
const GRAVITY = 0.28;
const FLAP_POWER = -5.2;
const BASE_H = 28;

class WebSoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Record<string, AudioBuffer> = {};

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  async preload() {
    this.init();
    const sounds = ['wing', 'point', 'hit', 'die', 'swoosh'];
    await Promise.all(
      sounds.map(async (sound) => {
        try {
          const res = await fetch(`/assets/sounds/${sound}.wav`);
          const arrayBuffer = await res.arrayBuffer();
          if (this.ctx) {
            const buffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[sound] = buffer;
          }
        } catch (e) {
          console.warn(`Failed to preload sound: ${sound}`, e);
        }
      })
    );
  }

  play(sound: string) {
    try {
      this.init();
      if (!this.ctx) return;

      const buffer = this.buffers[sound];
      if (buffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        return;
      }

      // Live fallback synthesizer matching mathematical models
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (sound === 'wing') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
      } else if (sound === 'point') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);

        setTimeout(() => {
          if (!this.ctx) return;
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1200, this.ctx.currentTime);
          gain2.gain.setValueAtTime(0.3, this.ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
          osc2.start();
          osc2.stop(this.ctx.currentTime + 0.18);
        }, 100);
      } else if (sound === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
      } else if (sound === 'die') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
      }
    } catch (err) {
      console.warn(`Audio playback error for ${sound}:`, err);
    }
  }
}

const loadImg = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
  });
};

const checkCollision = (bx: number, by: number, p: Pipe) => {
  // Matches game.c exact collision rect padding (BIRD_W - 6, BIRD_H - 4)
  const bRect = { x: bx, y: by, w: BIRD_W - 6, h: BIRD_H - 4 };
  const tRect = { x: p.x, y: 0, w: PIPE_W, h: p.gapY };
  const bPipeRect = { x: p.x, y: p.gapY + PIPE_GAP, w: PIPE_W, h: SCREEN_HEIGHT };

  const intersect = (
    r1: { x: number; y: number; w: number; h: number },
    r2: { x: number; y: number; w: number; h: number }
  ) => {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  };

  return intersect(bRect, tRect) || intersect(bRect, bPipeRect);
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const val = localStorage.getItem('flappy_highscore');
    return val ? parseInt(val, 10) : 0;
  });
  const [mode, setMode] = useState<'sim' | 'native'>('sim');
  const [images, setImages] = useState<GameImages | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundManagerRef = useRef<WebSoundManager | null>(null);

  // Core mutable game loop state to prevent any render lag and stay completely synced with 60 FPS
  const stateRef = useRef<{
    gameState: GameState;
    birdY: number;
    birdVel: number;
    birdFrame: number;
    baseScroll: number;
    pipes: Pipe[];
    lastFrameTime: number;
    lastPipeSpawn: number;
    score: number;
  }>({
    gameState: 'menu',
    birdY: 150,
    birdVel: 0,
    birdFrame: 0,
    baseScroll: 0,
    pipes: [],
    lastFrameTime: 0,
    lastPipeSpawn: 0,
    score: 0
  });

  // Preload graphics and audio
  useEffect(() => {
    soundManagerRef.current = new WebSoundManager();
    soundManagerRef.current.preload();

    Promise.all([
      loadImg('/assets/background_day.png'),
      loadImg('/assets/pipe_top.png'),
      loadImg('/assets/pipe_bottom.png'),
      loadImg('/assets/base.png'),
      loadImg('/assets/bird_up.png'),
      loadImg('/assets/bird_mid.png'),
      loadImg('/assets/bird_down.png')
    ]).then(([bg, pt, pb, base, bUp, bMid, bDown]) => {
      setImages({
        background: bg,
        pipeTop: pt,
        pipeBottom: pb,
        base,
        birdUp: bUp,
        birdMid: bMid,
        birdDown: bDown
      });
    });
  }, []);

  const handleAction = () => {
    const current = stateRef.current;
    if (current.gameState === 'menu') {
      current.gameState = 'playing';
      setGameState('playing');
      current.birdY = SCREEN_HEIGHT / 2 - 50;
      current.birdVel = FLAP_POWER;
      current.score = 0;
      setScore(0);
      current.baseScroll = 0;
      current.pipes = [];
      current.lastPipeSpawn = Date.now();
      soundManagerRef.current?.play('wing');
    } else if (current.gameState === 'playing') {
      current.birdVel = FLAP_POWER;
      soundManagerRef.current?.play('wing');
    } else if (current.gameState === 'gameover') {
      current.gameState = 'menu';
      setGameState('menu');
      current.score = 0;
      setScore(0);
      current.birdY = 150;
      current.birdVel = 0;
    }
  };

  // Canvas drawing
  const renderCanvas = (
    birdY: number,
    birdVel: number,
    birdFrame: number,
    baseScroll: number,
    pipes: Pipe[],
    currentGameState: GameState
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    if (images?.background) {
      ctx.drawImage(images.background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
      grad.addColorStop(0, '#70C5CE');
      grad.addColorStop(1, '#DEF3FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // Draw pipes
    pipes.forEach((p) => {
      if (!p.active) return;
      // Top pipe (cap at the bottom)
      if (images?.pipeTop) {
        ctx.drawImage(images.pipeTop, p.x, 0, PIPE_W, p.gapY);
      } else {
        ctx.fillStyle = '#73BF2E';
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, 0, PIPE_W, p.gapY);
      }

      // Bottom pipe (cap at the top)
      const bottomPipeY = p.gapY + PIPE_GAP;
      const bottomPipeH = SCREEN_HEIGHT - bottomPipeY - BASE_H;
      if (images?.pipeBottom) {
        ctx.drawImage(images.pipeBottom, p.x, bottomPipeY, PIPE_W, bottomPipeH);
      } else {
        ctx.fillStyle = '#73BF2E';
        ctx.fillRect(p.x, bottomPipeY, PIPE_W, bottomPipeH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, bottomPipeY, PIPE_W, bottomPipeH);
      }
    });

    // Draw scrolling base
    if (images?.base) {
      ctx.drawImage(images.base, baseScroll, SCREEN_HEIGHT - BASE_H, SCREEN_WIDTH, BASE_H);
      ctx.drawImage(images.base, baseScroll + SCREEN_WIDTH, SCREEN_HEIGHT - BASE_H, SCREEN_WIDTH, BASE_H);
    } else {
      ctx.fillStyle = '#DED895';
      ctx.fillRect(0, SCREEN_HEIGHT - BASE_H, SCREEN_WIDTH, BASE_H);
      ctx.fillStyle = '#7ED321';
      ctx.fillRect(0, SCREEN_HEIGHT - BASE_H, SCREEN_WIDTH, 12);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(0, SCREEN_HEIGHT - BASE_H, SCREEN_WIDTH, BASE_H);
    }

    // Draw bird (rotated based on velocity)
    ctx.save();
    ctx.translate(BIRD_X + 17, birdY + 12);
    let angle = birdVel * 3.0;
    if (angle > 30) angle = 30;
    if (angle < -30) angle = -30;
    ctx.rotate((angle * Math.PI) / 180);

    const birdImg =
      birdFrame === 0
        ? images?.birdUp
        : birdFrame === 1
        ? images?.birdMid
        : images?.birdDown;

    if (birdImg) {
      ctx.drawImage(birdImg, -17, -12, BIRD_W, BIRD_H);
    } else {
      ctx.fillStyle = '#FFDB00';
      ctx.fillRect(-17, -12, BIRD_W, BIRD_H);
      ctx.strokeRect(-17, -12, BIRD_W, BIRD_H);
    }
    ctx.restore();
  };

  // Primary animation loop C-accuracy simulation
  useEffect(() => {
    if (mode !== 'sim') return;

    let lastTime = performance.now();
    let frameTimer = 0;
    let animationFrameId: number;

    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;

      const current = stateRef.current;
      const currentGameState = current.gameState;

      // 1. Bird frames cycle every 120ms
      frameTimer += elapsed;
      if (frameTimer > 120) {
        current.birdFrame = (current.birdFrame + 1) % 3;
        frameTimer = 0;
      }

      if (currentGameState === 'menu') {
        current.birdY = SCREEN_HEIGHT / 2 - 50 + Math.sin(timestamp / 150) * 8;
        current.birdVel = 0;

        current.baseScroll -= PIPE_SPEED;
        if (current.baseScroll <= -SCREEN_WIDTH) {
          current.baseScroll = 0;
        }
      } else if (currentGameState === 'playing') {
        // Physics update matching game.c
        current.birdVel += GRAVITY;
        current.birdY += current.birdVel;

        current.baseScroll -= PIPE_SPEED;
        if (current.baseScroll <= -SCREEN_WIDTH) {
          current.baseScroll = 0;
        }

        // Spawn pipes every 1500ms
        const now = Date.now();
        if (now - current.lastPipeSpawn > 1500) {
          const minGap = 50;
          const maxGap = SCREEN_HEIGHT - BASE_H - PIPE_GAP - 50; // 157
          const gapY = minGap + Math.random() * (maxGap - minGap);
          current.pipes.push({
            x: SCREEN_WIDTH + 10,
            gapY,
            scored: false,
            active: true
          });
          current.lastPipeSpawn = now;
        }

        // Update pipes
        current.pipes = current.pipes.map((p) => {
          if (!p.active) return p;
          const nextX = p.x - PIPE_SPEED;

          let nextActive: boolean = p.active;
          if (nextX < -PIPE_W) {
            nextActive = false;
          }

          let nextScored: boolean = p.scored;
          if (!p.scored && nextX + PIPE_W < BIRD_X) {
            nextScored = true;
            soundManagerRef.current?.play('point');
            current.score += 1;
            setScore(current.score);
          }

          return {
            ...p,
            x: nextX,
            active: nextActive,
            scored: nextScored
          };
        });

        current.pipes = current.pipes.filter((p) => p.active);

        // Ground and ceiling collision
        let collision = false;
        if (current.birdY + BIRD_H >= SCREEN_HEIGHT - BASE_H || current.birdY <= 0) {
          collision = true;
        }

        // Pipes collision
        for (const p of current.pipes) {
          if (checkCollision(BIRD_X, current.birdY, p)) {
            collision = true;
            break;
          }
        }

        if (collision) {
          current.gameState = 'gameover';
          setGameState('gameover');
          soundManagerRef.current?.play('hit');
          setTimeout(() => {
            soundManagerRef.current?.play('die');
          }, 150);

          if (current.score > highScore) {
            setHighScore(current.score);
            localStorage.setItem('flappy_highscore', current.score.toString());
          }
        }
      } else if (currentGameState === 'gameover') {
        if (current.birdY + BIRD_H < SCREEN_HEIGHT - BASE_H) {
          current.birdVel += GRAVITY;
          current.birdY += current.birdVel;
        } else {
          current.birdY = SCREEN_HEIGHT - BASE_H - BIRD_H;
        }
      }

      renderCanvas(
        current.birdY,
        current.birdVel,
        current.birdFrame,
        current.baseScroll,
        current.pipes,
        currentGameState
      );

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, highScore]);

  // Handle keyboard mappings matching SDL key handler in game.c
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'sim') return;

      const actionKeys = [' ', 'ArrowUp', 'w', 'W', 'Enter'];
      if (actionKeys.includes(e.key)) {
        e.preventDefault();
        handleAction();
      }

      if (e.key === 'Escape' || e.key === 'F1') {
        e.preventDefault();
        const current = stateRef.current;
        if (current.gameState === 'gameover') {
          current.gameState = 'menu';
          setGameState('menu');
          current.score = 0;
          setScore(0);
          current.birdY = 150;
          current.birdVel = 0;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  return (
    <div className="container">
      <div className="game-container">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setMode('sim')}
            className={`btn ${mode === 'sim' ? '' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', backgroundColor: mode === 'sim' ? '#000' : 'transparent', color: mode === 'sim' ? '#fff' : '#666', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Monitor size={16} /> SIM
          </button>
          <button
            onClick={() => setMode('native')}
            className={`btn ${mode === 'native' ? '' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', backgroundColor: mode === 'native' ? '#000' : 'transparent', color: mode === 'native' ? '#fff' : '#666', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Cpu size={16} /> NATIVE (asm.js)
          </button>
        </div>

        <div className="game-canvas-wrapper" style={{ width: '240px', height: '320px' }}>
          {mode === 'sim' ? (
            <>
              <canvas
                ref={canvasRef}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                onClick={handleAction}
                style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}
              />

              {gameState === 'menu' && (
                <div className="overlay">
                  <Bird size={48} style={{ marginBottom: '12px', color: '#FFDB00' }} />
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Flappy C</h1>
                  <p style={{ color: 'white', opacity: 0.9, marginBottom: '16px', fontSize: '0.75rem', fontWeight: 600 }}>Simulation Preview</p>
                  <button
                    onClick={handleAction}
                    className="btn"
                    style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '999px', padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
                  >
                    <Play size={16} fill="currentColor" /> START
                  </button>
                </div>
              )}

              {gameState === 'gameover' && (
                <div className="overlay" style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <h2 style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 900, marginBottom: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>GAME OVER</h2>
                  <p style={{ fontSize: '0.75rem', color: '#a3a3a3', marginBottom: '8px' }}>High Score: {highScore}</p>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{score}</div>
                  <button
                    onClick={handleAction}
                    className="btn"
                    style={{ backgroundColor: '#ffffff', color: '#000000', border: 'none', borderRadius: '999px', padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
                  >
                    <RefreshCw size={16} /> RESTART
                  </button>
                </div>
              )}

              <div className="score-display" style={{ top: '16px', fontSize: '3rem', pointerEvents: 'none' }}>
                {score}
              </div>
            </>
          ) : (
            <GameRunner />
          )}
        </div>

        <p style={{ marginTop: '16px', color: '#666', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center' }}>
          {mode === 'sim' ? 'Click simulation area or press Space / Up / W / Enter' : 'Compiled C code (KaiOS Target)'}
        </p>
      </div>

      <div className="info-container">
        <header className="header">
          <h1>
            <Layers color="#15803d" />
            Flappy Bird C
          </h1>
          <p>
            A complete Flappy Bird implementation in C using SDL2, optimized for legacy browser compatibility (asm.js).
          </p>
        </header>

        <div className="grid">
          <section className="section">
            <h2>
              <FileCode color="#3b82f6" />
              Core Components
            </h2>
            <ul className="file-list">
              <li className="file-item">
                <span className="code-tag">game.c</span>
                <span style={{ color: '#666' }}>Pure C source with SDL2 & sound mixing</span>
              </li>
              <li className="file-item">
                <span className="code-tag">build-wasm.yml</span>
                <span style={{ color: '#666' }}>GitHub Actions CI/CD workflow</span>
              </li>
              <li className="file-item">
                <span className="code-tag">generate-assets.ts</span>
                <span style={{ color: '#666' }}>Hybrid asset and wave sound generator</span>
              </li>
            </ul>
          </section>

          <section className="section">
            <h2>
              <Package color="#f97316" />
              Build Targets
            </h2>
            <div className="badge-container">
              <span className="badge badge-blue">asm.js (ES5)</span>
              <span className="badge badge-green">240 x 320 px</span>
              <span className="badge badge-purple">Firefox 48 / KaiOS</span>
            </div>
          </section>

          <section className="dark-panel">
            <h2 style={{ color: '#ffffff', marginBottom: '12px' }}>
              <Github size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Deployment
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#a3a3a3', marginBottom: '16px' }}>
              The C code is ready to be compiled. Use the provided GitHub Actions workflow to generate the optimized asm.js bundle.
            </p>
            <div className="code-block">
              emcc game.c -O2 -s WASM=0 -s USE_SDL=2 ...
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
