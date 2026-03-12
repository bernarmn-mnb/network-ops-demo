/**
 * Image Utilities — helpers for Unsplash URLs and a curated stock image registry.
 *
 * Usage:
 *   import { unsplash, STOCK_IMAGES } from '../utils/images'
 *
 *   // Build a sized URL from a photo ID
 *   const heroUrl = unsplash('1441984904996-e0b6ba687e04', 1400, 400)
 *
 *   // Use a curated stock image
 *   const foodHero = unsplash(STOCK_IMAGES.food[0].id, 1200, 400)
 *
 * All Unsplash images are free to use under the Unsplash License.
 * Credit is included in the registry for attribution where needed.
 */

/**
 * Build a sized Unsplash image URL.
 *
 * @param photoId  The Unsplash photo ID (the part after /photo-)
 * @param width    Target width in pixels
 * @param height   Target height in pixels (omit for auto aspect ratio)
 * @param options  Extra URL params (e.g. { fit: 'crop', q: 80 })
 */
export function unsplash(
  photoId: string,
  width: number,
  height?: number,
  options?: Record<string, string | number>,
): string {
  const params = new URLSearchParams({ w: String(width) })
  if (height) params.set('h', String(height))
  params.set('fit', 'crop')
  if (options) {
    for (const [k, v] of Object.entries(options)) params.set(k, String(v))
  }
  return `https://images.unsplash.com/photo-${photoId}?${params.toString()}`
}

/**
 * Build a thumbnail variant of an Unsplash photo.
 * Convenience wrapper for small sizes (80-120px) used in photo strips and badges.
 */
export function unsplashThumb(photoId: string, size = 120): string {
  return unsplash(photoId, size, size)
}

interface StockImage {
  /** Unsplash photo ID (the part after /photo-) */
  id: string
  /** Photographer credit */
  credit: string
}

/**
 * Curated stock images by category.
 *
 * Each category has 4-6 high-quality Unsplash photos suitable for hero banners,
 * category cards, or decorative strips. Use with unsplash() to generate sized URLs.
 *
 * To add a category: append to this object. Keep IDs stable — changing them
 * breaks any demo that references STOCK_IMAGES.category[N].
 */
export const STOCK_IMAGES: Record<string, StockImage[]> = {
  food: [
    { id: '1504674900247-0877df9cc836', credit: 'Lily Banse' },
    { id: '1490818387583-1bc5681bdf9b', credit: 'Brooke Lark' },
    { id: '1543353071-873f17a7a088', credit: 'Maarten van den Heuvel' },
    { id: '1498837167922-ddd27525d352', credit: 'Dan Gold' },
    { id: '1467003909585-2f8a72700288', credit: 'Jason Briscoe' },
  ],
  fashion: [
    { id: '1441984904996-e0b6ba687e04', credit: 'Clark Street Mercantile' },
    { id: '1558171813-4c2ab4e78987', credit: 'Priscilla Du Preez' },
    { id: '1490481651871-ab68de25d43d', credit: 'Heidi Sandstrom' },
    { id: '1445205170230-053b83016050', credit: 'Kris Atomic' },
    { id: '1483985988355-763728e1935b', credit: 'Tamara Bellis' },
  ],
  home: [
    { id: '1586023492125-27b2c045efd7', credit: 'Spacejoy' },
    { id: '1556909114-f6e7ad7d3136', credit: 'Spacejoy' },
    { id: '1616046229478-9901c5536a45', credit: 'Spacejoy' },
    { id: '1618220179428-22790b461013', credit: 'Spacejoy' },
    { id: '1556910103-1c02745aae4d', credit: 'Edgar Castrejon' },
  ],
  tech: [
    { id: '1498049794561-7780e7231661', credit: 'Alexandre Debiève' },
    { id: '1519389950473-47ba0277781c', credit: 'Marvin Meyer' },
    { id: '1531297484001-80022131f5a1', credit: 'Adi Goldstein' },
    { id: '1488590528505-98d2b5aba04b', credit: 'Luca Bravo' },
  ],
  lifestyle: [
    { id: '1523275335684-37898b6baf30', credit: 'Headway' },
    { id: '1556742049-0cfed4f6a45d', credit: 'freestocks' },
    { id: '1507003211169-0a1dd7228f2d', credit: 'Joseph Gonzalez' },
    { id: '1513364776144-60967b0f800f', credit: 'Priscilla Du Preez' },
  ],
  nature: [
    { id: '1470071459604-3b5ec3a7fe05', credit: 'v2osk' },
    { id: '1441974231531-c6227db76b6e', credit: 'Luca Bravo' },
    { id: '1506744038136-46273834b3fb', credit: 'Bailey Zindel' },
    { id: '1469474968028-56623f02e42e', credit: 'Kalen Emsley' },
  ],
  office: [
    { id: '1497366216548-37526070297c', credit: 'Austin Distel' },
    { id: '1517502884422-41eaead166d4', credit: 'Austin Distel' },
    { id: '1522071820081-009f0129c71c', credit: 'Nastuh Abootalebi' },
    { id: '1568992687947-868a62a9f521', credit: 'Arlington Research' },
  ],
  retail: [
    { id: '1441986300917-64674bd600d8', credit: 'Mike Petrucci' },
    { id: '1528698827591-e19cef1a992c', credit: 'Clark Street Mercantile' },
    { id: '1472851294608-062f824d29cc', credit: 'Heidi Fin' },
    { id: '1555529771-835f59fc5efe', credit: 'Artificial Photography' },
  ],
}
