// Parte de AppearanceEditor: Tienda publica.
import EvolutionInput from '../EvolutionInput';
import MediaField from '../MediaField';
import { ColorField } from './LinkListEditor.jsx';
import { DEFAULT_STOREFRONT_LIGHT_THEME } from '../../../../utils/storefrontTheme';
import { Sun } from '@phosphor-icons/react';
import { ThemeModeButton } from './LinkListEditor.jsx';

export default function AppearanceEditorTiendaPublica({ branding, handleLogoUpload, logoUploading, resetStorefrontTheme, storefrontPreview, theme, updateBranding, updateTheme }) {
    return (
        <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Tienda publica</h3>
                <p className="text-xs text-zinc-500">
                    Este tema se aplica a home, catalogo, producto, carrito, checkout, login y registro del cliente.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-1">
                <ThemeModeButton
                    active={true}
                    icon={<Sun size={16} weight="bold" />}
                    title="Claro"
                    description="Modo principal de la tienda. Puedes modificar los colores libremente."
                    onClick={() => {}}
                />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Paleta base interactiva</p>
                        <p className="text-xs text-zinc-500">Haz clic en los colores para personalizarlos.</p>
                    </div>
                    <button
                        type="button"
                        onClick={resetStorefrontTheme}
                        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                        title="Vuelve los colores a los valores predeterminados"
                    >
                        Restablecer paleta
                    </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    <ColorField
                        label="Acento"
                        value={storefrontPreview.primary}
                        onChange={(val) => updateTheme({ mode: 'light', primary: val, accent: val })}
                    />
                    <ColorField
                        label="Fondo"
                        value={storefrontPreview.background}
                        onChange={(val) => updateTheme({ mode: 'light', background: val })}
                    />
                    <ColorField
                        label="Texto"
                        value={storefrontPreview.text}
                        onChange={(val) => updateTheme({ mode: 'light', text: val })}
                    />
                    <ColorField
                        label="Texto sec."
                        value={storefrontPreview.secondary}
                        onChange={(val) => updateTheme({ mode: 'light', secondary: val })}
                    />
                    <ColorField
                        label="Paneles"
                        value={storefrontPreview.catalog.panel_bg}
                        onChange={(val) => updateTheme({
                            mode: 'light',
                            catalog: {
                                ...(theme.catalog || DEFAULT_STOREFRONT_LIGHT_THEME.catalog),
                                panel_bg: val
                            }
                        })}
                    />
                    <ColorField
                        label="Cartas"
                        value={storefrontPreview.catalog.card_bg}
                        onChange={(val) => updateTheme({
                            mode: 'light',
                            catalog: {
                                ...(theme.catalog || DEFAULT_STOREFRONT_LIGHT_THEME.catalog),
                                card_bg: val
                            }
                        })}
                    />
                </div>
            </div>

            <EvolutionInput
                label="Nombre de la empresa"
                value={branding.name || ''}
                onChange={(e) => updateBranding({ name: e.target.value })}
                placeholder="Ej: Tu empresa"
                helperText="Se usa como marca principal en la tienda y como fallback en el admin."
            />

            <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">Plantilla base</p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                            Activa el preset visual base para navbar, footer, catalogo y panel.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateBranding({ design_preset: 'sanitarios_industrial', catalog_cards: [] })}
                        className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                            branding.design_preset === 'sanitarios_industrial'
                                ? 'bg-orange-500 text-white'
                                : 'border border-orange-400/30 text-orange-200'
                        }`}
                    >
                        {branding.design_preset === 'sanitarios_industrial' ? 'Base activa' : 'Activar base'}
                    </button>
                </div>
            </div>

            <MediaField
                label="Logo de la tienda"
                value={branding.logo_url || ''}
                onChange={(value) => updateBranding({ logo_url: value })}
                onFile={handleLogoUpload}
                busy={logoUploading}
                kind="image"
                hint="Mejor un PNG o SVG sin fondo. Se ve en el menú de arriba y en el pie."
            />
        </section>
    );
}
