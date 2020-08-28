type GeoJsonObjectType = 
  "Point" | 
  "Feature" | 
  "FeatureCollection" |
  "Polygon" |
  "MultiPolygon" |
  "MultiPoint" |
  "LineString" |
  "MultiLineString"  

export interface GeoJsonObject {
  readonly type:GeoJsonObjectType
}

export class GeoJsonPoint implements GeoJsonPoint {
  readonly type : GeoJsonObjectType = "Point"
  readonly coordinates: [number, number]
  readonly properties?: any
  
  constructor(longitude: number, latitude: number, properties?: any) {
    if (longitude < -180.0 || longitude > 180.0) throw new Error(`longitude value out of range [-180.0, 180]: ${longitude}`)
    if (latitude < -180.0 || latitude > 180.0) throw new Error(`latitude value out of range [-180.0, 180]: ${latitude}`)
    this.coordinates = [longitude, latitude]
    this.properties = properties
  }
}
