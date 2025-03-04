"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGame } from "@/lib/actions";

export default function Home() {
  const [players, setPlayers] = useState<string[]>(["Player1", "Player2"]);
  const router = useRouter();

  const handleCreate = async () => {
    const gameId = await createGame(players);
    router.push(`/game/${gameId}`);
  };

  return (
    <div className="p-4">
      <h1>Interstellar Domination</h1>
      <button onClick={handleCreate} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Start Game
      </button>
    </div>
  );
}