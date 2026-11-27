import deskLamp from '../../assets/shop/desk-lamp.png';
import oakStand from '../../assets/shop/oak-stand.png';
import feltMat from '../../assets/shop/felt-mat.png';
import type { ProductId } from './catalog';
import type { ImageMetadata } from 'astro';

export const pictures = {
  'desk-lamp': deskLamp,
  'oak-stand': oakStand,
  'felt-mat': feltMat,
} satisfies Record<ProductId, ImageMetadata>;
