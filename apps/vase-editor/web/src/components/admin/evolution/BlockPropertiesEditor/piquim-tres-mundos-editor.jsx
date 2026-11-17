// Parte de BlockPropertiesEditor: renderPiquimTresMundosEditor.
import EvolutionInput from '../EvolutionInput';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { UploadButton } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';

/** Arma renderPiquimTresMundosEditor con lo que necesita del componente. */
export function makeRenderPiquimTresMundosEditor({ block, handleImageUpload, handlePropChange, uploadingTarget }) {
    return () => {
        const isPngValue = (value) => {
            const safe = String(value || '').trim().toLowerCase();
            return !safe || safe.startsWith('data:image/png') || safe.endsWith('.png');
        };
        const updatePngField = (key, value) => {
            if (!isPngValue(value)) return;
            handlePropChange(key, value);
        };
    
        return (
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Bloque destacado</SectionHeading>
                <div className="space-y-3">
                    <EvolutionInput label="Titulo (inicio)" value={block.props?.titleStart || ''} onChange={(e) => handlePropChange('titleStart', e.target.value)} />
                    <EvolutionInput label="Texto en acento naranja" value={block.props?.titleHighlight || ''} onChange={(e) => handlePropChange('titleHighlight', e.target.value)} />
                    <EvolutionInput label="Titulo (final)" value={block.props?.titleEnd || ''} onChange={(e) => handlePropChange('titleEnd', e.target.value)} />
                    <EvolutionInput label="Descripcion" value={block.props?.subtitle || block.props?.description || ''} onChange={(e) => handlePropChange('subtitle', e.target.value)} multiline />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <EvolutionInput
                                label="Imagen izquierda (.png obligatorio)"
                                value={block.props?.leftImage || ''}
                                onChange={(event) => updatePngField('leftImage', event.target.value)}
                            />
                            {!isPngValue(block.props?.leftImage) ? (
                                <p className="text-xs font-bold text-rose-300">Solo se permite formato .png en esta imagen.</p>
                            ) : null}
                            <div className="flex items-center gap-2">
                                <UploadButton
                                    busy={uploadingTarget === 'tm-left-bucket'}
                                    label="Subir PNG"
                                    accept="image/png"
                                    onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        if (file.type !== 'image/png') {
                                            event.target.value = '';
                                            return;
                                        }
                                        await handleImageUpload('tm-left-bucket', event, (value) => handlePropChange('leftImage', value));
                                    }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <EvolutionInput
                                label="Imagen derecha (.png obligatorio)"
                                value={block.props?.rightImage || ''}
                                onChange={(event) => updatePngField('rightImage', event.target.value)}
                            />
                            {!isPngValue(block.props?.rightImage) ? (
                                <p className="text-xs font-bold text-rose-300">Solo se permite formato .png en esta imagen.</p>
                            ) : null}
                            <div className="flex items-center gap-2">
                                <UploadButton
                                    busy={uploadingTarget === 'tm-right-bucket'}
                                    label="Subir PNG"
                                    accept="image/png"
                                    onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        if (file.type !== 'image/png') {
                                            event.target.value = '';
                                            return;
                                        }
                                        await handleImageUpload('tm-right-bucket', event, (value) => handlePropChange('rightImage', value));
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-400">
                        Esta seccion usa solo 2 imagenes laterales: izquierda y derecha.
                    </p>
                </div>
            </div>
        );
    };
}
