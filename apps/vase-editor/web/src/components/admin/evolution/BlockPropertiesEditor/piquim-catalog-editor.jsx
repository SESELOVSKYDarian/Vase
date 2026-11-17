// Parte de BlockPropertiesEditor: renderPiquimCatalogEditor.
import EvolutionInput from '../EvolutionInput';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';

/** Arma renderPiquimCatalogEditor con lo que necesita del componente. */
export function makeRenderPiquimCatalogEditor({ block, getArrayProp, handlePropChange, renderImageControl, updateObjectArrayItem }) {
    return () => {
        const cards = getArrayProp('cards');
        return (
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Catalogo por especialidad</SectionHeading>
                <div className="space-y-3">
                    <EvolutionInput label="Titulo" value={block.props?.title || ''} onChange={(e) => handlePropChange('title', e.target.value)} />
                    <EvolutionInput label="Titulo destacado (naranja)" value={block.props?.titleHighlight ?? 'Inspirate.'} onChange={(e) => handlePropChange('titleHighlight', e.target.value)} />
                    <EvolutionInput label="Texto superior derecho" value={block.props?.eyebrow ?? 'NUESTRO CATALOGO'} onChange={(e) => handlePropChange('eyebrow', e.target.value)} />
                    <EvolutionInput label="Subtitulo" value={block.props?.subtitle || ''} onChange={(e) => handlePropChange('subtitle', e.target.value)} multiline />
                    <EvolutionInput label="Texto del boton" value={block.props?.buttonLabel ?? 'VER CATALOGO'} onChange={(e) => handlePropChange('buttonLabel', e.target.value)} />
                    <p className="text-[11px] text-zinc-500">En la web se muestran las primeras 2 cards.</p>
                    {cards.map((card, index) => (
                        <div key={`cat-card-${index}`} className="space-y-2 rounded-xl border border-white/10 p-3">
                            <EvolutionInput label={`Card ${index + 1} titulo`} value={card?.title || ''} onChange={(e) => updateObjectArrayItem('cards', index, { title: e.target.value })} />
                            <EvolutionInput label="Prefijo" value={card?.prefix || ''} onChange={(e) => updateObjectArrayItem('cards', index, { prefix: e.target.value })} />
                            <EvolutionInput label="Categoria (slug o rubro, ej: heladeria)" value={card?.category || card?.categorySlug || ''} onChange={(e) => updateObjectArrayItem('cards', index, { category: e.target.value, categorySlug: e.target.value })} />
                            <EvolutionInput label="Tags (coma separada)" value={Array.isArray(card?.tags) ? card.tags.join(', ') : ''} onChange={(e) => updateObjectArrayItem('cards', index, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
                            <EvolutionInput label="Descripcion" value={card?.description || ''} onChange={(e) => updateObjectArrayItem('cards', index, { description: e.target.value })} multiline />
                            {renderImageControl({
                                label: 'Imagen',
                                value: card?.image,
                                uploadKey: `cat-image-${index}`,
                                onChange: (value) => updateObjectArrayItem('cards', index, { image: value }),
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };
}
