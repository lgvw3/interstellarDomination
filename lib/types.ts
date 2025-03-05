import { ObjectId } from "mongodb";

// System position coordinates
export interface Position {
  x: number;
  y: number;
  z: number;
}

// Convert position array to object for storage
export type PositionArray = [number, number, number];

// Planet within a system
export interface Planet {
  id: string;
  size: number;
  distance: number;
  color: string;
}

// Solar system
export interface System {
  id: string;
  position: PositionArray;
  sunSize: number;
  planets: Planet[];
  owner: string | null;
}

// Wormhole connection between systems
export interface Wormhole {
  from: string;
  to: string;
}

// Asteroid cluster
export interface Asteroid {
  id: string;
  position: PositionArray;
  size: number;
}

// Game map containing systems, wormholes, and asteroids
export interface GameMap {
  systems: System[];
  wormholes: Wormhole[];
  asteroids: Asteroid[];
}

// Player data
export interface Player {
  id: string;
  name: string;
  systems: string[];
  fleets: Record<string, number>;
}

// Game document in MongoDB
export interface Game {
  _id: ObjectId;
  players: Player[];
  map: GameMap;
  currentTurn: string;
  timeLimit: number;
  lastMoveTimestamp: string;
}

// Moving fleet for animation
export interface MovingFleet {
  sourceId: string;
  targetId: string;
  count: number;
  progress: number;
}