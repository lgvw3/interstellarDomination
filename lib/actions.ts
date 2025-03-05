"use server";

import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { Game, Player, System } from "@/lib/types";

export async function createGame(playerNames: string[]): Promise<string> {
  const client = await clientPromise;
  const db = client.db("interstellar");

  const systemCount = Math.floor(Math.random() * 11) + 20; // 20-30 systems
  const systems: System[] = Array.from({ length: systemCount }, (_, i) => {
    const planets = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
      id: `planet${i}-${j}`,
      size: Math.random() * 0.5 + 0.3,
      distance: (j + 1) * 2,
      color: ["#ff9999", "#99ccff", "#ccff99"][j % 3],
    }));
    return {
      id: `system${i + 1}`,
      position: [
        (Math.random() - 0.5) * 200, // x: -100 to 100
        (Math.random() - 0.5) * 200, // y: -100 to 100
        (Math.random() - 0.5) * 200, // z: -100 to 100
      ],
      sunSize: Math.random() * 1 + 1,
      planets,
      owner: null,
    };
  });

  const players: Player[] = playerNames.map((name, i) => {
    const startSystem = systems[i % systems.length];
    startSystem.owner = name;
    return { id: name, name, systems: [startSystem.id], fleets: { [startSystem.id]: 5 } };
  });

  // Ensure every system has at least one wormhole
  const wormholes: { from: string; to: string }[] = [];
  const connected = new Set<string>([systems[0].id]);
  for (let i = 1; i < systems.length; i++) {
    const from = systems[i].id;
    const to = Array.from(connected)[Math.floor(Math.random() * connected.size)];
    wormholes.push({ from, to });
    connected.add(from);
  }

  const extraWormholeCount = Math.floor(Math.random() * 6) + 5;
  for (let i = 0; i < extraWormholeCount; i++) {
    const from = systems[Math.floor(Math.random() * systems.length)].id;
    const to = systems[Math.floor(Math.random() * systems.length)].id;
    if (from !== to && !wormholes.some((w) => (w.from === from && w.to === to) || (w.from === to && w.to === from))) {
      wormholes.push({ from, to });
    }
  }

  const asteroidCount = 50;
  const asteroids = Array.from({ length: asteroidCount }, (_, i) => ({
    id: `asteroid${i + 1}`,
    position: [
      (Math.random() - 0.5) * 1000,
      (Math.random() - 0.5) * 1000,
      (Math.random() - 0.5) * 1000,
    ] as [number, number, number],
    size: Math.random() * 2 + 1,
  }));

  const game: Omit<Game, "_id"> = {
    players,
    map: { systems, wormholes, asteroids },
    currentTurn: players[0].id,
    timeLimit: 24,
    lastMoveTimestamp: new Date().toISOString(),
  };

  const result = await db.collection("games").insertOne(game);
  return result.insertedId.toString();
}

export async function getGame(gameId: string): Promise<Game | null> {
  const client = await clientPromise;
  const db = client.db("interstellar");
  const game = await db.collection<Game>("games").findOne({ _id: new ObjectId(gameId) });
  return game;
}

export async function moveFleet(gameId: string, playerId: string, fromSystem: string, toSystem: string, fleetCount: number): Promise<{ success: boolean; game?: Game }> {
  const client = await clientPromise;
  const db = client.db("interstellar");
  try {
    const game = await db.collection<Game>("games").findOne({ _id: new ObjectId(gameId) });
    if (!game || game.currentTurn !== playerId) {
      throw new Error("Not your turn or game not found");
    }

    const player = game.players.find((p) => p.id === playerId);
    const wormhole = game.map.wormholes.find(
      (w) => (w.from === fromSystem && w.to === toSystem) || (w.to === fromSystem && w.from === toSystem)
    );

    if (!wormhole || !player?.fleets[fromSystem] || player.fleets[fromSystem] < fleetCount) {
      throw new Error("Invalid move: no wormhole or insufficient fleets");
    }

    player.fleets[fromSystem] -= fleetCount;
    if (player.fleets[fromSystem] === 0) delete player.fleets[fromSystem];

    const targetSystem = game.map.systems.find((s) => s.id === toSystem)!;
    if (targetSystem.owner && targetSystem.owner !== playerId) {
      const attackerRoll = Math.max(...Array(fleetCount).fill(0).map(() => Math.floor(Math.random() * 6) + 1));
      const defenderFleets = game.players.find((p) => p.id === targetSystem.owner)!.fleets[toSystem] || 0;
      const defenderRoll = Math.max(...Array(defenderFleets).fill(0).map(() => Math.floor(Math.random() * 6) + 1));

      if (attackerRoll >= defenderRoll) {
        targetSystem.owner = playerId;
        player.fleets[toSystem] = fleetCount - 1;
        const defender = game.players.find((p) => p.id !== playerId)!;
        delete defender.fleets[toSystem];
      } else {
        player.fleets[toSystem] = 0;
      }
    } else {
      player.fleets[toSystem] = (player.fleets[toSystem] || 0) + fleetCount;
      if (!targetSystem.owner) {
        targetSystem.owner = playerId;
        player.systems.push(toSystem);
      }
    }

    const nextPlayerIdx = (game.players.findIndex((p) => p.id === playerId) + 1) % game.players.length;
    game.currentTurn = game.players[nextPlayerIdx].id;
    game.lastMoveTimestamp = new Date().toISOString();

    await db.collection<Game>("games").updateOne({ _id: new ObjectId(gameId) }, { $set: game });
    return { success: true, game };
  } catch (error) {
    console.error("Error in moveFleet:", error);
    return { success: false };
  }
}