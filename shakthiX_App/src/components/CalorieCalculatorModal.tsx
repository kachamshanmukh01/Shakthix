import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calculator, ArrowRight, Check, Info } from 'lucide-react';
import { calculateDailyNeeds } from '../services/gemini';

interface CalorieCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetGoal: (goal: number) => void;
  userProfile?: { height: number, weight: number } | null;
}

export function CalorieCalculatorModal({ isOpen, onClose, onSetGoal, userProfile }: CalorieCalculatorModalProps) {
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [profile, setProfile] = useState({
    age: 25,
    weight: userProfile?.weight || 70,
    height: userProfile?.height || 175,
    gender: 'male',
    activityLevel: 'moderate'
  });

  // Sync with userProfile when modal opens
  React.useEffect(() => {
    if (isOpen && userProfile) {
      setProfile(prev => ({
        ...prev,
        weight: userProfile.weight,
        height: userProfile.height
      }));
    }
  }, [isOpen, userProfile]);
  const [results, setResults] = useState<any>(null);

  const handleCalculate = async () => {
    setIsCalculating(true);
    const data = await calculateDailyNeeds(profile);
    if (data) {
      setResults(data);
      setStep(2);
    }
    setIsCalculating(false);
  };

  const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
    { id: 'light', label: 'Light', desc: 'Exercise 1-3 times/week' },
    { id: 'moderate', label: 'Moderate', desc: 'Exercise 4-5 times/week' },
    { id: 'active', label: 'Active', desc: 'Daily exercise or intense exercise 3-4 times/week' },
    { id: 'very_active', label: 'Very Active', desc: 'Intense exercise 6-7 times/week' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
                  <Calculator size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">AI Calorie Calculator</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini</p>
                </div>
              </div>

              {step === 1 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Age</label>
                      <input 
                        type="number" 
                        value={profile.age}
                        onChange={(e) => setProfile({...profile, age: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                      <select 
                        value={profile.gender}
                        onChange={(e) => setProfile({...profile, gender: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weight (kg)</label>
                      <input 
                        type="number" 
                        value={profile.weight}
                        onChange={(e) => setProfile({...profile, weight: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Height (cm)</label>
                      <input 
                        type="number" 
                        value={profile.height}
                        onChange={(e) => setProfile({...profile, height: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity Level</label>
                    <div className="space-y-2">
                      {activityLevels.map((level) => (
                        <button
                          key={level.id}
                          onClick={() => setProfile({...profile, activityLevel: level.id})}
                          className={`w-full p-4 rounded-2xl text-left transition-all border ${
                            profile.activityLevel === level.id 
                              ? "bg-brand-50 border-brand-200 ring-1 ring-brand-200" 
                              : "bg-slate-50 border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`text-sm font-bold ${profile.activityLevel === level.id ? "text-brand-700" : "text-slate-900"}`}>
                                {level.label}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">{level.desc}</div>
                            </div>
                            {profile.activityLevel === level.id && <Check size={16} className="text-brand-500" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleCalculate}
                    disabled={isCalculating}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCalculating ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Calculate Daily Needs
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-brand-50 rounded-3xl p-6 border border-brand-100">
                    <div className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-4">Your Daily Energy Needs</div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BMR</div>
                        <div className="text-2xl font-black text-slate-900">{results.bmr} <span className="text-xs font-normal opacity-40">kcal</span></div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TDEE</div>
                        <div className="text-2xl font-black text-slate-900">{results.tdee} <span className="text-xs font-normal opacity-40">kcal</span></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button 
                        onClick={() => { onSetGoal(results.maintenance); onClose(); }}
                        className="w-full bg-white p-4 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                      >
                        <div className="text-left">
                          <div className="text-xs font-bold uppercase tracking-wider opacity-60">Maintenance</div>
                          <div className="text-lg font-black">{results.maintenance} kcal</div>
                        </div>
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 group-hover:bg-white/20 group-hover:text-white transition-all">
                          <Check size={20} />
                        </div>
                      </button>

                      <button 
                        onClick={() => { onSetGoal(results.weightLoss); onClose(); }}
                        className="w-full bg-white p-4 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                      >
                        <div className="text-left">
                          <div className="text-xs font-bold uppercase tracking-wider opacity-60">Weight Loss</div>
                          <div className="text-lg font-black">{results.weightLoss} kcal</div>
                        </div>
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-white/20 group-hover:text-white transition-all">
                          <Check size={20} />
                        </div>
                      </button>

                      <button 
                        onClick={() => { onSetGoal(results.weightGain); onClose(); }}
                        className="w-full bg-white p-4 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                      >
                        <div className="text-left">
                          <div className="text-xs font-bold uppercase tracking-wider opacity-60">Weight Gain</div>
                          <div className="text-lg font-black">{results.weightGain} kcal</div>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-white/20 group-hover:text-white transition-all">
                          <Check size={20} />
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-3">
                    <Info size={18} className="text-slate-400 mt-0.5" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {results.explanation}
                    </p>
                  </div>

                  <button 
                    onClick={() => setStep(1)}
                    className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Recalculate
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
