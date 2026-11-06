import React from 'react';
import { Composition } from 'remotion';
import { FPS, H, W } from './kit';
import { CAMBIAR_PRECIO_FRAMES, CambiarPrecioStock } from './CambiarPrecioStock';
import { CREAR_OFERTA_FRAMES, CrearOferta } from './CrearOferta';
import { SUBIR_PRECIOS_FRAMES, SubirPreciosRubro } from './SubirPreciosRubro';
import { POR_QUE_FRAMES, PorQueCambioPrecio } from './PorQueCambioPrecio';

// El id de cada composición es el slug de la guía en apps/vase-help/lib/guides.ts.
export const VIDEOS = [
  { id: 'cambiar-precio-o-stock', component: CambiarPrecioStock, frames: CAMBIAR_PRECIO_FRAMES },
  { id: 'crear-una-oferta', component: CrearOferta, frames: CREAR_OFERTA_FRAMES },
  { id: 'subir-precios-de-un-rubro', component: SubirPreciosRubro, frames: SUBIR_PRECIOS_FRAMES },
  { id: 'por-que-volvio-a-cambiar-un-precio', component: PorQueCambioPrecio, frames: POR_QUE_FRAMES },
];

export const Root: React.FC = () => (
  <>
    {VIDEOS.map((video) => (
      <Composition key={video.id} id={video.id} component={video.component} durationInFrames={video.frames} fps={FPS} width={W} height={H} />
    ))}
  </>
);
