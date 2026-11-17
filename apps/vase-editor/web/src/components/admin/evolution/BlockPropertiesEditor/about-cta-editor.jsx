// Parte de BlockPropertiesEditor: renderAboutCtaEditor.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import { ColorField } from './SlideCard.jsx';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { LinkSimple as LinkIcon } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';

/** Arma renderAboutCtaEditor con lo que necesita del componente. */
export function makeRenderAboutCtaEditor({ block, handlePropChange, handleStyleChange }) {
    return () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>CTA final</SectionHeading>
                <EvolutionInput
                    label="Titulo"
                    value={block.props?.title || ''}
                    onChange={(event) => handlePropChange('title', event.target.value)}
                    placeholder="Ej: Listo para dar el siguiente paso?"
                />
            </div>
    
            <div className={panelClass}>
                <SectionHeading icon={LinkIcon}>Enlaces</SectionHeading>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <EvolutionInput
                            label="Primario: texto"
                            value={block.props?.primaryLink?.label || ''}
                            onChange={(event) => handlePropChange('primaryLink', { ...(block.props?.primaryLink || {}), label: event.target.value })}
                            placeholder="Ej: Ver catalogo"
                        />
                        <LinkInput
                            label="Primario: link"
                            value={block.props?.primaryLink?.link || ''}
                            onChange={(event) => handlePropChange('primaryLink', { ...(block.props?.primaryLink || {}), link: event.target.value })}
                            placeholder="/catalog"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <EvolutionInput
                            label="Secundario: texto"
                            value={block.props?.secondaryLink?.label || ''}
                            onChange={(event) => handlePropChange('secondaryLink', { ...(block.props?.secondaryLink || {}), label: event.target.value })}
                            placeholder="Ej: Contacto"
                        />
                        <LinkInput
                            label="Secundario: link"
                            value={block.props?.secondaryLink?.link || ''}
                            onChange={(event) => handlePropChange('secondaryLink', { ...(block.props?.secondaryLink || {}), link: event.target.value })}
                            placeholder="/contact"
                        />
                    </div>
                </div>
            </div>
    
            <div className={panelClass}>
                <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                <div className="grid grid-cols-1 gap-2">
                    <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                    <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                    <ColorField label="Texto" value={block.props?.styles?.textColor} defaultColor="#181411" onChange={(value) => handleStyleChange('textColor', value)} />
                    <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('mutedColor', value)} />
                </div>
            </div>
        </>
    );
}
