"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { animate } from "motion/react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ 
  size = 12, 
  maxDistance = 5,
  pupilColor = "#020617",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.08s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({ 
  size = 48, 
  pupilSize = 16, 
  maxDistance = 10,
  eyeColor = "#fbfbfb",
  pupilColor = "#121214",
  isBlinking = false,
  forceLookX,
  forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.08s ease-out',
          }}
        />
      )}
    </div>
  );
};

interface CharacterPanelProps {
  isTyping: boolean;
  passwordLength: number;
  showPassword: boolean;
}

export function CharacterPanel({
  isTyping,
  passwordLength,
  showPassword
}: CharacterPanelProps) {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking effect for purple character (slate-700/800 high tech mono)
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for black character (zinc-900 mono)
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Looking at each other animation when typing starts
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  // Purple sneaky peeking animation when typing password and it's visible
  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => {
            setIsPurplePeeking(false);
          }, 800);
        }, Math.random() * 3000 + 2000);
        return peekInterval;
      };

      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsPurplePeeking(false);
    }
  }, [passwordLength, showPassword]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  return (
    <div className="relative z-20 flex items-end justify-center h-full w-full max-w-lg mx-auto pb-0 select-none">
      <div className="relative" style={{ width: '450px', height: '360px' }}>
        
        {/* Purple tall rectangle character (now Vibrant Violet Purple) */}
        <div 
          ref={purpleRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '50px',
            width: '150px',
            height: isTyping || (passwordLength > 0 && !showPassword) ? '370px' : '330px',
            backgroundColor: '#7045f2', // Vibrant Violet Purple
            borderRadius: '16px 16px 0 0',
            zIndex: 1,
            transform: (passwordLength > 0 && showPassword)
              ? `skewX(0deg)`
              : (isTyping || (passwordLength > 0 && !showPassword))
                ? `skewX(${(purplePos.bodySkew || 0) - 10}deg) translateX(30px)` 
                : `skewX(${purplePos.bodySkew || 0}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute flex gap-6 transition-all duration-700 ease-in-out"
            style={{
              left: (passwordLength > 0 && showPassword) ? `18px` : isLookingAtEachOther ? `44px` : `${36 + purplePos.faceX}px`,
              top: (passwordLength > 0 && showPassword) ? `30px` : isLookingAtEachOther ? `55px` : `${32 + purplePos.faceY}px`,
            }}
          >
            <EyeBall 
              size={18} 
              pupilSize={8} 
              maxDistance={5} 
              eyeColor="#ffffff" 
              pupilColor="#000000" 
              isBlinking={isPurpleBlinking}
              forceLookX={(passwordLength > 0 && showPassword) ? (isPurplePeeking ? 3 : -3) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={(passwordLength > 0 && showPassword) ? (isPurplePeeking ? 4 : -3) : isLookingAtEachOther ? 3 : undefined}
            />
            <EyeBall 
              size={18} 
              pupilSize={8} 
              maxDistance={5} 
              eyeColor="#ffffff" 
              pupilColor="#000000" 
              isBlinking={isPurpleBlinking}
              forceLookX={(passwordLength > 0 && showPassword) ? (isPurplePeeking ? 3 : -3) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={(passwordLength > 0 && showPassword) ? (isPurplePeeking ? 4 : -3) : isLookingAtEachOther ? 3 : undefined}
            />
          </div>
        </div>

        {/* Black tall rectangle character (now Deep Cyber Matte Black) */}
        <div 
          ref={blackRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '190px',
            width: '100px',
            height: '260px',
            backgroundColor: '#1f1f23', // Charcoal Black
            borderRadius: '12px 12px 0 0',
            zIndex: 2,
            transform: (passwordLength > 0 && showPassword)
              ? `skewX(0deg)`
              : isLookingAtEachOther
                ? `skewX(${(blackPos.bodySkew || 0) * 1.3 + 8}deg) translateX(15px)`
                : (isTyping || (passwordLength > 0 && !showPassword))
                  ? `skewX(${(blackPos.bodySkew || 0) * 1.3}deg)` 
                  : `skewX(${blackPos.bodySkew || 0}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute flex gap-5 transition-all duration-700 ease-in-out"
            style={{
              left: (passwordLength > 0 && showPassword) ? `8px` : isLookingAtEachOther ? `24px` : `${20 + blackPos.faceX}px`,
              top: (passwordLength > 0 && showPassword) ? `24px` : isLookingAtEachOther ? `10px` : `${28 + blackPos.faceY}px`,
            }}
          >
            <EyeBall 
              size={14} 
              pupilSize={6} 
              maxDistance={4} 
              eyeColor="#ffffff" 
              pupilColor="#000000" 
              isBlinking={isBlackBlinking}
              forceLookX={(passwordLength > 0 && showPassword) ? -3 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={(passwordLength > 0 && showPassword) ? -3 : isLookingAtEachOther ? -3 : undefined}
            />
            <EyeBall 
              size={14} 
              pupilSize={6} 
              maxDistance={4} 
              eyeColor="#ffffff" 
              pupilColor="#000000" 
              isBlinking={isBlackBlinking}
              forceLookX={(passwordLength > 0 && showPassword) ? -3 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={(passwordLength > 0 && showPassword) ? -3 : isLookingAtEachOther ? -3 : undefined}
            />
          </div>
        </div>

        {/* Orange semi-circle character (now Peach/Coral Orange) */}
        <div 
          ref={orangeRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '0px',
            width: '200px',
            height: '170px',
            zIndex: 3,
            backgroundColor: '#ff7d54', // Peach/Coral Orange
            borderRadius: '100px 100px 0 0',
            transform: (passwordLength > 0 && showPassword) ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes - simple black dot pupils */}
          <div 
            className="absolute flex gap-6 transition-all duration-200 ease-out"
            style={{
              left: (passwordLength > 0 && showPassword) ? `40px` : `${68 + (orangePos.faceX || 0)}px`,
              top: (passwordLength > 0 && showPassword) ? `70px` : `${76 + (orangePos.faceY || 0)}px`,
            }}
          >
            <div className="bg-transparent p-0.5 rounded-full">
              <Pupil size={12} maxDistance={4} pupilColor="#121214" forceLookX={(passwordLength > 0 && showPassword) ? -4 : undefined} forceLookY={(passwordLength > 0 && showPassword) ? -3 : undefined} />
            </div>
            <div className="bg-transparent p-0.5 rounded-full">
              <Pupil size={12} maxDistance={4} pupilColor="#121214" forceLookX={(passwordLength > 0 && showPassword) ? -4 : undefined} forceLookY={(passwordLength > 0 && showPassword) ? -3 : undefined} />
            </div>
          </div>
        </div>

        {/* Yellow tall rectangle character (now Mustard Yellow) */}
        <div 
          ref={yellowRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '260px',
            width: '120px',
            height: '195px',
            backgroundColor: '#ebd04f', // Sunny Mustard Yellow
            borderRadius: '60px 60px 0 0',
            zIndex: 4,
            transform: (passwordLength > 0 && showPassword) ? `skewX(0deg)` : `skewX(${yellowPos.bodySkew || 0}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes - simple black dot pupils */}
          <div 
            className="absolute flex gap-5 transition-all duration-200 ease-out"
            style={{
              left: (passwordLength > 0 && showPassword) ? `16px` : `${44 + (yellowPos.faceX || 0)}px`,
              top: (passwordLength > 0 && showPassword) ? `28px` : `${34 + (yellowPos.faceY || 0)}px`,
            }}
          >
            <div className="bg-transparent p-0.5 rounded-full">
              <Pupil size={11} maxDistance={4} pupilColor="#121214" forceLookX={(passwordLength > 0 && showPassword) ? -4 : undefined} forceLookY={(passwordLength > 0 && showPassword) ? -3 : undefined} />
            </div>
            <div className="bg-transparent p-0.5 rounded-full">
              <Pupil size={11} maxDistance={4} pupilColor="#121214" forceLookX={(passwordLength > 0 && showPassword) ? -4 : undefined} forceLookY={(passwordLength > 0 && showPassword) ? -3 : undefined} />
            </div>
          </div>
          {/* Horizontal line for mouth */}
          <div 
            className="absolute w-16 h-[3px] bg-slate-900 rounded-full transition-all duration-200 ease-out"
            style={{
              left: (passwordLength > 0 && showPassword) ? `8px` : `${32 + (yellowPos.faceX || 0)}px`,
              top: `${72 + (yellowPos.faceY || 0)}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
