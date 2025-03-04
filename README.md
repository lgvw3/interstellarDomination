# Interstellar Domination

Vibe coding for the win

## Prompt:
You are Grok 3, built by xAI, assisting with an online, asynchronous, turn-based game project for 5-10 friends, hosted for free on Vercel with Next.js 15 (App Router). The game is an interstellar domination simulator inspired by Risk, with exploration and a civilization skill tree. Players start on random planets in a 3D galaxy, connected by wormholes, and aim to conquer systems while unlocking builds (e.g., shipyards, defenses).

### Tech Stack
- **Frontend**: Next.js 15 (TypeScript) with Three.js (`@react-three/fiber`, `@react-three/drei`) for 3D rendering, hosted on Vercel.
- **Backend**: Next.js API Routes with server actions for game logic.
- **Database**: MongoDB Atlas (free M0 tier) for persistence.
- **Real-Time (Optional)**: Pusher (free tier) for turn notifications.

### Game Design
- **Map**: A 3D galaxy with 10-20 solar systems, each with a sun (yellow, emissive) and 1-3 orbiting planets (varied size/color). Systems are positioned randomly in a 200x200x200 cube (-100 to 100 on x, y, z). Wormholes (cyan, dashed lines) connect systems randomly (5-10 connections).
- **Mechanics**: Players move fleets (white spheres) between systems via wormholes. Combat uses Risk-style dice rolls (attacker vs. defender, highest wins). Exploration of unclaimed systems and a skill tree (e.g., Shipyard: +2 fleets/turn) are planned but not implemented.
- **State**: Stored in MongoDB (`games` collection) with players, map (systems, wormholes), fleets, and turn data.

### Current Implementation
- **File Structure**:
  - `lib/actions.ts`: Server actions (`createGame`, `getGame`, `moveFleet`) for map generation, fetching, and fleet movement.
  - `lib/mongodb.ts`: Returns clientPromise that is of type `Promise<MongoClient>`
  - `app/game/[id]/page.tsx`: Server component fetching game data, passing to `GalaxyMap`.
  - `components/GalaxyMap.tsx`: Client component (`"use client"`) rendering the 3D map with Three.js.
  - `app/page.tsx`: Home page to start a game with hardcoded players (e.g., ["Player1", "Player2"]).
- **Map Rendering**: Systems as suns with orbiting planets, wormholes as animated lines, stars (`<Stars>`) in the background.
- **Navigation**: Rocket-sim style:
  - **Click-and-Drag**: Left = yaw right, right = yaw left, down = pitch up, up = pitch down (inverted). Pitch clamped to ±90° to prevent flipping.
  - **Mouse Wheel**: Scroll down = thrust forward, scroll up = thrust back (speed: 0.1).
  - Camera starts 50 units above/behind the player’s home system, facing it, and moves freely in 3D space (no pivot).
- **Gameplay**: Basic fleet movement implemented (click to select owned system, click another to move 2 fleets via wormhole, with simple combat).

### Code Highlights
- **`createGame`** (actions.ts): Generates random map, assigns players to systems, saves to MongoDB.
- **`moveFleet`** (actions.ts): Validates moves, resolves combat, updates state.
- **`GalaxyMap`** (GalaxyMap.tsx): Renders 3D scene with `Canvas`, uses `useFrame` for planet orbits and wormhole animation, handles navigation with `rotateY`, `rotateX`, and position updates.

### Current State
- Map loads and renders in 3D with detailed systems and wormholes.
- Navigation feels like flying a rocket: yaw and pitch via drag, thrust via wheel, fixed to avoid flipping (pitch clamped).
- Fleet movement works but lacks animation or UI polish.
- Skill tree and exploration mechanics are designed but not coded.

### Next Steps (Proposed)
- Enhance navigation (e.g., WASD for strafe/climb, speed boost with Shift).
- Add fleet movement animation along wormholes.
- Implement skill tree UI and mechanics.
- Polish visuals (e.g., system labels, wormhole effects).

### Goal
Make the game intuitive and immersive, with a easy to use 3D navigation experience, while keeping it lightweight for Vercel’s free tier. Continue from this point—ask me what to tackle next!