// Parte de BlockPropertiesEditor: renderPiquimHeroEditor.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { compactFieldClass } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

/** Arma renderPiquimHeroEditor con lo que necesita del componente. */
export function makeRenderPiquimHeroEditor({ block, handlePropChange, renderImageControl, renderVideoControl }) {
    return () => (
        <div className={panelClass}>
            <SectionHeading icon={Baseline}>Portada video</SectionHeading>
            <div className="space-y-3">
                <EvolutionInput label="Badge superior" value={block.props?.badgeText || ''} onChange={(e) => handlePropChange('badgeText', e.target.value)} />
                <EvolutionInput label="Titulo linea 1" value={block.props?.preTitle || ''} onChange={(e) => handlePropChange('preTitle', e.target.value)} />
                <EvolutionInput label="Titulo destacado" value={block.props?.titleHighlight || ''} onChange={(e) => handlePropChange('titleHighlight', e.target.value)} />
                <EvolutionInput label="Titulo linea 3" value={block.props?.postTitle || ''} onChange={(e) => handlePropChange('postTitle', e.target.value)} />
    
                <div className="space-y-1.5">
                    <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Media hero</label>
                    <select
                        value={block.props?.mediaType || 'video'}
                        onChange={(event) => handlePropChange('mediaType', event.target.value)}
                        className={selectFieldClass}
                    >
                        <option value="image" className="bg-zinc-900">Imagen</option>
                        <option value="video" className="bg-zinc-900">Video</option>
                    </select>
                </div>
    
                {(block.props?.mediaType || 'video') === 'video' ? (
                    <>
                        {renderVideoControl({ label: 'Video desktop (PC)', value: block.props?.videoUrlDesktop, uploadKey: 'piquim-hero-video-desktop', onChange: (value) => handlePropChange('videoUrlDesktop', value) })}
                        {renderVideoControl({ label: 'Video mobile (celular)', value: block.props?.videoUrlMobile, uploadKey: 'piquim-hero-video-mobile', onChange: (value) => handlePropChange('videoUrlMobile', value) })}
                        {renderVideoControl({ label: 'Fallback video URL', value: block.props?.videoUrl, uploadKey: 'piquim-hero-video', onChange: (value) => handlePropChange('videoUrl', value) })}
                        {renderImageControl({ label: 'Poster', value: block.props?.videoPoster, uploadKey: 'piquim-hero-poster', onChange: (value) => handlePropChange('videoPoster', value) })}
                        <EvolutionInput label="Encuadre del video" value={block.props?.videoObjectPosition || 'center center'} onChange={(e) => handlePropChange('videoObjectPosition', e.target.value)} placeholder="center 45%" />
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => handlePropChange('videoAutoplay', !block.props?.videoAutoplay)} className={compactFieldClass}>
                                Autoplay: {block.props?.videoAutoplay !== false ? 'ON' : 'OFF'}
                            </button>
                            <button type="button" onClick={() => handlePropChange('videoLoop', !block.props?.videoLoop)} className={compactFieldClass}>
                                Loop: {block.props?.videoLoop !== false ? 'ON' : 'OFF'}
                            </button>
                            <button type="button" onClick={() => handlePropChange('videoMuted', !block.props?.videoMuted)} className={compactFieldClass}>
                                Mute: {block.props?.videoMuted !== false ? 'ON' : 'OFF'}
                            </button>
                            <button type="button" onClick={() => handlePropChange('videoControls', !block.props?.videoControls)} className={compactFieldClass}>
                                Controls: {block.props?.videoControls ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {renderImageControl({ label: 'Imagen desktop (PC)', value: block.props?.image, uploadKey: 'piquim-hero-image', onChange: (value) => handlePropChange('image', value), largePreview: true })}
                        {renderImageControl({ label: 'Imagen mobile (opcional)', value: block.props?.imageMobile, uploadKey: 'piquim-hero-image-mobile', onChange: (value) => handlePropChange('imageMobile', value) })}
                        <EvolutionInput label="Encuadre de la imagen" value={block.props?.imageObjectPosition || 'center center'} onChange={(e) => handlePropChange('imageObjectPosition', e.target.value)} placeholder="center 45%" />
                    </>
                )}
    
                <div className="grid grid-cols-3 gap-2">
                    <EvolutionInput label="Stat 1" value={block.props?.statProducts || ''} onChange={(e) => handlePropChange('statProducts', e.target.value)} />
                    <EvolutionInput label="Stat 2" value={block.props?.statCategories || ''} onChange={(e) => handlePropChange('statCategories', e.target.value)} />
                    <EvolutionInput label="Stat 3" value={block.props?.statYears || ''} onChange={(e) => handlePropChange('statYears', e.target.value)} />
                    <EvolutionInput label="Texto stat 1" value={block.props?.statProductsLabel ?? 'productos'} onChange={(e) => handlePropChange('statProductsLabel', e.target.value)} />
                    <EvolutionInput label="Texto stat 2" value={block.props?.statCategoriesLabel ?? 'categorias'} onChange={(e) => handlePropChange('statCategoriesLabel', e.target.value)} />
                    <EvolutionInput label="Texto stat 3" value={block.props?.statYearsLabel ?? 'anos de oficio'} onChange={(e) => handlePropChange('statYearsLabel', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <EvolutionInput label="Boton primario" value={block.props?.primaryLabel || ''} onChange={(e) => handlePropChange('primaryLabel', e.target.value)} />
                    <LinkInput label="Link primario" value={block.props?.primaryHref || ''} onChange={(e) => handlePropChange('primaryHref', e.target.value)} />
                    <EvolutionInput label="Boton secundario" value={block.props?.secondaryLabel || ''} onChange={(e) => handlePropChange('secondaryLabel', e.target.value)} />
                    <LinkInput label="Link secundario" value={block.props?.secondaryHref || ''} onChange={(e) => handlePropChange('secondaryHref', e.target.value)} />
                </div>
            </div>
        </div>
    );
}
