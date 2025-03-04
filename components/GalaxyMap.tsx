"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Sphere, Stars } from "@react-three/drei";
import { Suspense, useRef, useEffect } from "react";
import * as THREE from "three";

export default function GalaxyMap({ map, players, currentTurn }: { map: { systems: any[]; wormholes: any[]; asteroids: any[] }; players: any[]; currentTurn: string }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });

  // Start camera near player's home system
  const homeSystem = map.systems.find((s) => s.owner === currentTurn);
  const initialPosition: [number, number, number] = homeSystem
    ? [homeSystem.position[0], homeSystem.position[1] + 10, homeSystem.position[2] + 10]
    : [0, 10, 10];

  // Mouse look with quaternions
  const handleMouseMove = (e: MouseEvent) => {
    if (!cameraRef.current || !document.pointerLockElement) return;
    const sensitivity = 0.002;

    // Yaw (around world Y-axis)
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -e.movementX * sensitivity);
    cameraRef.current.quaternion.multiplyQuaternions(yawQuaternion, cameraRef.current.quaternion);

    // Pitch (around local X-axis)
    const rightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion); // Camera's local right
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(rightAxis, -e.movementY * sensitivity);
    cameraRef.current.quaternion.multiplyQuaternions(pitchQuaternion, cameraRef.current.quaternion);

    // Optional: Normalize quaternion to prevent drift (usually not needed with small steps)
    cameraRef.current.quaternion.normalize();
  };

  // Lock pointer on click
  const handleCanvasClick = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
  };

  // WASD movement
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

  // Scene with movement and rendering
  function GalaxyScene() {
    useFrame(() => {
      if (!cameraRef.current) return;
      const speed = 1.0; // Speed for larger map
      const direction = new THREE.Vector3();

      // Forward/backward
      if (moveState.current.forward) direction.z = -1;
      if (moveState.current.backward) direction.z = 1;

      // Strafe left/right
      if (moveState.current.left) direction.x = -1;
      if (moveState.current.right) direction.x = 1;

      // Normalize and apply camera orientation
      direction.normalize().applyQuaternion(cameraRef.current.quaternion);
      cameraRef.current.position.add(direction.multiplyScalar(speed));
    });

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
      position, sunSize, planets,
    }: { position: [number, number, number]; sunSize: number; planets: any[] }) {
      return (
        <group position={position}>
          <Sphere args={[sunSize, 32, 32]}>
            <meshStandardMaterial color="yellow" emissive="orange" emissiveIntensity={0.5} />
          </Sphere>
          {planets.map((p) => (
            <Planet key={p.id} size={p.size} distance={p.distance} color={p.color} systemPosition={[0, 0, 0]} />
          ))}
        </group>
      );
    }

    function Wormhole({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
      const ref = useRef<THREE.Line>(null!);
      useFrame(() => {
        ref.current.material.dashOffset -= 0.05;
      });
      return (
        <Line
          ref={ref}
          points={[start, end]}
          color="cyan"
          lineWidth={2}
          dashed
          dashSize={0.5}
          gapSize={0.5}
        />
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

    return (
      <>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={1000} depth={500} count={10000} factor={4} saturation={0} fade />
        {map.systems.map((system) => (
          <SolarSystem
            key={system.id}
            position={system.position}
            sunSize={system.sunSize}
            planets={system.planets}
          />
        ))}
        {map.wormholes.map((wh, i) => {
          const start = map.systems.find((s) => s.id === wh.from).position;
          const end = map.systems.find((s) => s.id === wh.to).position;
          return <Wormhole key={i} start={start} end={end} />;
  })}
        {map.asteroids.map((asteroid) => (
          <Asteroid key={asteroid.id} position={asteroid.position} size={asteroid.size} />
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
        onClick={handleCanvasClick}
      >
        <GalaxyScene />
      </Canvas>
    </Suspense>
  );
}