/**
 * DeliveryZoneLayer - Data preparation for delivery zone polygon overlays.
 *
 * Transforms delivery zone check results into polygon data
 * consumable by both MapboxMap and LeafletMap.
 *
 * Polygon rendering is handled inline by each map renderer:
 * - MapboxMap: Source + Layer with type "fill"
 * - LeafletMap: GeoJSON component with style callback
 */

export interface DeliveryZone {
  id: string
  name: string
  coordinates: number[][][]
}

/**
 * Extract delivery zone polygons from geo search results.
 * Expects source documents to have a `delivery_zones` field with GeoJSON polygons.
 */
export function extractDeliveryZones(
  hits: Array<{ id: string; source: Record<string, unknown> }>,
): DeliveryZone[] {
  const zones: DeliveryZone[] = []

  for (const hit of hits) {
    const src = hit.source
    const name = (src.name as string) || (src.store_name as string) || hit.id

    // Handle delivery_zones as an array of zone objects
    const rawZones = src.delivery_zones as Array<{
      zone_name?: string
      polygon?: { coordinates?: number[][][] }
    }> | undefined

    if (rawZones && Array.isArray(rawZones)) {
      rawZones.forEach((zone, idx) => {
        if (zone.polygon?.coordinates) {
          zones.push({
            id: `${hit.id}-zone-${idx}`,
            name: zone.zone_name || `${name} Zone ${idx + 1}`,
            coordinates: zone.polygon.coordinates,
          })
        }
      })
      continue
    }

    // Fallback: single delivery_zone polygon at top level
    const polygon = src.delivery_zone as { coordinates?: number[][][] } | undefined
    if (polygon?.coordinates) {
      zones.push({
        id: `${hit.id}-zone`,
        name: `${name} Delivery Zone`,
        coordinates: polygon.coordinates,
      })
    }
  }

  return zones
}
