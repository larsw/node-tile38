import { RedisClient } from "redis"
import { GeoJsonObject } from "./geojson";

// adds elements from arr2 to arr1. If arr1 doesn't exist, it will
// simply return arr2
const addToArray = (arr1: any[], arr2: any[]):any[] => {
  return arr1 ? arr1.concat(arr2) : arr2 
}

type DistanceType = "DISTANCE" | undefined

class Tile38QueryOpts {
  matches: any[] = [];
  order: OrderType = OrderType.Ascending
  distance: DistanceType
  where: any[] = []
  whereIn: any[] = []
  whereEval: any[] = []
  whereEvalSha: any[] = []
  clip: ("CLIP"|undefined)
  nofields: ("NOFIELDS"|undefined)
  detect: (undefined|[string,string])
  commands?: string[];
  output?: any[];
  getObject?: any[];
  bounds?: any[];
  geojson?: string[];
  tile?: any[];
  quadKey?: any[];
  hash?: any[];
  circle?: any[];
  point?: any[];
  roam?: any[];
  fence?: string;
  cursor?: [string, number];
  limit?: [string, number];
  sparse?: [string, number];
}

enum OrderType {
  Ascending = "ASC",
  Descending = "DESC"
} 

enum DetectType {
  Inside = "inside",
  Outside = "outside",
  Enter = "enter",
  Exit = "exit",
  Cross = "cross"
}

type CommandType = "del" | "drop" | "set"
type OutputType =  "count" | "ids" | "objects" | "points" | "bounds" | "hashes"



class Tile38Query {
  private type: string;
  private key: string;
  private client: RedisClient;
  private options: Tile38QueryOpts;

  constructor(type: string, key: string, client: RedisClient) {
    this.type = type;
    this.key = key;
    this.client = client;
    this.options = new Tile38QueryOpts();
  }

  cursor(start: number) {
    this.options.cursor = ["CURSOR", start];
    return this;
  }

  limit(count: number) {
    this.options.limit = ["LIMIT", count];
    return this;
  }

  sparse(spread: number) {
    this.options.sparse = ["SPARSE", spread];
    return this;
  }

  /*
   * set a matching query on the object ID. The value is a glob pattern.
   * Unlike other query methods in this class, match() may be called multiple times
   */
  match(value: string) {
    let m: [string, string] = ["MATCH", value];
    this.options.matches = addToArray(this.options.matches, m);
    return this;
  }

  // sort order for SCAN query, must be 'asc' or 'desc'
  order(val: OrderType): Tile38Query {
    this.options.order = val
    return this;
  }

  // equivalent of order('asc')
  asc(): Tile38Query {
    return this.order(OrderType.Ascending);
  }
  // equivalent of order('desc');
  desc(): Tile38Query {
    return this.order(OrderType.Descending);
  }

  // adds DISTANCE argument for nearby query.
  distance() {
    this.options.distance = "DISTANCE";
    return this;
  }

  /*
   * set a where search pattern. Like match, this method may be chained multiple times
   * as well. For example:
   * query.where('speed', 70, '+inf').where('age', '-inf', 24)
   */
  where(field:string, ...criteria:any[]): Tile38Query {
    let arr = ["WHERE", field].concat(criteria);
    this.options.where = addToArray(this.options.where, arr);
    return this;
  }

  /*
   * set a wherein search pattern. Like match, this method may be chained multiple times
   * as well. For example:
   *   query.wherein('doors', 2, 5).wherein('wheels', 14, 18, 22)
   * Would generate the command:
   *   WHEREIN doors 2 2 5 WHEREIN wheels 3 14 18 22
   * (note that the command to the server includes the argument count, while the
   * js api doesn't need this)
   */
  whereIn(field: string, ...values: any[]): Tile38Query {
    let arr = ["WHEREIN", field, values.length].concat(values);
    this.options.whereIn = addToArray(this.options.whereIn, arr);
    return this;
  }
  whereEval(script: string, ...args: any[]): Tile38Query {
    let arr = ["WHEREEVAL", `"${script}"`, args.length].concat(args);
    this.options.whereEval = addToArray(this.options.whereEval, arr);
    return this;
  }
  whereEvalSha(sha: string, ...args: any[]): Tile38Query {
    let arr = ["WHEREEVALSHA", sha, args.length].concat(args);
    this.options.whereEvalSha = addToArray(this.options.whereEvalSha, arr);
    return this;
  }

  /*
   * clip intersecting objects
   */
  clip(): Tile38Query {
    this.options.clip = "CLIP";
    return this;
  }

  /*
   * call nofields to exclude field values from search results
   */
  nofields():Tile38Query {
    this.options.nofields = "NOFIELDS";
    return this;
  }

  /*
   * sets one or more detect values. For example:
   * query.detect('inside', 'outside');
   *   or
   * query.detect('inside,outside');
   *
   * whichever you prefer
   */
  detect(...values:DetectType[]): Tile38Query {
    this.options.detect = ["DETECT", values.join(",")]
    return this;
  }

  /**
   * sets commands to listen for. Expected values: del, drop and set
   * You may pass these as separate parameters,
   *   query.commands('del', 'drop', 'set');
   *
   * or as a single comma separated parameter
   *   query.commands('del,drop,set');
   */
  commands(...values:CommandType[]): Tile38Query {
    this.options.commands = ["COMMANDS", values.join(",")]
    return this;
  }

