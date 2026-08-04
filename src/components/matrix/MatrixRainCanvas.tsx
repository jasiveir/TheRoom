import React, { useEffect, useRef } from 'react';

const CHAR_SETS = {
  katakana: 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン',
  hex: '0123456789ABCDEF',
  binary: '01',
  digits: '0123456789',
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  symbols: '+-*/=><%&#@$!?:;~§',
};

const ALL_CHARS = (
  CHAR_SETS.katakana +
  CHAR_SETS.hex +
  CHAR_SETS.digits +
  CHAR_SETS.latin +
  CHAR_SETS.symbols +
  CHAR_SETS.binary
).split('');

const getRandomChar = (): string => {
  return ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
};

export type MatrixTheme = 'crimson' | 'purple' | 'amber' | 'monochrome' | 'spectrum';

interface MatrixRainCanvasProps {
  isActive: boolean;
  theme?: MatrixTheme;
  fadePhase: 'idle' | 'fadeIn' | 'active' | 'fadeOut';
  isFullScreen?: boolean;
  onTransitionPeak?: () => void;
  onTransitionComplete?: () => void;
}

interface GridCell {
  x: number;
  y: number;
  char: string;
  speed: number;
  isHead: boolean;
}

export const MatrixRainCanvas: React.FC<MatrixRainCanvasProps> = ({
  isActive,
  theme = 'crimson',
  isFullScreen = false,
  onTransitionPeak,
  onTransitionComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peakFiredRef = useRef<boolean>(false);
  const completeFiredRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  const peakCbRef = useRef(onTransitionPeak);
  const completeCbRef = useRef(onTransitionComplete);

  useEffect(() => {
    peakCbRef.current = onTransitionPeak;
  }, [onTransitionPeak]);

  useEffect(() => {
    completeCbRef.current = onTransitionComplete;
  }, [onTransitionComplete]);

  const getColorScheme = (t: MatrixTheme) => {
    switch (t) {
      case 'spectrum':
        return {
          head: '#ffffff',
          headGlow: '#f97316',
          bodyHigh: '#22c55e',
          bodyMid: '#a855f7',
        };
      case 'purple':
        return {
          head: '#e879f9',
          headGlow: '#c084fc',
          bodyHigh: '#a855f7',
          bodyMid: '#7e22ce',
        };
      case 'amber':
        return {
          head: '#fbbf24',
          headGlow: '#d97706',
          bodyHigh: '#b45309',
          bodyMid: '#92400e',
        };
      case 'monochrome':
        return {
          head: '#ffffff',
          headGlow: '#e4e4e7',
          bodyHigh: '#a1a1aa',
          bodyMid: '#52525b',
        };
      case 'crimson':
      default:
        return {
          head: '#ff4d4d',
          headGlow: '#f87171',
          bodyHigh: '#dc2626',
          bodyMid: '#991b1b',
        };
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      peakFiredRef.current = false;
      completeFiredRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let gridCells: GridCell[] = [];
    const baseFontSize = window.innerWidth < 640 ? 14 : 18;

    const initGrid = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = isFullScreen ? window.innerHeight : Math.max(100, window.innerHeight - 64);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      const cols = Math.ceil(width / (baseFontSize * 0.85)) + 4;
      const rows = Math.ceil(height / baseFontSize) + 2;

      gridCells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          gridCells.push({
            x: c * (baseFontSize * 0.85),
            y: r * baseFontSize,
            char: getRandomChar(),
            speed: 0.8 + Math.random() * 0.8,
            isHead: Math.random() < 0.1,
          });
        }
      }
    };

    initGrid();
    window.addEventListener('resize', initGrid);

    startTimeRef.current = performance.now();
    peakFiredRef.current = false;
    completeFiredRef.current = false;

    const colors = getColorScheme((theme || 'crimson') as MatrixTheme);
    const halfDuration = 420; // 420ms left to right
    const totalDuration = 840; // Total 840ms (fast snappy execution)

    const render = (nowTime: number) => {
      const elapsed = nowTime - startTimeRef.current;
      const width = window.innerWidth;
      const height = isFullScreen ? window.innerHeight : Math.max(100, window.innerHeight - 64);

      let curtainX = 0;
      let phase: 'outward' | 'return' = 'outward';

      if (elapsed < halfDuration) {
        // Phase 1: Left to Right sweep (0 to 100% of width)
        phase = 'outward';
        const p = elapsed / halfDuration;
        curtainX = p * (width + 120);
      } else {
        // Phase 2: Peak reached, comeback sweep from Right to Left
        if (!peakFiredRef.current) {
          peakFiredRef.current = true;
          if (peakCbRef.current) {
            peakCbRef.current();
          }
        }
        phase = 'return';
        const p = (elapsed - halfDuration) / (totalDuration - halfDuration);
        curtainX = (1 - p) * (width + 120);
      }

      ctx.clearRect(0, 0, width, height);

      // Draw curtain overlay
      ctx.save();
      if (curtainX > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, Math.min(width, curtainX), height);
      }
      ctx.restore();

      // Render matrix code characters cleanly without heavy per-character strokeText or shadowBlur
      ctx.save();
      ctx.font = `700 ${baseFontSize}px monospace, 'Courier New', monospace`;
      ctx.textBaseline = 'top';
      ctx.shadowBlur = 0; // Disable heavy Gaussian blur filter in rendering loop for 60fps performance

      gridCells.forEach((cell) => {
        // Only render cells within the active curtain sweep area
        if (cell.x > curtainX + 50) return;

        // Random character mutation for active rain effect
        if (Math.random() < 0.08) {
          cell.char = getRandomChar();
        }

        const distToLead = Math.abs(cell.x - curtainX);
        let alpha = 1;
        if (distToLead > 250) {
          alpha = Math.max(0.15, 1 - (distToLead - 250) / 300);
        }

        if (alpha <= 0.02) return;

        ctx.globalAlpha = alpha;

        // Fill character color based on theme
        if (theme === 'spectrum') {
          const SPECTRUM_COLORS = ['#f97316', '#22c55e', '#eab308', '#3b82f6', '#ec4899', '#a855f7'];
          const colorIdx = Math.floor((cell.x * 0.02 + cell.y * 0.05 + elapsed * 0.003)) % SPECTRUM_COLORS.length;
          const curColor = SPECTRUM_COLORS[(colorIdx + SPECTRUM_COLORS.length) % SPECTRUM_COLORS.length];
          if (distToLead < 40 || cell.isHead) {
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.fillStyle = curColor;
          }
        } else if (distToLead < 40 || cell.isHead) {
          ctx.fillStyle = colors.head;
        } else if (distToLead < 140) {
          ctx.fillStyle = colors.bodyHigh;
        } else {
          ctx.fillStyle = colors.bodyMid;
        }

        ctx.fillText(cell.char, cell.x, cell.y);
      });

      // Leading edge glow beam line
      if (curtainX > 0 && curtainX < width + 100) {
        ctx.save();
        ctx.strokeStyle = colors.head;
        ctx.shadowColor = colors.headGlow;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(curtainX, 0);
        ctx.lineTo(curtainX, height);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      if (elapsed < totalDuration) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (!completeFiredRef.current) {
          completeFiredRef.current = true;
          if (completeCbRef.current) {
            completeCbRef.current();
          }
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', initGrid);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isActive, theme, isFullScreen]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed ${isFullScreen ? 'inset-0' : 'top-16 inset-x-0 bottom-0'} z-[9999] pointer-events-none select-none transition-opacity duration-200`}
      aria-hidden="true"
    />
  );
};
