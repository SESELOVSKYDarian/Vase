// Parte de BlockPropertiesEditor: renderAboutTeamEditor.
import EvolutionInput from '../EvolutionInput';
import { ColorField } from './SlideCard.jsx';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Image as ImageIcon } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';

/** Arma renderAboutTeamEditor con lo que necesita del componente. */
export function makeRenderAboutTeamEditor({ block, handlePropChange, handleStyleChange, renderImageControl }) {
    return () => {
        const overlayOpacity = Number.isFinite(Number(block.props?.styles?.overlayOpacity))
            ? Number(block.props.styles.overlayOpacity)
            : 0.25;
    
        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Bloque equipo</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput label="Titulo" value={block.props?.title || ''} onChange={(event) => handlePropChange('title', event.target.value)} placeholder="Ej: Equipo y liderazgo" />
                        <EvolutionInput
                            label="Cita"
                            value={block.props?.quote || ''}
                            onChange={(event) => handlePropChange('quote', event.target.value)}
                            placeholder="Mensaje o declaracion principal"
                            multiline
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput label="Autor" value={block.props?.author || ''} onChange={(event) => handlePropChange('author', event.target.value)} placeholder="Nombre" />
                            <EvolutionInput label="Rol" value={block.props?.role || ''} onChange={(event) => handlePropChange('role', event.target.value)} placeholder="Cargo" />
                        </div>
                        <EvolutionInput label="Ancla (id)" value={block.props?.anchor ?? 'equipo'} onChange={(event) => handlePropChange('anchor', event.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="equipo" />
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={ImageIcon}>Imagenes</SectionHeading>
                    <div className="space-y-4">
                        {renderImageControl({
                            label: 'Avatar',
                            value: block.props?.avatarImage,
                            uploadKey: 'about-team-avatar',
                            onChange: (value) => handlePropChange('avatarImage', value),
                        })}
                        {renderImageControl({
                            label: 'Imagen lateral',
                            value: block.props?.backgroundImage,
                            uploadKey: 'about-team-background',
                            onChange: (value) => handlePropChange('backgroundImage', value),
                        })}
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Texto" value={block.props?.styles?.textColor} defaultColor="#181411" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Overlay" value={block.props?.styles?.overlayColor} defaultColor="#000000" onChange={(value) => handleStyleChange('overlayColor', value)} />
                    </div>
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                            <span>Intensidad overlay</span>
                            <span className="admin-accent-text">{Math.round(overlayOpacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={Math.round(overlayOpacity * 100)}
                            onChange={(event) => handleStyleChange('overlayOpacity', Number(event.target.value) / 100)}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                        />
                    </div>
                </div>
            </>
        );
    };
}
