import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Ruler, Weight, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: { height: number, weight: number }) => void;
  onClose?: () => void;
  initialProfile?: { height: number, weight: number } | null;
}

export function OnboardingModal({ isOpen, onComplete, onClose, initialProfile }: OnboardingModalProps) {
  const [height, setHeight] = useState<string>(initialProfile?.height?.toString() || '170');
  const [weight, setWeight] = useState<string>(initialProfile?.weight?.toString() || '70');

  // Update local state when initialProfile changes (e.g. when opening to edit)
  React.useEffect(() => {
    if (initialProfile) {
      setHeight(initialProfile.height.toString());
      setWeight(initialProfile.weight.toString());
    }
  }, [initialProfile, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (height && weight) {
      onComplete({
        height: parseFloat(height),
        weight: parseFloat(weight)
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {onClose && (
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
              >
                <X size={20} />
              </button>
            )}
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-200">
                  <User size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {initialProfile ? 'Update Profile' : 'Welcome to shakthiX'}
                  </h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {initialProfile ? 'Keep your physical data accurate' : "Let's personalize your experience"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Ruler size={14} className="text-brand-500" />
                    Your Height (cm)
                  </label>
                  <input 
                    type="number" 
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Weight size={14} className="text-brand-500" />
                    Your Weight (kg)
                  </label>
                  <input 
                    type="number" 
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-lg"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                  >
                    Get Started
                    <ArrowRight size={20} />
                  </button>
                </div>
                
                <p className="text-[10px] text-center text-slate-400 font-medium">
                  Your data is used locally to provide more accurate AI health insights.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
