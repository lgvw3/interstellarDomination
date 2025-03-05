"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Sphere, Stars } from "@react-three/drei";
import { Suspense, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { moveFleet } from "@/lib/actions";

export default function GalaxyMap({ map, players, currentTurn, gameId }: { map: { systems: any[]; wormholes: any[]; asteroids: any[] }; players: any[]; currentTurn: string; gameId: string }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [movingFleets, setMovingFleets] = useState<{ sourceId: string; targetId: string; count: number; progress: number }[]>([]);
  const player = players.find((p) => p.id === currentTurn);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2(0, 0));

  const homeSystem = map.systems.find((s) => s.owner === currentTurn);
  const initialPosition: [number, number, number] = homeSystem
    ? [homeSystem.position[0], homeSystem.position[1] + 10, homeSystem.position[2] + 10]
    : [0, 10, 10];

  const handleMouseMove = (e: MouseEvent) => {
    if (!cameraRef.current || !document.pointerLockElement) return;
    const sensitivity = 0.002;
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -e.movementX * sensitivity);
    cameraRef.current.quaternion.multiplyQuaternions(yawQuaternion, cameraRef.current.quaternion);
    const rightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(rightAxis, -e.movementY * sensitivity);
    cameraRef.current.quaternion.multiplyQuaternions(pitchQuaternion, cameraRef.current.quaternion);
    cameraRef.current.quaternion.normalize();
  };

  const handleCanvasClick = (e: MouseEvent, scene: THREE.Scene) => {
    const canvas = document.querySelector("canvas");
    if (canvas && !document.pointerLockElement) canvas.requestPointerLock();
    if (document.pointerLockElement) handleInteract(scene);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "w": moveState.current.forward = true; break;
        case "s": moveState.current.backward = true; break;
        case "a": moveState.current.left = true; break;
        case "d": moveState.current.right = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "w": moveState.current.forward = false; break;
        case "s": moveState.current.backward = false; break;
        case "a": moveState.current.left = false; break;
        case "d": moveState.current.right = false; break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.exitPointerLock();
    };
  }, []);

  const handleInteract = (scene: THREE.Scene) => {
    if (!cameraRef.current || !player) return;
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    const system = intersects.find((i) => i.object.parent?.userData.id)?.object.parent;
    if (system) {
      const systemId = system.userData.id as string;
      if (player.systems.includes(systemId)) {
        setSelectedSystem(systemId);
      } else if (selectedSystem) {
        moveFleet(gameId, currentTurn, selectedSystem, systemId, 2).then((result) => { // Use dynamic gameId
          if (result.success) {
            setMovingFleets((prev) => [
              ...prev,
              { sourceId: selectedSystem, targetId: systemId, count: 2, progress: 0 },
            ]);
            setSelectedSystem(null);
          }
        });
      }
    }
  };

  function GalaxyScene() {
    const { scene } = useThree();

    useFrame((state, delta) => {
      if (!cameraRef.current) return;
      const speed = 1.0;
      const direction = new THREE.Vector3();
      if (moveState.current.forward) direction.z = -1;
      if (moveState.current.backward) direction.z = 1;
      if (moveState.current.left) direction.x = -1;
      if (moveState.current.right) direction.x = 1;
      direction.normalize().applyQuaternion(cameraRef.current.quaternion);
      cameraRef.current.position.add(direction.multiplyScalar(speed));

      setMovingFleets((prev) =>
        prev.map((fleet) => ({
          ...fleet,
          progress: Math.min(fleet.progress + delta * 0.5, 1),
        })).filter((fleet) => fleet.progress < 1)
      );
    });

    useEffect(() => {
      const handleClickWithScene = (e: MouseEvent) => handleCanvasClick(e, scene);
      window.addEventListener("click", handleClickWithScene);
      return () => window.removeEventListener("click", handleClickWithScene);
    }, [scene]);

    function Planet({ size, distance, color, systemPosition }: { size: number; distance: number; color: string; systemPosition: [number, number, number] }) {
      const ref = useRef<THREE.Mesh>(null!);
      useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.position.x = systemPosition[0] + Math.cos(t * 0.5) * distance;
        ref.current.position.z = systemPosition[2] + Math.sin(t * 0.5) * distance;
        ref.current.position.y = systemPosition[1];
      });
      return (
        <mesh ref={ref}>
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    }

    function SolarSystem({
      position, sunSize, planets, id, owner, fleets,
    }: { position: [number, number, number]; sunSize: number; planets: any[]; id: string; owner: string | null; fleets?: number }) {
      const ref = useRef<THREE.Group>(null!);
      return (
        <group ref={ref} position={position} userData={{ id }}>
          <Sphere args={[sunSize, 32, 32]}>
            <meshStandardMaterial color={owner ? "red" : "yellow"} emissive="orange" emissiveIntensity={0.5} />
          </Sphere>
          {planets.map((p) => (
            <Planet key={p.id} size={p.size} distance={p.distance} color={p.color} systemPosition={[0, 0, 0]} />
          ))}
          {fleets && (
            <mesh position={[0, sunSize + 0.5, 0]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} />
            </mesh>
          )}
        </group>
      );
    }

    function Wormhole({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
      const ref = useRef<THREE.Line>(null!);
      useFrame(() => {
        ref.current.material.dashOffset -= 0.05;
      });
      return (
        <Line ref={ref} points={[start, end]} color="cyan" lineWidth={2} dashed dashSize={0.5} gapSize={0.5} />
      );
    }

    function Asteroid({ position, size }: { position: [number, number, number]; size: number }) {
      const ref = useRef<THREE.Mesh>(null!);
      useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.rotation.x += 0.01;
        ref.current.rotation.y += 0.01;
      });
      return (
        <mesh ref={ref} position={position}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshStandardMaterial color="gray" roughness={0.8} />
        </mesh>
      );
    }

    function MovingFleet({ sourceId, targetId, count, progress }: { sourceId: string; targetId: string; count: number; progress: number }) {
      const sourcePos = map.systems.find((s) => s.id === sourceId)!.position;
      const targetPos = map.systems.find((s) => s.id === targetId)!.position;
      const position = [
        THREE.MathUtils.lerp(sourcePos[0], targetPos[0], progress),
        THREE.MathUtils.lerp(sourcePos[1], targetPos[1], progress),
        THREE.MathUtils.lerp(sourcePos[2], targetPos[2], progress),
      ] as [number, number, number];

      return (
        <group position={position}>
          {Array.from({ length: count }, (_, i) => (
            <mesh key={i} position={[Math.sin(i) * 0.5, Math.cos(i) * 0.5, 0]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} />
            </mesh>
          ))}
        </group>
      );
    }

    return (
      <>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={1000} depth={500} count={10000} factor={4} saturation={0} fade />
        {map.systems.map((system) => (
          <SolarSystem
            key={system.id}
            id={system.id}
            position={system.position}
            sunSize={system.sunSize}
            planets={system.planets}
            owner={system.owner}
            fleets={player?.fleets?.[system.id]}
          />
        ))}
        {map.wormholes.map((wh, i) => (
          <Wormhole key={i} start={map.systems.find((s) => s.id === wh.from).position} end={map.systems.find((s) => s.id === wh.to).position} />
        ))}
        {map.asteroids.map((asteroid) => (
          <Asteroid key={asteroid.id} position={asteroid.position} size={asteroid.size} />
        ))}
        {movingFleets.map((fleet, i) => (
          <MovingFleet key={i} sourceId={fleet.sourceId} targetId={fleet.targetId} count={fleet.count} progress={fleet.progress} />
        ))}
      </>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Canvas
        camera={{ position: initialPosition, fov: 75, near: 1, far: 2000 }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
          if (homeSystem) camera.lookAt(homeSystem.position[0], homeSystem.position[1], homeSystem.position[2]);
        }}
      >
        <GalaxyScene />
      </Canvas>
      <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
      {selectedSystem && (
        <div className="absolute top-4 left-4 p-2 bg-gray-800 text-white rounded">
          Selected: {selectedSystem}
        </div>
      )}
    </Suspense>
  );
}