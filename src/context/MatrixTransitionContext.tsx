import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MatrixRainCanvas, MatrixTheme } from '../components/matrix/MatrixRainCanvas';
import { playMatrixTransitionSound } from '../lib/audio';
import { useLayoutTemplate } from './LayoutTemplateContext';

interface MatrixTransitionContextType {
  isActive: boolean;
  reduceMotion: boolean;
  matrixTheme: MatrixTheme;
  setMatrixTheme: (theme: MatrixTheme) => void;
  toggleReduceMotion: () => void;
  triggerMatrixTransition: (onSwitchContent?: () => void, durationMs?: number) => void;
}

const MatrixTransitionContext = createContext<MatrixTransitionContextType | undefined>(undefined);

export const MatrixTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [fadePhase, setFadePhase] = useState<'idle' | 'fadeIn' | 'active' | 'fadeOut'>('idle');
  const [matrixTheme, setMatrixThemeState] = useState<MatrixTheme>(() => {
    const saved = localStorage.getItem('privatechat_matrix_theme');
    if (saved === 'cyan') return 'purple';
    if (saved === 'emerald') return 'crimson';
    return (saved as MatrixTheme) || 'crimson';
  });

  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    const saved = localStorage.getItem('privatechat_reduce_motion');
    if (saved !== null) return JSON.parse(saved);
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const [peakCallback, setPeakCallback] = useState<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem('privatechat_matrix_theme', matrixTheme);
  }, [matrixTheme]);

  useEffect(() => {
    localStorage.setItem('privatechat_reduce_motion', JSON.stringify(reduceMotion));
  }, [reduceMotion]);

  const setMatrixTheme = (theme: MatrixTheme) => {
    setMatrixThemeState(theme);
  };

  const toggleReduceMotion = () => {
    setReduceMotion((prev) => !prev);
  };

  const triggerMatrixTransition = useCallback(
    (onSwitchContent?: () => void, durationMs: number = 700) => {
      // If reduce motion is enabled, perform quick fade fallback
      if (reduceMotion) {
        if (onSwitchContent) onSwitchContent();
        return;
      }

      // Avoid overlapping triggers
      if (isActive) {
        if (onSwitchContent) onSwitchContent();
        return;
      }

      setPeakCallback(() => onSwitchContent || null);
      setIsActive(true);
      setFadePhase('fadeIn');
      playMatrixTransitionSound();
    },
    [isActive, reduceMotion]
  );

  const handlePeak = useCallback(() => {
    if (peakCallback) {
      peakCallback();
      setPeakCallback(null);
    }
    setFadePhase('fadeOut');
  }, [peakCallback]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    setFadePhase('idle');
  }, []);

  const { template } = useLayoutTemplate();
  const activeMatrixTheme = template?.id === 'apple-glass' ? 'spectrum' : matrixTheme;

  return (
    <MatrixTransitionContext.Provider
      value={{
        isActive,
        reduceMotion,
        matrixTheme,
        setMatrixTheme,
        toggleReduceMotion,
        triggerMatrixTransition,
      }}
    >
      {children}

      {/* Matrix Rain Transition Canvas */}
      <MatrixRainCanvas
        isActive={isActive}
        theme={activeMatrixTheme}
        fadePhase={fadePhase}
        onTransitionPeak={handlePeak}
        onTransitionComplete={handleComplete}
      />

      {/* Subtle screen flash overlay to enhance depth during cascade */}
      {isActive && (
        <div
          className={`fixed top-16 inset-x-0 bottom-0 z-[9998] pointer-events-none bg-black/60 transition-opacity duration-300 ${
            fadePhase === 'fadeIn' ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      )}
    </MatrixTransitionContext.Provider>
  );
};

export const useMatrixTransition = () => {
  const context = useContext(MatrixTransitionContext);
  if (!context) {
    throw new Error('useMatrixTransition must be used within MatrixTransitionProvider');
  }
  return context;
};
