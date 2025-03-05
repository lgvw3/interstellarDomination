import GalaxyMap from "@/components/GalaxyMap";
import { getGame } from "@/lib/actions";

interface GamePageProps {
  params: Promise<{id: string;}>;
}

export async function generateMetadata() {
  return {
      title: 'Interstellar Domination',
      description: 'Explore and conquer the galaxy',
  };
}

export default async function Page({ params }: GamePageProps) {
  const finalParams = await params;
  const game = await getGame(finalParams.id);  
  if (!game) return <div>Game not found</div>;

  return (
    <div className="h-screen w-screen">
      <GalaxyMap map={game.map} players={game.players} currentTurn={game.currentTurn} gameId={finalParams.id} />
    </div>
  );
}