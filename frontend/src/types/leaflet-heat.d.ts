import * as L from 'leaflet'

declare module 'leaflet' {
  interface HeatLatLngTuple extends Array<number> {
    0: number // lat
    1: number // lng
    2?: number // intensity
  }

  interface HeatLayerOptions {
    minOpacity?: number
    maxZoom?: number
    max?: number
    radius?: number
    blur?: number
    gradient?: { [key: number]: string }
    pane?: string
  }

  interface HeatLayer extends L.Layer {
    setOptions(options: HeatLayerOptions): this
    addLatLng(latlng: L.LatLngExpression | HeatLatLngTuple): this
    setLatLngs(latlngs: Array<L.LatLngExpression | HeatLatLngTuple>): this
    redraw(): this
  }

  function heatLayer(
    latlngs: Array<L.LatLngExpression | HeatLatLngTuple>,
    options?: HeatLayerOptions
  ): HeatLayer
}
