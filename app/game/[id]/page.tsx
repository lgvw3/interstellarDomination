import GalaxyMap from "@/components/GalaxyMap";
import { getGame } from "@/lib/actions";

export default async function GamePage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) return <div>Game not found</div>;

  return (
    <div className="h-screen w-screen">
      <GalaxyMap map={game.map} players={game.players} currentTurn={game.current_turn} />
    </div>
  );
}