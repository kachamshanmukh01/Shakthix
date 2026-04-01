import React from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

interface HeroSectionProps {
  onStart: () => void;
}

export function HeroSection({ onStart }: HeroSectionProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Image using CSS Variable */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'var(--hero-bg-image, url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop"))' 
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 z-10 bg-black/60" />

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-20 text-center px-4 max-w-4xl"
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-black mx-auto mb-8 shadow-2xl overflow-hidden"
        >
          <img 
            src="https://res.cloudinary.com/dzq8jeszu/image/upload/v1772733407/WhatsApp_Image_2026-03-05_at_10.55.14_PM_llewma.jpg" 
            alt="Logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        
        <h1 className="text-white text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter mb-4 uppercase leading-none">
          SHAKTHIX
        </h1>
        
        <p className="text-white/80 text-base md:text-2xl font-medium mb-10 max-w-2xl mx-auto">
          Unleash your inner strength. Track your progress, conquer your goals, and transform your life.
        </p>
        
        <button 
          onClick={onStart}
          className="bg-[#70b8f8] text-black px-8 py-4 md:px-10 md:py-5 rounded-full font-bold text-lg md:text-xl hover:scale-105 transition-all shadow-xl active:scale-95"
        >
          GET STARTED
        </button>
      </motion.div>

      {/* CSS Variable Definition */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --hero-bg-image: url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop');
        }
      `}} />
    </div>
  );
}
