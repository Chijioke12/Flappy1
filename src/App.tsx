import { useState, useEffect, useRef } from 'preact/hooks';
import { Bird, Play, RefreshCw, Github, FileCode, Package, Layers, Cpu, Monitor } from 'lucide-react';
import GameRunner from './components/GameRunner';

export default function App() {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [mode, setMode] = useState<'sim' | 'native'>('sim');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Constants matching the C implementation
  const SCREEN_WIDTH = 240;
  const SCREEN_HEIGHT = 320;
  const GRAVITY = 0.25;
  const JUMP_STRENGTH = -4.5;
  const PIPE_SPEED = 2;
  const PIPE_GAP = 100;

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let birdY = SCREEN_HEIGHT / 2;
    let birdV = 0;
    let pipes = [
      { x: 400, top: 150, scored: false },
      { x: 600, top: 200, scored: false },
      { x: 800, top: 100, scored: false }
    ];
    let currentScore = 0;

    let animationFrameId: number;

    const loop = () => {
      // Logic
      birdV += GRAVITY;
      birdY += birdV;

      if (birdY < 0 || birdY > SCREEN_HEIGHT - 20) {
        setGameOver(true);
        return;
      }

      pipes = pipes.map(p => ({ ...p, x: p.x - PIPE_SPEED }));
      if (pipes[0].x < -52) {
        pipes.shift();
        pipes.push({ x: pipes[pipes.length - 1].x + 200, top: Math.random() * 200 + 100, scored: false });
      }

      // Collision & Score
      pipes.forEach(p => {
        if (p.x < 50 + 34 && p.x + 52 > 50) {
          if (birdY < p.top || birdY + 24 > p.top + PIPE_GAP) {
            setGameOver(true);
          }
        }
        if (p.x + 52 < 50 && !p.scored) {
          p.scored = true;
          currentScore++;
          setScore(currentScore);
        }
      });

      // Render
      ctx.fillStyle = '#70C5CE'; // Sky Blue
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // Pipes
      ctx.fillStyle = '#22c55e'; // Green
      pipes.forEach(p => {
        ctx.fillRect(p.x, 0, 52, p.top);
        ctx.fillRect(p.x, p.top + PIPE_GAP, 52, SCREEN_HEIGHT);
      });

      // Bird
      ctx.fillStyle = '#fbbf24'; // Yellow
      ctx.fillRect(50, birdY, 34, 24);

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameStarted, gameOver]);

  const handleAction = () => {
    if (gameOver) {
      setGameOver(false);
      setScore(0);
      setGameStarted(true);
    } else if (!gameStarted) {
      setGameStarted(true);
    }
  };

  return (
    <div className="container">
      <div className="game-container">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setMode('sim')}
            className={`btn ${mode === 'sim' ? '' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', backgroundColor: mode === 'sim' ? '#000' : 'transparent', color: mode === 'sim' ? '#fff' : '#666', borderRadius: '6px' }}
          >
            <Monitor size={16} /> SIM
          </button>
          <button 
            onClick={() => setMode('native')}
            className={`btn ${mode === 'native' ? '' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', backgroundColor: mode === 'native' ? '#000' : 'transparent', color: mode === 'native' ? '#fff' : '#666', borderRadius: '6px' }}
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
                style={{ cursor: 'pointer', width: '100%', height: '100%' }}
              />
              
              {!gameStarted && (
                <div className="overlay">
                  <Bird size={48} style={{ marginBottom: '12px' }} />
                  <h1 style={{ fontSize: '1.5rem' }}>Flappy C</h1>
                  <p style={{ color: 'white', opacity: 0.8, marginBottom: '16px', fontSize: '0.75rem' }}>Preview Simulation</p>
                  <button 
                    onClick={() => setGameStarted(true)}
                    className="btn"
                    style={{ backgroundColor: '#22c55e', borderRadius: '999px', padding: '8px 20px' }}
                  >
                    <Play size={16} fill="currentColor" /> START
                  </button>
                </div>
              )}

              {gameOver && (
                <div className="overlay" style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <h2 style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px' }}>GAME OVER</h2>
                  <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px' }}>{score}</div>
                  <button 
                    onClick={() => { setGameOver(false); setScore(0); setGameStarted(true); }}
                    className="btn"
                    style={{ backgroundColor: '#ffffff', color: '#000000', borderRadius: '999px', padding: '8px 20px' }}
                  >
                    <RefreshCw size={16} /> RESTART
                  </button>
                </div>
              )}

              <div className="score-display" style={{ top: '16px', fontSize: '3rem' }}>
                {score}
              </div>
            </>
          ) : (
            <GameRunner />
          )}
        </div>
        
        <p style={{ marginTop: '16px', color: '#666', fontSize: '0.875rem', fontStyle: 'italic' }}>
          {mode === 'sim' ? 'Click simulation area to jump' : 'Compiled C code (KaiOS Target)'}
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
                <span style={{ color: '#666' }}>Pure C source with SDL2 logic</span>
              </li>
              <li className="file-item">
                <span className="code-tag">build-wasm.yml</span>
                <span style={{ color: '#666' }}>GitHub Actions CI/CD workflow</span>
              </li>
              <li className="file-item">
                <span className="code-tag">generate-assets.ts</span>
                <span style={{ color: '#666' }}>Hybrid asset generation engine</span>
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