  /**
   * set output type. Allowed values:
   * count
   * ids
   * objects
   * points
   * bounds
   * hashes
   *
   * If 'hashes' is used a second parameter should specify the precision, ie
   *   query.output('hashes', 6);
   *
   * Note that all of these types, except for 'bounds' can be called using convenience methods as well,
   * so
   *   objects() instead of output('objects')
   * and
   *   hashes(6) instead of output('hashes', 6)
   *
   */
  output(type:OutputType, precision?:number) {
    if (type == "hashes") {
      this.options.output = [type, precision]
    } 
    else {
      this.options.output = [type]
    }
    return this;
  }

  // shortcut for .output('ids')
  ids(): Tile38Query {
    return this.output("ids")
  }
  // shortcut for .output('count')
  count(): Tile38Query {
    return this.output("count");
  }
  // shortcut for .output('objects')
  objects(): Tile38Query {
    return this.output("objects");
  }
  // shortcut for .output('points')
  points(): Tile38Query {
    return this.output("points");
  }
  // shortcut for .output('points')
  hashes(precision: number) {
    if (precision != undefined || (precision < 1 || precision > 22)) {
      throw new Error("for the hashes output type, precision must be a integer between 1 and 22 inclusive.")
    }
    return this.output("hashes", precision);
  }

  /**
   * conducts search with an object that's already in the database
   */
  getObject(key: string, id: string): Tile38Query {
    this.options.getObject = ["GET", key, id]
    return this
  }

  /**
   * conducts search with bounds coordinates
   */
  bounds(minlat: number, minlon: number, maxlat: number, maxlon: number): Tile38Query {
    this.options.bounds = ["BOUNDS", minlat, minlon, maxlat, maxlon]
    return this
  }

  /**
   * conducts search with geojson object
   */
  object(geojson: GeoJsonObject) {
    this.options.geojson = ["OBJECT", JSON.stringify(geojson)];
    return this;
  }

  tile(x: number, y: number, z: number): Tile38Query {
    this.options.tile = ["TILE", x, y, z];
    return this;
  }

  quadKey(key: string): Tile38Query {
    this.options.quadKey = ["QUADKEY", key];
    return this;
  }

  hash(geohash: string): Tile38Query  {
    this.options.hash = ["HASH", geohash];
    return this;
  }

  // adds CIRCLE arguments to WITHIN / INTERSECTS queries
  circle(lat: number, lon: number, meters: number) {
    this.options.circle = ["CIRCLE", lat, lon, meters];
    return this;
  }

  // adds POINT arguments to NEARBY query.
  point(lat: number, lon: number, meters: number): Tile38Query {
    this.options.point = ["POINT", lat, lon];
    if (meters !== undefined) {
      this.options.point.push(meters);
    }
    return this;
  }

  // adds ROAM arguments to NEARBY query
  roam(key: string, pattern: string, meters: number): Tile38Query {
    // TODO throw error if type != 'NEARBY'
    this.options.roam = ["ROAM", key, pattern, meters];
    return this;
  }

  // return all the commands of the query chain, as a string, the way it will
  // be sent to Tile38
  commandStr() {
    return this.type + " " + this.commandArr().join(" ");
  }

  // constructs the full array for all arguments of the query.
  commandArr() {
    let cmd = [this.key];
    let o = this.options;

    // construct an array of commands in this order
    let commands = [
      "cursor",
      "limit",
      "sparse",
      "matches",
      "order",
      "distance",
      "where",
      "whereIn",
      "whereEval",
      "whereEvalSha",
      "clip",
      "nofields",
      "fence",
      "detect",
      "commands",
      "output",
      "getObject",
      "bounds",
      "geojson",
      "tile",
      "quadKey",
      "hash",
      "point",
      "circle",
      "roam",
    ];
    for (let c of commands) {
      let opt = o[c];
      if (opt !== undefined) {
        if (opt instanceof Array) {
          // array of objects
          for (let i of o[c]) {
            cmd.push(i);
          }
        } else {
          // simple string
          cmd.push(opt);
        }
      }
    }
    return cmd;
  }

  /**
   * will execute the query and return a Promise to the result.
   * To use the live fence with streaming results, use fence() instead.
   */
  execute() {
    return this.client.sendCommand(this.type, 1, this.commandArr());
  }

  /**
   * returns streaming results for a live geofence. This function will repeatedly call the specified callback
   * method when results are received.
   * This method returns an instance of LiveGeofence, which can be used to close the fence if necessary by calling
   * its close() method.
   */
  executeFence(callback) {
    this.options.fence = "FENCE";
    return this.client.openLiveFence(this.type, this.commandArr(), callback);
  }

  /*
   * factory method to create a new Tile38Query object for an INTERSECTS search.
   * These factory methods are used in the test suite, but since these don't have
   * access to a Tile38 client object, they cannot be used to actually execute
   * a query on the server.
   * Use the Tile38.intersectsQuery() method instead.
   */
  static intersects(key) {
    return new Tile38Query("INTERSECTS", key);
  }

  // Use Tile38.searchQuery() method instead
  static search(key) {
    return new Tile38Query("SEARCH", key);
  }

  // Use Tile38.nearbyQuery() method instead
  static nearby(key) {
    return new Tile38Query("NEARBY", key);
  }

  // Use Tile38.scanQuery() method instead
  static scan(key) {
    return new Tile38Query("SCAN", key);
  }

  // Use Tile38.withinQuery() method instead
  static within(key) {
    return new Tile38Query("WITHIN", key);
  }
}

module.exports = Tile38Query;
