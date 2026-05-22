import { motion } from "motion/react";
import React, { useEffect, useState } from "react";

interface PixarAvatarProps {
  volume: number;
  isThinking?: boolean;
  traits?: {
    hairColor: string;
    skinTone: string;
    eyeColor: string;
    faceShape: 'round' | 'oval' | 'heart' | 'square';
    hairStyle: 'short' | 'long' | 'bob' | 'top-knot' | 'bald' | 'curly';
    eyeShape: 'normal' | 'almond' | 'rounded';
    hasGlasses: boolean;
    hasBeard: boolean;
    eyeSize: number; // 0.8 to 1.2
    lipColor: string;
  };
}

export const PixarAvatar: React.FC<PixarAvatarProps> = ({ 
  volume, 
  isThinking = false, 
  traits = { 
    hairColor: "#4A2C2A", 
    skinTone: "#FAD6A5", 
    eyeColor: "#634E34",
    faceShape: 'oval',
    hairStyle: 'short',
    eyeShape: 'normal',
    hasGlasses: false,
    hasBeard: false,
    eyeSize: 1,
    lipColor: "#5C1F1F"
  } 
}) => {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const getFaceBorderRadius = () => {
    switch (traits.faceShape) {
      case 'round': return "100px";
      case 'heart': return "60% 60% 40% 40%";
      case 'square': return "40px";
      default: return "2.5rem";
    }
  };

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Pixar Style Glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-brand/10 blur-3xl"
        animate={{ opacity: isThinking ? [0.1, 0.4, 0.1] : 0.1 }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <motion.div
        className="relative z-10 w-48 h-56 flex flex-col items-center"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Hair Logic */}
        <div 
          className={`absolute -top-6 w-52 overflow-hidden transition-all duration-1000 ${
            traits.hairStyle === 'long' ? 'h-64' : 'h-32'
          }`}
          style={{ zIndex: 1 }}
        >
           <div 
             className="w-full h-full rounded-t-[80px]"
             style={{ 
               backgroundColor: traits.hairColor,
               borderRadius: traits.hairStyle === 'curly' ? '40% 40% 20% 20%' : ''
             }}
           />
        </div>

        {/* Face */}
        <div 
          className="relative z-10 w-44 h-52 shadow-2xl transition-all duration-1000 pixar-rim-light pixar-skin"
          style={{ 
            backgroundColor: traits.skinTone,
            borderRadius: getFaceBorderRadius(),
            boxShadow: `inset 0 -10px 20px rgba(0,0,0,0.1), 0 20px 40px rgba(0,0,0,0.1)`
          }}
        >
          {/* Beard Area */}
          {traits.hasBeard && (
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-24 rounded-full transition-all duration-1000"
              style={{ 
                backgroundColor: traits.hairColor, 
                opacity: 0.2,
                filter: 'blur(8px)',
                zIndex: 5
              }}
            />
          )}

          {/* Eyes Container */}
          <div className="flex justify-between px-8 pt-16">
            {[0, 1].map((i) => (
              <div key={i} 
                className="relative transition-all duration-1000"
                style={{ width: 40 * (traits.eyeSize || 1), height: 40 * (traits.eyeSize || 1) }}
              >
                <div className="w-full h-full bg-white rounded-full overflow-hidden flex items-center justify-center border border-black/5">
                  <motion.div 
                    className="rounded-full relative"
                    style={{ 
                        backgroundColor: traits.eyeColor,
                        width: 20 * (traits.eyeSize || 1), 
                        height: 20 * (traits.eyeSize || 1) 
                    }}
                    animate={{
                      scale: blink ? 0.1 : 1,
                      y: volume > 0.1 ? -1 : 0,
                    }}
                  >
                    <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-white rounded-full opacity-70" />
                  </motion.div>
                </div>
                {/* Glasses */}
                {traits.hasGlasses && (
                    <div className="absolute inset-[-4px] border-2 border-black/80 rounded-full z-20" />
                )}
              </div>
            ))}
            {traits.hasGlasses && (
                <div className="absolute top-[72px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-black/80 z-20" />
            )}
          </div>

          {/* Nose - Subtle Pixar style */}
          <div 
            className="absolute top-28 left-1/2 -translate-x-1/2 w-4 h-6 rounded-full opacity-20"
            style={{ backgroundColor: '#000' }}
          />

          {/* Mouth */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-20 flex items-center justify-center">
            <motion.div
              className="rounded-full transition-colors duration-1000"
              style={{ backgroundColor: traits.lipColor || "#5C1F1F" }}
              animate={{
                width: volume > 0.1 ? 32 : 20,
                height: volume > 0.05 ? Math.max(4, volume * 45) : 4,
              }}
              style={{ boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.4)' }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
