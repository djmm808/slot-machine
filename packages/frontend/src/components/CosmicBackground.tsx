import React, { useEffect, useState } from 'react';
import './CosmicBackground.css';

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  rotation: number;
}

interface Planet {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface UFO {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
  rotation: number;
}

const CosmicBackground: React.FC = () => {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [ufos, setUfos] = useState<UFO[]>([]);

  useEffect(() => {
    // Generate shooting stars from random angles outside viewport
    const stars: ShootingStar[] = Array.from({ length: 2 }, (_, i) => {
      const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
      let startX, startY, endX, endY, rotation;

      if (side === 0) { // from top
        startX = Math.random() * 100;
        startY = -10;
        endX = Math.random() * 100;
        endY = 110;
        rotation = 45 + Math.random() * 90 - 45;
      } else if (side === 1) { // from right
        startX = 110;
        startY = Math.random() * 100;
        endX = -10;
        endY = Math.random() * 100;
        rotation = 135 + Math.random() * 90 - 45;
      } else if (side === 2) { // from bottom
        startX = Math.random() * 100;
        startY = 110;
        endX = Math.random() * 100;
        endY = -10;
        rotation = 225 + Math.random() * 90 - 45;
      } else { // from left
        startX = -10;
        startY = Math.random() * 100;
        endX = 110;
        endY = Math.random() * 100;
        rotation = 315 + Math.random() * 90 - 45;
      }

      return {
        id: i,
        startX,
        startY,
        endX,
        endY,
        delay: Math.random() * 6000,
        rotation,
      };
    });
    setShootingStars(stars);

    // Generate floating planets
    const planetData: Planet[] = [
      { id: 1, x: 10, y: 20, size: 60, delay: 0 },
      { id: 2, x: 85, y: 70, size: 40, delay: 1000 },
    ];
    setPlanets(planetData);

    // Generate UFOs traveling in straight lines from outside viewport
    const ufoData: UFO[] = [
      { id: 1, startX: -10, startY: 20, endX: 110, endY: 30, delay: 0, duration: 25, rotation: 5 },
      { id: 2, startX: 110, startY: 70, endX: -10, endY: 60, delay: 8000, duration: 30, rotation: 175 },
      { id: 3, startX: 30, startY: -10, endX: 70, endY: 110, delay: 4000, duration: 28, rotation: 90 },
    ];
    setUfos(ufoData);
  }, []);

  const ShootingStarSVG = () => (
    <svg viewBox="0 0 100 20" className="shooting-star-svg">
      <defs>
        <linearGradient id="starTrail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="100%" stopColor="rgba(255,255,255,1)" />
        </linearGradient>
      </defs>
      <path
        d="M0,10 L100,10"
        stroke="url(#starTrail)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="95" cy="10" r="3" fill="white" filter="url(#glow)" />
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );

  const UFOSVG = () => (
    <svg viewBox="0 0 60 40" className="ufo-svg">
      <ellipse cx="30" cy="22" rx="25" ry="6" fill="#4a4a6a" opacity="0.9" />
      <ellipse cx="30" cy="18" rx="12" ry="5" fill="#6a6a8a" opacity="0.8" />
      <circle cx="18" cy="22" r="2" fill="#00ffff" opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="30" cy="22" r="2" fill="#00ffff" opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" begin="0.3s" />
      </circle>
      <circle cx="42" cy="22" r="2" fill="#00ffff" opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" begin="0.6s" />
      </circle>
    </svg>
  );

  return (
    <div className="cosmic-background">
      {/* Shooting Stars */}
      {shootingStars.map((star) => (
        <div
          key={star.id}
          className="shooting-star"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            '--end-x': `${star.endX}%`,
            '--end-y': `${star.endY}%`,
            '--rotation': `${star.rotation}deg`,
            animationDelay: `${star.delay}ms`,
          } as React.CSSProperties}
        >
          <ShootingStarSVG />
        </div>
      ))}

      {/* Floating Planets */}
      {planets.map((planet) => (
        <div
          key={planet.id}
          className="planet"
          style={{
            left: `${planet.x}%`,
            top: `${planet.y}%`,
            width: `${planet.size}px`,
            height: `${planet.size}px`,
            animationDelay: `${planet.delay}ms`,
          }}
        />
      ))}

      {/* UFOs */}
      {ufos.map((ufo) => (
        <div
          key={ufo.id}
          className="ufo"
          style={{
            left: `${ufo.startX}%`,
            top: `${ufo.startY}%`,
            '--end-x': `${ufo.endX}%`,
            '--end-y': `${ufo.endY}%`,
            '--rotation': `${ufo.rotation}deg`,
            animationDelay: `${ufo.delay}ms`,
            animationDuration: `${ufo.duration}s`,
          } as React.CSSProperties}
        >
          <UFOSVG />
        </div>
      ))}

      {/* Pulsing Galaxies */}
      <div className="galaxy galaxy-1" />
      <div className="galaxy galaxy-2" />
    </div>
  );
};

export default CosmicBackground;
