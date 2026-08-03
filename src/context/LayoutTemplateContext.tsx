import React, { createContext, useContext, useState } from 'react';

export type WebUiStyleId = 'classic' | 'apple-glass';

export interface WebUiStyleConfig {
  id: WebUiStyleId;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  bgMain: string;
  bgSidebar: string;
  bgNavbar: string;
  bgCard: string;
  borderMain: string;
  textPrimary: string;
  textSecondary: string;
  accentText: string;
  activeTabBg: string;
  activeTabText: string;
  cardGlow: string;
  isGlass: boolean;
}

export const WEB_UI_STYLES: Record<WebUiStyleId, WebUiStyleConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Room UI (Default)',
    badge: 'CLASSIC',
    tagline: 'High-contrast monochrome & crisp warm-neutral canvas',
    description: 'Clean, minimalist black & white layout with ultra-sharp contrast, solid surfaces, and instant clarity.',
    bgMain: 'bg-[#fbfaf6]',
    bgSidebar: 'bg-[#f5f3eb]',
    bgNavbar: 'bg-white',
    bgCard: 'bg-white',
    borderMain: 'border-[#e2dfd2]',
    textPrimary: 'text-black',
    textSecondary: 'text-zinc-600',
    accentText: 'text-emerald-500',
    activeTabBg: 'bg-black',
    activeTabText: 'text-white font-bold',
    cardGlow: 'shadow-xs',
    isGlass: false,
  },
  'apple-glass': {
    id: 'apple-glass',
    name: 'Chrome Vyse',
    badge: 'CHROME VYSE',
    tagline: 'Retro Classic UI with auto-changing ambient spectrum color transitions',
    description: 'Same solid monochrome canvas as Classic UI featuring retro UI badges, distinct section outlines, and auto-changing ambient color spectrum transitions (Orange, Green, Yellow, Blue, Pink & Purple).',
    bgMain: 'bg-[#fbfaf6]',
    bgSidebar: 'bg-[#f5f3eb]',
    bgNavbar: 'bg-white',
    bgCard: 'bg-white',
    borderMain: 'border-[#121212]',
    textPrimary: 'text-black',
    textSecondary: 'text-zinc-600',
    accentText: 'text-orange-500',
    activeTabBg: 'animate-spectrum-bg',
    activeTabText: 'text-white font-bold',
    cardGlow: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)]',
    isGlass: false,
  },
};

// Backwards-compatible aliases for existing imports
export type LayoutTemplateId = WebUiStyleId;
export type LayoutTemplateConfig = WebUiStyleConfig;
export const LAYOUT_TEMPLATES = WEB_UI_STYLES;

interface WebUiStyleContextType {
  templateId: WebUiStyleId;
  template: WebUiStyleConfig;
  setLayoutTemplate: (id: WebUiStyleId) => void;
}

const LayoutTemplateContext = createContext<WebUiStyleContextType | undefined>(undefined);

export const LayoutTemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [templateId, setTemplateIdState] = useState<WebUiStyleId>(() => {
    const saved = localStorage.getItem('theroom_web_ui_style');
    if (saved && (saved === 'classic' || saved === 'apple-glass')) {
      return saved as WebUiStyleId;
    }
    return 'classic';
  });

  const setLayoutTemplate = (id: WebUiStyleId) => {
    setTemplateIdState(id);
    localStorage.setItem('theroom_web_ui_style', id);
  };

  const template = WEB_UI_STYLES[templateId] || WEB_UI_STYLES.classic;

  return (
    <LayoutTemplateContext.Provider value={{ templateId, template, setLayoutTemplate }}>
      {children}
    </LayoutTemplateContext.Provider>
  );
};

export const useLayoutTemplate = () => {
  const context = useContext(LayoutTemplateContext);
  if (!context) {
    throw new Error('useLayoutTemplate must be used within a LayoutTemplateProvider');
  }
  return context;
};
