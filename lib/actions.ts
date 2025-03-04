"use server";

import { MongoClient } from "mongodb";
import clientPromise from "./mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function createGame(playerNames: string[]) {
    try {
      const client = await clientPromise;
      const db = client.db("interstellar");

        const systemCount = Math.floor(Math.random() * 11) + 20; // 20-30 systems
        const systems = Array.from({ length: systemCount }, (_, i) => {
        const planets = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
            id: `planet${i}-${j}`,
            size: Math.random() * 0.5 + 0.3,
            distance: (j + 1) * 2,
            color: ["#ff9999", "#99ccff", "#ccff99"][j % 3],
        }));
        return {
            id: `system${i + 1}`,
            position: [
            (Math.random() - 0.5) * 1000, // x: -500 to 500
            (Math.random() - 0.5) * 1000, // y: -500 to 500
            (Math.random() - 0.5) * 1000, // z: -500 to 500
            ],
            sunSize: Math.random() * 1 + 1,
            planets,
            owner: null,
        };
        });

        const players = playerNames.map((name, i) => {
        const startSystem = systems[i % systems.length];
        startSystem.owner = name;
        return { id: name, name, systems: [startSystem.id], fleets: { [startSystem.id]: 5 } };
        });

        const wormholeCount = Math.floor(Math.random() * 6) + 10; // 10-15 wormholes
        const wormholes = [];
        for (let i = 0; i < wormholeCount; i++) {
        const from = systems[Math.floor(Math.random() * systems.length)].id;
        const to = systems[Math.floor(Math.random() * systems.length)].id;
        if (from !== to) wormholes.push({ from, to });
        }

        // Add asteroid fields (simple clusters)
        const asteroidCount = 50; // 50 asteroid clusters
        const asteroids = Array.from({ length: asteroidCount }, (_, i) => ({
        id: `asteroid${i + 1}`,
        position: [
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000,
        ],
        size: Math.random() * 2 + 1, // 1-3 units
        }));

        const game = {
        _id: `game${Date.now()}`,
        players,
        map: { systems, wormholes, asteroids }, // Add asteroids to map
        current_turn: players[0].id,
        time_limit: 24,
        last_move_timestamp: new Date().toISOString(),
        };

        await db.collection("games").insertOne(game);
        return game._id;
    } finally {
        await client.close();
    }
  }
export async function getGame(gameId: string) {
    try {
        const client = await clientPromise;
        const db = client.db("interstellar");
        const game = await db.collection("games").findOne({ _id: gameId });
        return game;
    } finally {
        await client.close();
    }
}

export async function moveFleet(gameId: string, playerId: string, fromSystem: string, toSystem: string, fleetCount: number) {
    try {
        const client = await clientPromise;
        const db = client.db("interstellar");
        const game = await db.collection("games").findOne({ _id: gameId });
    
        if (!game || game.current_turn !== playerId) {
            throw new Error("Not your turn or game not found");
        }
  
        const player = game.players.find((p: any) => p.id === playerId);
        const wormhole = game.map.wormholes.find(
            (w: any) => (w.from === fromSystem && w.to === toSystem) || (w.to === fromSystem && w.from === toSystem)
        );
    
        if (!wormhole || !player.fleets?.[fromSystem] || player.fleets[fromSystem] < fleetCount) {
            throw new Error("Invalid move: no wormhole or insufficient fleets");
        }
    
        // Update fleets
        player.fleets[fromSystem] -= fleetCount;
        if (player.fleets[fromSystem] === 0) delete player.fleets[fromSystem];
        
        const targetSystem = game.map.systems.find((s: any) => s.id === toSystem);
        if (targetSystem.owner && targetSystem.owner !== playerId) {
            // Combat (simplified: 1 fleet = 1 die, attacker wins ties)
            const attackerRoll = Math.max(...Array(fleetCount).fill(0).map(() => Math.floor(Math.random() * 6) + 1));
            const defenderFleets = game.players.find((p: any) => p.id === targetSystem.owner).fleets?.[toSystem] || 0;
            const defenderRoll = Math.max(...Array(defenderFleets).fill(0).map(() => Math.floor(Math.random() * 6) + 1));
    
            if (attackerRoll >= defenderRoll) {
            targetSystem.owner = playerId;
            player.fleets[toSystem] = fleetCount - 1; // 1 lost in combat
            const defender = game.players.find((p: any) => p.id !== playerId);
            delete defender.fleets[toSystem];
            } else {
            player.fleets[toSystem] = 0; // Attack fails, all fleets lost
            }
        } else {
            // No combat, just move
            player.fleets[toSystem] = (player.fleets[toSystem] || 0) + fleetCount;
            if (!targetSystem.owner) {
                targetSystem.owner = playerId;
                player.systems.push(toSystem);
            }
        }
  
        // Switch turn
        const nextPlayerIdx = (game.players.findIndex((p: any) => p.id === playerId) + 1) % game.players.length;
        game.current_turn = game.players[nextPlayerIdx].id;
        game.last_move_timestamp = new Date().toISOString();
    
        await db.collection("games").updateOne({ _id: gameId }, { $set: game });
        return { success: true, game };
    } finally {
        await client.close();
    }
}