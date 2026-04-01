import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Flame,
  Utensils,
  Activity,
  Sparkles,
  Trash2,
  ChevronRight,
  TrendingUp,
  Calendar,
  Bell,
  Calculator,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { FoodEntry, WorkoutEntry, DailyStats } from './types';
import { estimateCalories, getHealthAdvice, getExerciseSuggestions, getWeeklyWorkoutPlan } from './services/gemini';
import { HeroSection } from './components/HeroSection';
import { CalendarModal } from './components/CalendarModal';
import { CalorieCalculatorModal } from './components/CalorieCalculatorModal';
import { ProfileManagerModal } from './components/ProfileManagerModal';
import { FitnessTracker } from './components/FitnessTracker';
import { PoseCoach } from './components/PoseCoach';
import { UserProfile } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STREAK_COMPLIMENTS = [
  "Your streak is on fire, but I think you might be the reason it's getting so hot in here. Don't let that flame go out — you're looking way too good to stop now! 🔥",
  "They say consistency is attractive, but with a streak as long as yours, you're becoming absolutely irresistible. I'm officially addicted to seeing you win every day. ✨"
];

export default function App() {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('profiles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    const legacyProfile = localStorage.getItem('userProfile');
    if (legacyProfile) {
      const parsed = JSON.parse(legacyProfile);
      return [{ id: crypto.randomUUID(), name: 'Default User', height: parsed.height, weight: parsed.weight }];
    }
    return [];
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    return localStorage.getItem('activeProfileId') || null;
  });

  useEffect(() => {
    if (profiles.length > 0 && !activeProfileId) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profiles, activeProfileId]);

  const userProfile = useMemo(() => profiles.find(p => p.id === activeProfileId) || null, [profiles, activeProfileId]);

  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number>(2500);
  const [streak, setStreak] = useState<number>(0);
  const [lastLogDate, setLastLogDate] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfileId) {
      const load = (key: string, defaultValue: any) => {
        const val = localStorage.getItem(`${key}_${activeProfileId}`);
        if (!val) {
          const legacyVal = localStorage.getItem(key);
          if (legacyVal) {
            localStorage.setItem(`${key}_${activeProfileId}`, legacyVal);
            return JSON.parse(legacyVal);
          }
        }
        return val ? JSON.parse(val) : defaultValue;
      };

      setFoodEntries(load('foodEntries', []));
      setWorkoutEntries(load('workoutEntries', []));
      setReminders(load('reminders', []));

      const savedGoal = localStorage.getItem(`dailyGoal_${activeProfileId}`) || localStorage.getItem('dailyGoal');
      const goal = savedGoal ? parseInt(savedGoal, 10) : 2500;
      setDailyGoal(isNaN(goal) ? 2500 : goal);

      const savedStreak = localStorage.getItem(`streak_${activeProfileId}`) || localStorage.getItem('streak');
      const st = savedStreak ? parseInt(savedStreak, 10) : 0;
      setStreak(isNaN(st) ? 0 : st);

      setLastLogDate(localStorage.getItem(`lastLogDate_${activeProfileId}`) || localStorage.getItem('lastLogDate'));
    }
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem('profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem('activeProfileId', activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem(`foodEntries_${activeProfileId}`, JSON.stringify(foodEntries));
  }, [foodEntries, activeProfileId]);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem(`workoutEntries_${activeProfileId}`, JSON.stringify(workoutEntries));
  }, [workoutEntries, activeProfileId]);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem(`dailyGoal_${activeProfileId}`, dailyGoal.toString());
  }, [dailyGoal, activeProfileId]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem(`streak_${activeProfileId}`, streak.toString());
      if (lastLogDate) localStorage.setItem(`lastLogDate_${activeProfileId}`, lastLogDate);
    }
  }, [streak, lastLogDate, activeProfileId]);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem(`reminders_${activeProfileId}`, JSON.stringify(reminders));
  }, [reminders, activeProfileId]);

  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<any[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState('any');
  const [selectedWorkoutDetail, setSelectedWorkoutDetail] = useState<any | null>(null);
  const [showHero, setShowHero] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCalorieCalcOpen, setIsCalorieCalcOpen] = useState(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoal.toString());

  const updateStreak = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (lastLogDate === today) return;

    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    if (lastLogDate === yesterday) {
      setStreak(prev => prev + 1);
    } else {
      setStreak(1);
    }
    setLastLogDate(today);
  };

  const stats = useMemo(() => {
    const consumed = foodEntries.reduce((acc, curr) => acc + curr.calories, 0);
    const protein = foodEntries.reduce((acc, curr) => acc + (curr.protein || 0), 0);
    const carbs = foodEntries.reduce((acc, curr) => acc + (curr.carbs || 0), 0);
    const fats = foodEntries.reduce((acc, curr) => acc + (curr.fats || 0), 0);
    const saturatedFats = foodEntries.reduce((acc, curr) => acc + (curr.saturatedFats || 0), 0);
    const burned = workoutEntries.reduce((acc, curr) => acc + curr.caloriesBurned, 0);
    const vitaminA = foodEntries.reduce((acc, curr) => acc + (curr.vitaminA || 0), 0);
    const vitaminC = foodEntries.reduce((acc, curr) => acc + (curr.vitaminC || 0), 0);
    const vitaminD = foodEntries.reduce((acc, curr) => acc + (curr.vitaminD || 0), 0);
    const iron = foodEntries.reduce((acc, curr) => acc + (curr.iron || 0), 0);
    const net = consumed - burned;
    const remaining = dailyGoal - net;
    return { consumed, burned, net, remaining, goal: dailyGoal, protein, carbs, fats, saturatedFats, vitaminA, vitaminC, vitaminD, iron };
  }, [foodEntries, workoutEntries, dailyGoal]);

  useEffect(() => {
    const fetchAdvice = async () => {
      const tip = await getHealthAdvice(stats, userProfile || undefined);
      setAdvice(tip || null);
    };
    const timer = setTimeout(fetchAdvice, 2000);
    return () => clearTimeout(timer);
  }, [stats.consumed, stats.burned, userProfile]);

  useEffect(() => {
    if (stats.consumed >= stats.goal && stats.goal > 0) {
      const today = new Date().toDateString();
      const lastCelebrated = localStorage.getItem('lastCelebrated');
      if (lastCelebrated !== today) {
        // First explosive burst
        confetti({
          particleCount: 300,
          spread: 150,
          origin: { y: 0.5 },
          scalar: 2,
          shapes: ['square', 'circle'],
          colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
        });
        // Secondary smaller burst for "pop" effect
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.5 },
            scalar: 1,
            shapes: ['star']
          });
        }, 500);
        localStorage.setItem('lastCelebrated', today);
      }
    }
  }, [stats.consumed, stats.goal]);

  const generateBurnPlan = async () => {
    if (stats.net <= 0) return;
    setIsGeneratingPlan(true);
    const suggestions = await getExerciseSuggestions(stats.net, selectedWorkoutType, userProfile || undefined);
    setExerciseSuggestions(suggestions);
    setIsGeneratingPlan(false);
  };

  const generateWeeklyPlan = async () => {
    setIsGeneratingWeekly(true);
    const plan = await getWeeklyWorkoutPlan("General fitness and weight management", userProfile || undefined);
    setWeeklyPlan(plan);
    setIsGeneratingWeekly(false);
  };

  const handleAiEstimate = async (type: 'food' | 'workout') => {
    if (!aiInput.trim()) return;
    setIsEstimating(true);
    setAiResult(null);
    const result = await estimateCalories(aiInput, type, userProfile || undefined);
    if (result) {
      setAiResult({ ...result, type });
    }
    setIsEstimating(false);
  };

  const confirmAiLog = () => {
    if (!aiResult) return;

    if (aiResult.type === 'food') {
      const newEntry: FoodEntry = {
        id: crypto.randomUUID(),
        name: aiResult.name,
        calories: aiResult.calories,
        protein: aiResult.protein || 0,
        carbs: aiResult.carbs || 0,
        fats: aiResult.fats || 0,
        saturatedFats: aiResult.saturatedFats || 0,
        vitaminA: aiResult.vitaminA || 0,
        vitaminC: aiResult.vitaminC || 0,
        vitaminD: aiResult.vitaminD || 0,
        iron: aiResult.iron || 0,
        timestamp: Date.now()
      };
      setFoodEntries([newEntry, ...foodEntries]);
      updateStreak();
    } else {
      const newEntry: WorkoutEntry = {
        id: crypto.randomUUID(),
        name: aiResult.name,
        caloriesBurned: aiResult.calories,
        duration: aiResult.duration || 30,
        reps: aiResult.reps,
        timestamp: Date.now()
      };
      setWorkoutEntries([newEntry, ...workoutEntries]);
      updateStreak();
    }
    setAiInput('');
    setAiResult(null);
  };

  const handlePoseWorkoutComplete = (workout: { type: string; reps: number; calories: number }) => {
    const newEntry: WorkoutEntry = {
      id: crypto.randomUUID(),
      name: `AI Coach: ${workout.reps} ${workout.type}`,
      caloriesBurned: workout.calories,
      duration: Math.ceil(workout.reps * 0.1), // Approx 0.1 min per rep
      reps: workout.reps,
      timestamp: Date.now()
    };
    setWorkoutEntries([newEntry, ...workoutEntries]);
    updateStreak();
    setAdvice(`Great job! You finished ${workout.reps} ${workout.type} with the AI Coach. Logged ${workout.calories} kcal.`);
  };

  const removeEntry = (id: string, type: 'food' | 'workout') => {
    if (type === 'food') {
      setFoodEntries(foodEntries.filter(e => e.id !== id));
    } else {
      setWorkoutEntries(workoutEntries.filter(e => e.id !== id));
    }
  };

  const handleSaveGoal = () => {
    const newGoal = parseInt(tempGoal, 10);
    if (!isNaN(newGoal) && newGoal > 0) {
      setDailyGoal(newGoal);
      setIsEditingGoal(false);
    }
  };

  const removeReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem('reminders', JSON.stringify(updated));
  };

  const chartData = [
    { name: 'Consumed', value: stats.consumed, color: '#0ea5e9' },
    { name: 'Burned', value: stats.burned, color: '#f97316' },
    { name: 'Remaining', value: Math.max(0, stats.remaining), color: '#3b82f6' },
  ];

  if (showHero) {
    return (
      <>
        <HeroSection onStart={() => {
          if (!activeProfileId) {
            setIsProfileManagerOpen(true);
          } else {
            setShowHero(false);
          }
        }} />
        <ProfileManagerModal
          isOpen={isProfileManagerOpen}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onClose={() => {
            if (activeProfileId) {
              setIsProfileManagerOpen(false);
              setShowHero(false);
            }
          }}
          onSelectProfile={(id) => {
            setActiveProfileId(id);
            setIsProfileManagerOpen(false);
            setShowHero(false);
          }}
          onCreateProfile={(profile) => {
            const newProfile = { ...profile, id: crypto.randomUUID() };
            setProfiles([...profiles, newProfile]);
            setActiveProfileId(newProfile.id);
            setIsProfileManagerOpen(false);
            setShowHero(false);
          }}
          onDeleteProfile={(id) => {
            const nextProfiles = profiles.filter(p => p.id !== id);
            setProfiles(nextProfiles);
            if (activeProfileId === id) {
              setActiveProfileId(nextProfiles.length > 0 ? nextProfiles[0].id : null);
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-20 relative">
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onAddReminder={(newReminder) => {
          setReminders(prev => [...prev, newReminder]);
        }}
      />

      <CalorieCalculatorModal
        isOpen={isCalorieCalcOpen}
        onClose={() => setIsCalorieCalcOpen(false)}
        userProfile={userProfile}
        onSetGoal={(newGoal) => {
          setDailyGoal(newGoal);
          localStorage.setItem('dailyGoal', newGoal.toString());
        }}
      />

      <ProfileManagerModal
        isOpen={isProfileManagerOpen}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onClose={() => setIsProfileManagerOpen(false)}
        onSelectProfile={(id) => {
          setActiveProfileId(id);
          setIsProfileManagerOpen(false);
        }}
        onCreateProfile={(profile) => {
          const newProfile = { ...profile, id: crypto.randomUUID() };
          setProfiles([...profiles, newProfile]);
          setActiveProfileId(newProfile.id);
          setIsProfileManagerOpen(false);
        }}
        onDeleteProfile={(id) => {
          const nextProfiles = profiles.filter(p => p.id !== id);
          setProfiles(nextProfiles);
          if (activeProfileId === id) {
            setActiveProfileId(nextProfiles.length > 0 ? nextProfiles[0].id : null);
          }
        }}
      />

      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 opacity-[0.1]">
        <img
          src="https://res.cloudinary.com/dzq8jeszu/image/upload/v1772733407/WhatsApp_Image_2026-03-05_at_10.55.14_PM_llewma.jpg"
          alt="Background"
          className="w-full h-full object-cover opacity-20"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Floating Branded Watermark */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none opacity-60 hidden md:block">
        <div className="flex flex-col items-end">
          <div className="w-12 h-12 bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-lg mb-1 border border-white/20">
            <img
              src="https://res.cloudinary.com/dzq8jeszu/image/upload/v1772733407/WhatsApp_Image_2026-03-05_at_10.55.14_PM_llewma.jpg"
              alt="Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">SHAKTHIX</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10">
              <img
                src="https://res.cloudinary.com/dzq8jeszu/image/upload/v1772733407/WhatsApp_Image_2026-03-05_at_10.55.14_PM_llewma.jpg"
                alt="Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">shakthiX</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover="hover"
                className="relative group flex items-center gap-1 sm:gap-2 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl cursor-default"
              >
                <Flame size={14} className="text-orange-500 fill-orange-500 sm:w-4 sm:h-4 group-hover:animate-bounce" />
                <div className="flex flex-col">
                  <span className="text-[8px] sm:text-[10px] font-bold text-orange-400 uppercase leading-none">Streak</span>
                  <span className="text-xs sm:text-sm font-black text-orange-600 leading-none">{streak}</span>
                </div>

                {/* Animated Tooltip */}
                <motion.div
                  variants={{
                    hover: { opacity: 1, y: 0, scale: 1, display: 'block' }
                  }}
                  initial={{ opacity: 0, y: 10, scale: 0.95, display: 'none' }}
                  className="absolute top-full mt-3 right-0 w-64 p-4 bg-white/90 backdrop-blur-xl border border-orange-100 rounded-2xl shadow-2xl z-50 pointer-events-none"
                >
                  <div className="absolute top-0 right-6 -mt-2 w-4 h-4 bg-white border-t border-l border-orange-100 rotate-45" />
                  <p className="text-xs font-bold text-slate-800 leading-relaxed italic">
                    {STREAK_COMPLIMENTS[streak % STREAK_COMPLIMENTS.length]}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex -space-x-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-4 h-4 rounded-full border-2 border-white bg-orange-100 flex items-center justify-center">
                          <Sparkles size={8} className="text-orange-500" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Keep it up!</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
            <button
              onClick={() => setIsProfileManagerOpen(true)}
              className="flex items-center gap-2 sm:gap-4 text-slate-500 text-xs sm:text-sm font-medium hover:bg-slate-50 px-2 sm:px-3 py-1 sm:py-2 rounded-xl transition-colors"
            >
              <User size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{userProfile ? userProfile.name : 'Profile'}</span>
            </button>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="flex items-center gap-2 sm:gap-4 text-slate-500 text-xs sm:text-sm font-medium hover:bg-slate-50 px-2 sm:px-3 py-1 sm:py-2 rounded-xl transition-colors"
            >
              <Calendar size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{format(new Date(), 'MMM do')}</span>
              <span className="xs:hidden">{format(new Date(), 'd')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: AI & Analysis */}
          <div className="lg:col-span-7 space-y-8">

            {/* AI Health Assistant */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-3">
                      <Sparkles size={24} className="text-brand-400" />
                      AI Health Assistant
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      Professional estimation for nutrition & training.
                    </p>
                  </div>
                  <div className="hidden sm:flex bg-slate-800/50 border border-slate-700 rounded-full px-4 py-1">
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">Intelligent Analysis</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <textarea
                    value={aiInput}
                    onChange={(e) => {
                      setAiInput(e.target.value);
                      if (aiResult) setAiResult(null);
                    }}
                    placeholder="e.g., '15 minutes of hiit' or 'Avocado toast with egg'"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-3xl p-6 text-base focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all resize-none h-32 placeholder:text-slate-600 shadow-inner"
                  />

                  <AnimatePresence mode="wait">
                    {aiResult ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-slate-800/80 backdrop-blur-md border border-brand-500/30 rounded-3xl p-6 shadow-xl"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">AI Estimation Result</div>
                            <div className="text-2xl font-black text-white">{aiResult.name}</div>
                          </div>
                          <button
                            onClick={() => setAiResult(null)}
                            className="bg-slate-700/50 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                          >
                            <Plus className="rotate-45" size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/30">
                            <div className="text-2xl font-black text-white">{aiResult.calories}</div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Calories (kcal)</div>
                          </div>
                          {aiResult.type === 'food' ? (
                            <>
                              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/30">
                                <div className="text-xl font-black text-white">{aiResult.protein}g</div>
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Protein</div>
                              </div>
                              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/30">
                                <div className="text-xl font-black text-white">{aiResult.carbs}g</div>
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Carbs</div>
                              </div>
                              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/30">
                                <div className="text-xl font-black text-white">{aiResult.fats}g</div>
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Fats</div>
                              </div>

                              {/* Micro-nutrients row */}
                              <div className="col-span-4 grid grid-cols-4 gap-2 mt-2">
                                {aiResult.iron > 0 && (
                                  <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-700/20 text-center">
                                    <div className="text-[10px] font-black text-white">{aiResult.iron}mg</div>
                                    <div className="text-[6px] font-bold text-slate-500 uppercase">Iron</div>
                                  </div>
                                )}
                                {aiResult.vitaminA > 0 && (
                                  <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-700/20 text-center">
                                    <div className="text-[10px] font-black text-white">{aiResult.vitaminA}mcg</div>
                                    <div className="text-[6px] font-bold text-slate-500 uppercase">Vit A</div>
                                  </div>
                                )}
                                {aiResult.vitaminC > 0 && (
                                  <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-700/20 text-center">
                                    <div className="text-[10px] font-black text-white">{aiResult.vitaminC}mg</div>
                                    <div className="text-[6px] font-bold text-slate-500 uppercase">Vit C</div>
                                  </div>
                                )}
                                {aiResult.vitaminD > 0 && (
                                  <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-700/20 text-center">
                                    <div className="text-[10px] font-black text-white">{aiResult.vitaminD}mcg</div>
                                    <div className="text-[6px] font-bold text-slate-500 uppercase">Vit D</div>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/30 col-span-3">
                              <div className="text-2xl font-black text-white">{aiResult.duration} mins</div>
                              <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Duration</div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={confirmAiLog}
                          className="w-full bg-brand-500 hover:bg-brand-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] uppercase tracking-widest text-xs"
                        >
                          Confirm & Commit Log
                        </button>
                      </motion.div>
                    ) : (
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleAiEstimate('food')}
                          disabled={isEstimating || !aiInput}
                          className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-brand-500/50 shadow-lg shadow-brand-600/10"
                        >
                          {isEstimating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Utensils size={18} />}
                          Estimate Food
                        </button>
                        <button
                          onClick={() => handleAiEstimate('workout')}
                          disabled={isEstimating || !aiInput}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-slate-700 shadow-lg"
                        >
                          {isEstimating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Flame size={18} />}
                          Estimate Training
                        </button>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* AI Pose Coach */}
            <PoseCoach onWorkoutComplete={handlePoseWorkoutComplete} />

            {/* Metrics Overview */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 font-bold flex items-center gap-2">
                  <TrendingUp size={20} className="text-brand-500" />
                  Daily Insights
                </h3>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time stats</div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Consumed" value={stats.consumed} unit="kcal" icon={<Utensils />} color="brand" />
                <StatCard label="Burned" value={stats.burned} unit="kcal" icon={<Flame />} color="orange" />
                <StatCard label="Net" value={stats.net} unit="kcal" icon={<TrendingUp />} color="indigo" />
                <StatCard label="Goal" value={stats.goal} unit="kcal" icon={<Activity />} color="slate" onClick={() => setIsEditingGoal(true)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MacroItem label="Protein" value={stats.protein} color="bg-brand-500" goal={150} unit="g" />
                <MacroItem label="Carbs" value={stats.carbs} color="bg-orange-500" goal={300} unit="g" />
                <MacroItem label="Fats" value={stats.fats} color="bg-indigo-500" goal={80} unit="g" />
                <MacroItem label="Sat. Fats" value={stats.saturatedFats} color="bg-slate-500" goal={20} unit="g" />
              </div>

              {/* Vitamins & Minerals Section */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vitamins & Minerals Tracker</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-black text-slate-900">{stats.iron.toFixed(1)}mg</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Iron</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-black text-slate-900">{Math.round(stats.vitaminA)}mcg</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Vit A</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-black text-slate-900">{stats.vitaminC.toFixed(1)}mg</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Vit C</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-black text-slate-900">{stats.vitaminD.toFixed(1)}mcg</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Vit D</span>
                  </div>
                </div>

                {/* Daily Motivation Card (Flirty) */}
                <div className="mt-8 p-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-[2rem] relative overflow-hidden group hover:shadow-lg transition-all">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform">
                    <Sparkles size={48} className="text-rose-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-white/50 flex items-center justify-center shadow-sm">
                        <Flame size={12} className="text-orange-500" />
                      </div>
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Daily Heat Check</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">
                      "{STREAK_COMPLIMENTS[0]}"
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="h-0.5 flex-1 bg-rose-100" />
                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">Stay Hot • Stay Healthy</span>
                      <div className="h-0.5 flex-1 bg-rose-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Chart */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm overflow-hidden relative group">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-slate-900 font-bold text-lg">Daily Activity Flow</h3>
                <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bar Chart Analysis</div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                    <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={50}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Tracking & Utilities */}
          <div className="lg:col-span-5 space-y-6">

            {/* GPS Fitness Tracker */}
            <FitnessTracker userProfile={userProfile} />

            {/* Activity Logs */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                    <Utensils size={16} />
                  </div>
                  Daily Intake Log
                </h3>
                <span className="text-[10px] font-black bg-brand-50 text-brand-600 px-3 py-1 rounded-full uppercase tracking-widest">
                  {foodEntries.length} Items
                </span>
              </div>
              <div className="max-h-[350px] overflow-y-auto p-2">
                <AnimatePresence initial={false}>
                  {foodEntries.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">No intake recorded yet.</div>
                  ) : (
                    foodEntries.map((entry: FoodEntry) => (
                      <LogItem key={entry.id} name={entry.name} value={entry.calories} unit="kcal" subValue={`${entry.protein}P • ${entry.carbs}C • ${entry.fats}F`} time={format(entry.timestamp, 'h:mm a')} onDelete={() => removeEntry(entry.id, 'food')} color="brand" />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    <Flame size={16} />
                  </div>
                  Training Record
                </h3>
                <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase tracking-widest">
                  {workoutEntries.length} Sessions
                </span>
              </div>
              <div className="max-h-[350px] overflow-y-auto p-2">
                <AnimatePresence initial={false}>
                  {workoutEntries.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">No training logged today.</div>
                  ) : (
                    workoutEntries.map((entry: WorkoutEntry) => (
                      <WorkoutLogItem key={entry.id} entry={entry} onUpdate={(updates) => setWorkoutEntries(workoutEntries.map(e => e.id === entry.id ? { ...e, ...updates } : e))} onDelete={() => removeEntry(entry.id, 'workout')} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Smart Workout Library */}
            <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 p-2">
              <div className="p-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <Activity size={18} className="text-brand-500" />
                  Smart Workout Library
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tap to see calories</p>
              </div>
              <div className="px-2 pb-2 space-y-2">
                {[
                  { name: 'Power Walking', reps: '30 mins', icon: '🚶', calories: 150 },
                  { name: 'Dynamic Running', reps: '15 mins', icon: '🏃', calories: 225 },
                  { name: 'Master Push-ups', reps: '12-15 reps', icon: '💪', calories: 45 },
                  { name: 'Perfect Pull-ups', reps: '8-10 reps', icon: '🆙', calories: 60 },
                  { name: 'Core Crunches', reps: '20 reps', icon: '🧘', calories: 30 },
                ].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedWorkoutDetail(ex)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-brand-200 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl group-hover:scale-125 transition-transform">{ex.icon}</span>
                      <span className="text-sm font-bold text-slate-700">{ex.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-widest">{ex.reps}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Plan & Reminders */}
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-32 -mb-32 rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-3">
                    <Calendar size={20} />
                    Weekly Blueprint
                  </h3>
                  <button onClick={generateWeeklyPlan} disabled={isGeneratingWeekly} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all">
                    {isGeneratingWeekly ? 'Analyzing...' : 'Refresh'}
                  </button>
                </div>
                {weeklyPlan.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {weeklyPlan.slice(0, 4).map((day, idx) => (
                      <div key={idx} className="bg-white/10 backdrop-blur-sm border border-white/10 p-3 rounded-2xl">
                        <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{day.day.substring(0, 3)}</div>
                        <div className="text-xs font-bold mt-1 truncate">{day.workout}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-indigo-200 border-2 border-dashed border-indigo-400/30 rounded-3xl text-sm">Generate your unique AI training plan.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <Bell size={20} className="text-brand-500" />
                  Reminders
                </h3>
                <button onClick={() => setIsCalendarOpen(true)} className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Manage All</button>
              </div>
              {reminders.length > 0 ? (
                <div className="space-y-3">
                  {reminders.slice(0, 2).map((reminder) => (
                    <div key={reminder.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-500 shadow-sm"><Calendar size={18} /></div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{reminder.title}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{format(parseISO(reminder.date), 'MMMM do')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl text-xs font-bold uppercase tracking-widest">No Active Reminders</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, unit, icon, color, onClick, extra }: { label: string, value: number, unit: string, icon: React.ReactNode, color: string, onClick?: () => void, extra?: React.ReactNode }) {
  const colorMap: Record<string, { bg: string, text: string, iconBg: string }> = {
    brand: { bg: 'bg-brand-50/50', text: 'text-brand-600', iconBg: 'bg-brand-100' },
    orange: { bg: 'bg-orange-50/50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    indigo: { bg: 'bg-indigo-50/50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
    slate: { bg: 'bg-slate-50/50', text: 'text-slate-600', iconBg: 'bg-slate-100' },
  };

  const style = colorMap[color] || colorMap.slate;

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm transition-all relative overflow-hidden group",
        onClick && "cursor-pointer hover:shadow-md hover:border-brand-100"
      )}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-sm", style.iconBg, style.text)}>
            {React.cloneElement(icon as React.ReactElement, { size: 20 })}
          </div>
          {onClick && (
            <div className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-full uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Edit</div>
          )}
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {value.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unit}</span>
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
        </div>
        {extra}
      </div>
      {/* Subtle background glow */}
      <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full", style.bg)} />
    </motion.div>
  );
}

function MacroItem({ label, value, color, goal, unit }: { label: string, value: number, color: string, goal: number, unit: string }) {
  const percentage = Math.min(100, (value / goal) * 100);

  return (
    <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 hover:border-brand-200 transition-all hover:bg-white group">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900">{value}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{unit}</span>
          </div>
        </div>
        <div className="text-xs font-bold text-slate-400">
          goal {goal}{unit}
        </div>
      </div>
      <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full rounded-full shadow-lg", color)}
        />
      </div>
      <div className="mt-2 text-right">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{Math.round(percentage)}% complete</span>
      </div>
    </div>
  );
}

interface LogItemProps {
  key?: string | number;
  name: string;
  value: number;
  unit: string;
  subValue?: string;
  time: string;
  onDelete: () => void;
  color: 'brand' | 'orange';
}

interface WorkoutLogItemProps {
  entry: WorkoutEntry;
  onUpdate: (updates: Partial<WorkoutEntry>) => void;
  onDelete: () => void;
}

const WorkoutLogItem: React.FC<WorkoutLogItemProps> = ({ entry, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [duration, setDuration] = useState((typeof entry.duration === 'number' && !Number.isNaN(entry.duration) ? entry.duration.toString() : '0'));
  const [reps, setReps] = useState((typeof entry.reps === 'number' && !Number.isNaN(entry.reps) ? entry.reps.toString() : ''));

  const handleSave = () => {
    onUpdate({
      duration: parseInt(duration) || 0,
      reps: reps ? parseInt(reps) : undefined
    });
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 rounded-2xl transition-colors"
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-50 text-orange-600">
          <Flame size={16} className="sm:w-[18px] sm:h-[18px]" />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{entry.name}</h4>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-12 text-[10px] sm:text-xs border rounded px-1"
                placeholder="min"
              />
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-12 text-[10px] sm:text-xs border rounded px-1"
                placeholder="reps"
              />
              <button onClick={handleSave} className="text-[10px] sm:text-xs text-brand-600 font-bold">Save</button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-400">
              <span>{format(entry.timestamp, 'h:mm a')}</span>
              <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-slate-200 rounded-full" />
              <span className="truncate">{entry.duration}m {entry.reps ? `• ${entry.reps} reps` : ''}</span>
              <button onClick={() => setIsEditing(true)} className="text-brand-500 hover:underline">Edit</button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 ml-2 flex-shrink-0">
        <div className="text-right">
          <div className="font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
            +{entry.caloriesBurned} <span className="text-[10px] font-normal opacity-60">kcal</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function LogItem({ name, value, unit, subValue, time, onDelete, color }: LogItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 rounded-2xl transition-colors"
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className={cn(
          "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          color === 'brand' ? "bg-brand-50 text-brand-600" : "bg-orange-50 text-orange-600"
        )}>
          {color === 'brand' ? <Utensils size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Flame size={16} className="sm:w-[18px] sm:h-[18px]" />}
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{name}</h4>
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-400">
            <span>{time}</span>
            {subValue && (
              <>
                <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-slate-200 rounded-full" />
                <span className="truncate">{subValue}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 ml-2 flex-shrink-0">
        <div className="text-right">
          <div className="font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
            {value > 0 ? '+' : ''}{value} <span className="text-[10px] font-normal opacity-60">{unit}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}
