import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Fancy Floating Particles Background Effect
 * Creates animated particles that float across the screen
 */

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

export function FancyParticles({ count = 15 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = [
      'rgba(216, 27, 96, 0.3)',    // Primary
      'rgba(0, 217, 255, 0.3)',     // Cyan
      'rgba(176, 38, 255, 0.3)',    // Purple
      'rgba(255, 122, 0, 0.3)',     // Orange
    ];

    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
      size: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setParticles(newParticles);
  }, [count]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full blur-sm"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
          initial={{
            y: '100vh',
            opacity: 0,
          }}
          animate={{
            y: '-100vh',
            opacity: [0, 1, 1, 0],
            x: [0, Math.random() * 100 - 50, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Animated Background Gradient
 * Creates a subtle animated gradient background
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(216, 27, 96, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(0, 217, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(176, 38, 255, 0.1) 0%, transparent 50%)
          `,
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

/**
 * Loading Indicator Sparkle Effect
 * Creates a sparkle animation for loading states
 */
export function SparkleLoader() {
  return (
    <div className="relative w-16 h-16">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 border-4 border-primary rounded-full"
          style={{
            borderColor: 'hsl(var(--primary) / 0.3)',
          }}
          animate={{
            scale: [0, 1.5],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary animate-glow-pulse" />
      </motion.div>
    </div>
  );
}

/**
 * Ripple Effect Container
 * Adds ripple animations on interaction
 */
export function RippleContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={addRipple}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
          }}
          initial={{
            width: 0,
            height: 0,
            opacity: 1,
          }}
          animate={{
            width: 400,
            height: 400,
            opacity: 0,
          }}
          transition={{
            duration: 0.6,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Cursor Trail Effect
 * Creates a glowing trail that follows the cursor
 */
export function CursorTrail() {
  const [trail, setTrail] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const id = Date.now();
      setTrail((prev) => [
        ...prev.slice(-10), // Keep only last 10 points
        { id, x: e.clientX, y: e.clientY },
      ]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {trail.map((point, index) => (
        <motion.div
          key={point.id}
          className="absolute w-3 h-3 rounded-full bg-primary/50 blur-sm"
          style={{
            left: point.x,
            top: point.y,
          }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{
            scale: 0,
            opacity: 0,
          }}
          transition={{
            duration: 0.5,
            delay: index * 0.02,
          }}
        />
      ))}
    </div>
  );
}
