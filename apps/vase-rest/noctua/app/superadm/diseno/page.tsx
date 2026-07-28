'use client';

import { useEffect, useState } from 'react';
import { useSuperAdmStore } from '@/store/superadmStore';
import { ColorPickerField } from '@/components/superadm/shared/ColorPickerField';
import { Palette, Type, Eye, RotateCcw, Sun, Moon } from 'lucide-react';

const PRESETS = {
  dark: {
    colors: {
      primary: '#8b5cf6', accent: '#f59e0b', background: '#080808', surface: '#151515',
      text: '#ffffff', textSecondary: '#676b67', danger: '#dc2626', success: '#16a34a', warning: '#fbbf24'
    }
  },
  light: {
    colors: {
      primary: '#4f46e5', accent: '#f59e0b', background: '#ffffff', surface: '#f3f4f6',
      text: '#0f172a', textSecondary: '#6b7280', danger: '#dc2626', success: '#16a34a', warning: '#fbbf24'
    }
  }
};

const FONTS = ['Inter', 'Geist', 'Roboto', 'Poppins', 'Lato', 'Nunito', 'DM Sans'];

export default function SuperAdmDisenoPage() {
  const { config, isDirty, saveAll, discardChanges, updateTheme, initializeConfig, updateDashboardText } = useSuperAdmStore();
  const [tab, setTab] = useState<'colores' | 'tipografia' | 'textos' | 'preview'>('colores');
  const [liveStyles, setLiveStyles] = useState(true);

  useEffect(() => {
    const load = async () => {
      await initializeConfig();
    };
    load();
  }, []);

  const applyLiveStyles = () => {
    if (!liveStyles) return;
    const root = document.documentElement;
    
    // Apply colors
    Object.entries(config.theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Apply typography
    root.style.setProperty('--font-family', config.theme.typography.fontFamily);
    root.style.setProperty('--font-size-base', `${config.theme.typography.baseSize}px`);
    root.style.setProperty('--heading-weight', `${config.theme.typography.headingWeight}`);
  };

  useEffect(() => { applyLiveStyles(); }, [config.theme, liveStyles]);

  const colorKeys = Object.keys(config.theme.colors) as Array<keyof typeof config.theme.colors>;

  const isDark = config.theme.colors.background === PRESETS.dark.colors.background;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Diseño Global
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
            Personaliza la apariencia del sistema
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setLiveStyles(!liveStyles)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              liveStyles ? 'border-violet-500 bg-violet-500/10' : ''
            }`}
            style={{ 
              borderColor: liveStyles ? config.theme.colors.primary : 'var(--color-surface)',
              color: 'var(--color-text)'
            }}
          >
            {liveStyles ? <Eye size={16} /> : <Eye size={16} className="opacity-50" />}
            {liveStyles ? 'Previsualización activa' : 'Previsualización inactiva'}
          </button>
          {isDirty && (
            <>
              <button 
                onClick={discardChanges} 
                className="px-4 py-2 rounded-lg border transition-all"
                style={{ 
                  borderColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
              >
                Descartar
              </button>
              <button 
                onClick={saveAll} 
                className="px-6 py-2 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: config.theme.colors.primary }}
              >
                Guardar y aplicar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b" style={{ borderColor: 'var(--color-surface)' }}>
        <button
          onClick={() => setTab('colores')}
          className={`pb-3 border-b-2 transition-all`}
          style={{ 
            borderColor: tab === 'colores' ? config.theme.colors.primary : 'transparent',
            color: tab === 'colores' ? config.theme.colors.primary : 'var(--color-textSecondary)'
          }}
        >
          <Palette className="inline mr-2" size={20} /> Colores
        </button>
        <button
          onClick={() => setTab('tipografia')}
          className={`pb-3 border-b-2 transition-all`}
          style={{ 
            borderColor: tab === 'tipografia' ? config.theme.colors.primary : 'transparent',
            color: tab === 'tipografia' ? config.theme.colors.primary : 'var(--color-textSecondary)'
          }}
        >
          <Type className="inline mr-2" size={20} /> Tipografía
        </button>
        <button
          onClick={() => setTab('textos')}
          className={`pb-3 border-b-2 transition-all`}
          style={{ 
            borderColor: tab === 'textos' ? config.theme.colors.primary : 'transparent',
            color: tab === 'textos' ? config.theme.colors.primary : 'var(--color-textSecondary)'
          }}
        >
          <Type className="inline mr-2" size={20} /> Textos del Dashboard
        </button>
        <button
          onClick={() => setTab('preview')}
          className={`pb-3 border-b-2 transition-all`}
          style={{ 
            borderColor: tab === 'preview' ? config.theme.colors.primary : 'transparent',
            color: tab === 'preview' ? config.theme.colors.primary : 'var(--color-textSecondary)'
          }}
        >
          <Eye className="inline mr-2" size={20} /> Vista previa
        </button>
      </div>

      {tab === 'textos' && (
        <div className="grid gap-6">
          {Object.entries(config.theme.dashboardTexts || {}).map(([section, texts]) => (
            <div 
              key={section} 
              className="p-6 rounded-2xl border"
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                borderColor: 'var(--color-surface)'
              }}
            >
              <h3 className="text-lg font-bold mb-4 capitalize" style={{ color: 'var(--color-text)' }}>
                {section}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-textSecondary)' }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={texts?.title || ''}
                    onChange={(e) => updateDashboardText(section, { title: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 border transition-all focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: 'var(--color-background)', 
                      borderColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      outlineColor: config.theme.colors.primary
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-textSecondary)' }}>
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={texts?.subtitle || ''}
                    onChange={(e) => updateDashboardText(section, { subtitle: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 border transition-all focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: 'var(--color-background)', 
                      borderColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      outlineColor: config.theme.colors.primary
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'colores' && (
        <div className="grid gap-6">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => updateTheme({ colors: PRESETS.dark.colors })}
              className="px-4 py-2 rounded-lg border flex items-center gap-2 transition-all hover:opacity-90"
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                borderColor: 'var(--color-surface)',
                color: 'var(--color-text)'
              }}
            >
              <Moon size={16} /> Modo oscuro (predet.)
            </button>
            <button
              onClick={() => updateTheme({ colors: PRESETS.light.colors })}
              className="px-4 py-2 rounded-lg border flex items-center gap-2 transition-all hover:opacity-90"
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                borderColor: 'var(--color-surface)',
                color: 'var(--color-text)'
              }}
            >
              <Sun size={16} /> Modo claro
            </button>
            <button
              onClick={() => updateTheme({ colors: PRESETS.dark.colors })}
              className="px-4 py-2 rounded-lg border flex items-center gap-2 transition-all hover:opacity-90"
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                borderColor: 'var(--color-surface)',
                color: 'var(--color-text)'
              }}
            >
              <RotateCcw size={16} /> Resetear
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorKeys.map((key) => (
              <div 
                key={key} 
                className="p-4 rounded-2xl border flex items-center justify-between"
                style={{ 
                  backgroundColor: 'var(--color-surface)', 
                  borderColor: 'var(--color-surface)'
                }}
              >
                <span className="capitalize" style={{ color: 'var(--color-text)' }}>
                  {key}
                </span>
                <ColorPickerField
                  value={config.theme.colors[key]}
                  onChange={(v) => updateTheme({ colors: { ...config.theme.colors, [key]: v } })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tipografia' && (
        <div className="grid gap-6">
          <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface)' }}>
            <label className="text-sm mb-4 block" style={{ color: 'var(--color-textSecondary)' }}>
              Familia tipográfica
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {FONTS.map((font) => (
                <button
                  key={font} 
                  onClick={() => updateTheme({ typography: { ...config.theme.typography, fontFamily: font } })}
                  className={`p-4 rounded-xl border transition-all text-left`}
                  style={{ 
                    fontFamily: font, 
                    borderColor: config.theme.typography.fontFamily === font ? config.theme.colors.primary : 'var(--color-surface)',
                    backgroundColor: config.theme.typography.fontFamily === font ? `${config.theme.colors.primary}15` : 'transparent',
                    color: 'var(--color-text)'
                  }}
                >
                  <span className="font-bold">{font}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface)' }}>
              <label className="text-sm mb-4 block" style={{ color: 'var(--color-textSecondary)' }}>
                Peso de los títulos: {config.theme.typography.headingWeight}
              </label>
              <input
                type="range" min={100} max={900} step={100}
                value={config.theme.typography.headingWeight}
                onChange={(e) => updateTheme({
                  typography: { ...config.theme.typography, headingWeight: parseInt(e.target.value) }
                })}
                className="w-full"
              />
            </div>
            <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface)' }}>
              <label className="text-sm mb-4 block" style={{ color: 'var(--color-textSecondary)' }}>
                Tamaño base: {config.theme.typography.baseSize}px
              </label>
              <input
                type="range" min={12} max={20} step={1}
                value={config.theme.typography.baseSize}
                onChange={(e) => updateTheme({
                  typography: { ...config.theme.typography, baseSize: parseInt(e.target.value) }
                })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface)' }}>
          <h2 
            className="text-2xl font-bold mb-6" 
            style={{
              fontFamily: config.theme.typography.fontFamily, 
              fontWeight: config.theme.typography.headingWeight,
              color: 'var(--color-text)'
            }}
          >
            Vista previa
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <button 
                className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: config.theme.colors.primary }}
              >
                Botón principal
              </button>
              <button 
                className="px-6 py-3 rounded-xl border font-semibold transition-all hover:opacity-90"
                style={{ 
                  borderColor: config.theme.colors.primary,
                  color: config.theme.colors.primary
                }}
              >
                Botón secundario
              </button>
            </div>
            
            <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-surface)' }}>
              <h3 className="text-lg font-bold mb-2" style={{ 
                fontFamily: config.theme.typography.fontFamily, 
                fontWeight: config.theme.typography.headingWeight,
                color: 'var(--color-text)'
              }}>
                Título de ejemplo
              </h3>
              <p style={{ color: 'var(--color-textSecondary)' }}>
                Este es un párrafo de prueba para ver cómo se vería el texto normal.
              </p>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <span 
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{ 
                  backgroundColor: `${config.theme.colors.success}20`,
                  color: config.theme.colors.success
                }}
              >
                Éxito
              </span>
              <span 
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{ 
                  backgroundColor: `${config.theme.colors.danger}20`,
                  color: config.theme.colors.danger
                }}
              >
                Error
              </span>
              <span 
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{ 
                  backgroundColor: `${config.theme.colors.warning}20`,
                  color: config.theme.colors.warning
                }}
              >
                Aviso
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
