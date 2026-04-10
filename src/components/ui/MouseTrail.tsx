"use client";

import { useEffect, useState } from "react";

export function MouseTrail() {
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setTrail((prev) => [
        ...prev.slice(-15), // Keep last 15 points
        { x: e.clientX, y: e.clientY, id: Date.now() + Math.random() },
      ]);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 hidden md:block">
      {trail.map((point, index) => (
        <div
          key={point.id}
          className="absolute rounded-full bg-cyan-500/30 blur-sm"
          style={{
            left: point.x,
            top: point.y,
            width: `${index * 2}px`,
            height: `${index * 2}px`,
            transform: "translate(-50%, -50%)",
            opacity: index / 15,
          }}
        />
      ))}
    </div>
  );
}
