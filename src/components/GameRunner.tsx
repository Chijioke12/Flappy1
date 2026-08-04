import { useEffect, useRef, useState } from 'preact/hooks';
import * as GameData from '../gameData';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function GameRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!GameData.GAME_JS || !GameData.GAME_DATA) {
      setError("Native artifacts not found. Please run the build script or use the GitHub Action to generate gameData.ts");
      setLoading(false);
      return;
    }

    const runGame = async () => {
      try {
        // 1. Setup Emscripten Module
        (window as any).Module = {
          canvas: canvasRef.current,
          print: (text: string) => console.log('emcc:', text),
          printErr: (text: string) => console.error('emcc:', text),
          onRuntimeInitialized: () => {
            setLoading(false);
          },
          setStatus: (text: string) => {
            if (!text) setLoading(false);
          }
        };

        // 2. Decode and inject data
        const dataBuffer = Uint8Array.from(atob(GameData.GAME_DATA!), c => c.charCodeAt(0));
        (window as any).Module.preRun = [() => {
           (window as any).Module.FS.writeFile('game.data', dataBuffer);
        }];

        // 3. Inject JS
        const script = document.createElement('script');
        script.textContent = atob(GameData.GAME_JS!);
        document.body.appendChild(script);

      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    runGame();
  }, []);

  if (error) {
    return (
      <div className="section" style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
        <h2 style={{ color: '#ef4444' }}><AlertCircle /> Native Error</h2>
        <p style={{ fontSize: '0.875rem' }}>{error}</p>
        <div className="code-block" style={{ color: '#ef4444', background: '#fee2e2' }}>
          Check src/gameData.ts
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '240px', height: '320px', background: '#000', margin: '0 auto' }}>
      {loading && (
        <div className="overlay" style={{ background: '#171717' }}>
          <Loader2 className="animate-spin" size={32} />
          <p style={{ marginTop: '12px' }}>Loading Native Binary...</p>
        </div>
      )}
      <canvas 
        id="canvas" 
        ref={canvasRef} 
        width={240} 
        height={320} 
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
