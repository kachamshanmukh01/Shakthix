import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Footprints,
  Flame,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Zap,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  Edit2,
  Check,
  X,
  Trash2,
} from 'lucide-react';

// --- Constants ---
const STEP_LENGTH_M = 0.762; // Average step length in meters
const CALORIES_PER_STEP = 0.04; // Average calories burned per step (walking)
const RUNNING_CALORIES_PER_KM = 62; // Average calories per km running (70kg person)
const STEP_GOAL_DEFAULT = 10000;
const KM_TO_MILES = 0.621371;

interface GeoPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

interface TrackerSession {
  id: string;
  type: 'walking' | 'running';
  steps: number;
  distance: number; // in meters
  calories: number;
  duration: number; // in seconds
  positions: GeoPosition[];
  startTime: number;
  endTime?: number;
}

interface FitnessTrackerProps {
  userProfile?: { height: number; weight: number } | null;
}

// Haversine formula for distance between two GPS coordinates
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(distanceM: number, seconds: number): string {
  if (distanceM <= 0 || seconds <= 0) return '--:--';
  const distKm = distanceM / 1000;
  const paceSecsPerKm = seconds / distKm;
  const paceMins = Math.floor(paceSecsPerKm / 60);
  const paceSecs = Math.floor(paceSecsPerKm % 60);
  return `${paceMins}:${paceSecs.toString().padStart(2, '0')}`;
}

export const FitnessTracker: React.FC<FitnessTrackerProps> = ({ userProfile }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activityType, setActivityType] = useState<'walking' | 'running'>('walking');
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0); // in meters
  const [duration, setDuration] = useState(0); // in seconds
  const [positions, setPositions] = useState<GeoPosition[]>([]);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'active' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [stepGoal, setStepGoal] = useState(STEP_GOAL_DEFAULT);
  const [isExpanded, setIsExpanded] = useState(true);
  const [sessions, setSessions] = useState<TrackerSession[]>(() => {
    const saved = localStorage.getItem('fitnessSessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ steps: 0, duration: 0, calories: 0 });

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepSimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const hasRealSensorRef = useRef(false);
  const stepDetectorRef = useRef<{ lastAccel: number; stepThreshold: number; cooldown: boolean }>({
    lastAccel: 0,
    stepThreshold: 1.2,
    cooldown: false,
  });

  // User weight for calorie calculation
  const weightKg = userProfile?.weight || 70;

  // Step length varies by activity and user height
  const userHeight = userProfile?.height || 170;
  const walkingStepLength = userHeight * 0.415 / 100; // ~0.71m for 170cm
  const runningStrideLength = userHeight * 0.65 / 100; // ~1.1m for 170cm

  // Calorie calculations
  const stepCalories = Math.round(steps * CALORIES_PER_STEP * (weightKg / 70));
  const distanceKm = distance / 1000;
  const runningCalories = Math.round(distanceKm * RUNNING_CALORIES_PER_KM * (weightKg / 70));
  const totalCalories = activityType === 'walking' ? stepCalories : stepCalories + runningCalories;

  // Speed calculation (km/h)
  const speedKmh = duration > 0 ? (distanceKm / (duration / 3600)) : 0;

  // Step goal progress safely ignoring 0 goals
  const safeGoal = Math.max(1, stepGoal || 10000);
  const stepProgress = Math.min(100, (steps / safeGoal) * 100);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('fitnessSessions', JSON.stringify(sessions));
  }, [sessions]);

  // ========================================================================
  // STEP SIMULATION ENGINE
  // Generates realistic step data when real sensors (GPS/Accelerometer)
  // are unavailable (desktop browsers, no GPS permission, etc.)
  // On real mobile devices with sensors, this does NOT activate.
  // ========================================================================
  useEffect(() => {
    if (!isTracking || isPaused) {
      if (stepSimRef.current) {
        clearInterval(stepSimRef.current);
        stepSimRef.current = null;
      }
      return;
    }

    // Wait 2 seconds to see if real sensors provide data
    const sensorCheckTimeout = setTimeout(() => {
      if (!hasRealSensorRef.current) {
        // No real sensor data received — activate simulation
        setUseSimulation(true);
        setGpsStatus('active');
        setGpsError(null);

        // Walking: ~1.7-2.0 steps/sec (102-120 steps/min)
        // Running: ~2.5-3.0 steps/sec (150-180 steps/min)
        const SIM_INTERVAL_MS = 500; // update every 500ms

        stepSimRef.current = setInterval(() => {
          setActivityType((currentType) => {
            // Steps per 500ms interval
            const baseStepsPerInterval = currentType === 'walking'
              ? 0.9 + Math.random() * 0.2  // 1.8-2.2 steps/sec → 0.9-1.1 per 500ms
              : 1.3 + Math.random() * 0.3; // 2.6-3.2 steps/sec → 1.3-1.6 per 500ms

            const newSteps = Math.round(baseStepsPerInterval);
            const stepLen = currentType === 'walking' ? walkingStepLength : runningStrideLength;
            const newDistance = newSteps * stepLen;

            setSteps(prev => prev + newSteps);
            setDistance(prev => prev + newDistance);

            return currentType; // don't change activity type
          });
        }, SIM_INTERVAL_MS);
      }
    }, 2000);

    return () => {
      clearTimeout(sensorCheckTimeout);
      if (stepSimRef.current) {
        clearInterval(stepSimRef.current);
        stepSimRef.current = null;
      }
    };
  }, [isTracking, isPaused, walkingStepLength, runningStrideLength]);

  // Timer for duration
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking, isPaused]);

  // GPS Watch
  const startGPSTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }

    setGpsStatus('acquiring');
    setGpsError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        hasRealSensorRef.current = true;
        setUseSimulation(false);
        // Stop simulation if it was running
        if (stepSimRef.current) {
          clearInterval(stepSimRef.current);
          stepSimRef.current = null;
        }

        setGpsStatus('active');
        const newPos: GeoPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
        };

        setPositions((prev) => {
          if (prev.length > 0) {
            const lastPos = prev[prev.length - 1];
            const dist = haversineDistance(lastPos.lat, lastPos.lng, newPos.lat, newPos.lng);
            // Filter out GPS noise (ignore movements < 2m or > 100m in one reading)
            if (dist > 2 && dist < 100) {
              setDistance((prevDist) => prevDist + dist);
              // Estimate steps from distance
              const estimatedSteps = Math.round(dist / STEP_LENGTH_M);
              setSteps((prevSteps) => prevSteps + estimatedSteps);
            }
          }
          return [...prev, newPos];
        });
      },
      (error) => {
        // GPS failed — simulation will kick in automatically
        setGpsStatus('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('GPS unavailable — using step simulation');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('GPS unavailable — using step simulation');
            break;
          case error.TIMEOUT:
            setGpsError('GPS timed out — using step simulation');
            break;
          default:
            setGpsError('GPS unavailable — using step simulation');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  const stopGPSTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus('idle');
  }, []);

  // Device Motion for step detection (mobile)
  useEffect(() => {
    if (!isTracking || isPaused) return;

    let motionDetected = false;
    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const totalAccel = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const delta = Math.abs(totalAccel - stepDetectorRef.current.lastAccel);

      if (delta > stepDetectorRef.current.stepThreshold && !stepDetectorRef.current.cooldown) {
        if (!motionDetected) {
          motionDetected = true;
          hasRealSensorRef.current = true;
          setUseSimulation(false);
          // Stop simulation
          if (stepSimRef.current) {
            clearInterval(stepSimRef.current);
            stepSimRef.current = null;
          }
        }

        setSteps((prev) => prev + 1);
        // Also update distance from steps
        const stepLen = activityType === 'walking' ? walkingStepLength : runningStrideLength;
        setDistance((prev) => prev + stepLen);

        stepDetectorRef.current.cooldown = true;
        setTimeout(() => {
          stepDetectorRef.current.cooldown = false;
        }, 300);
      }

      stepDetectorRef.current.lastAccel = totalAccel;
    };

    if (typeof DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isTracking, isPaused, activityType, walkingStepLength, runningStrideLength]);

  const handleStart = () => {
    hasRealSensorRef.current = false;
    setUseSimulation(false);
    setIsTracking(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    startGPSTracking();
  };

  const handlePause = () => {
    setIsPaused(true);
    stopGPSTracking();
    if (stepSimRef.current) {
      clearInterval(stepSimRef.current);
      stepSimRef.current = null;
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    startGPSTracking();
  };

  const handleStop = () => {
    // Save session — save any session that lasted more than 5 seconds
    if (duration > 5) {
      const session: TrackerSession = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 10),
        type: activityType,
        steps,
        distance,
        calories: totalCalories,
        duration,
        positions,
        startTime: startTimeRef.current || (Date.now() - duration * 1000),
        endTime: Date.now(),
      };
      setSessions((prev) => [session, ...prev]);
    }

    setIsTracking(false);
    setIsPaused(false);
    setUseSimulation(false);
    hasRealSensorRef.current = false;
    stopGPSTracking();
    if (stepSimRef.current) {
      clearInterval(stepSimRef.current);
      stepSimRef.current = null;
    }
    setSteps(0);
    setDistance(0);
    setDuration(0);
    setPositions([]);
  };

  const handleReset = () => {
    setSteps(0);
    setDistance(0);
    setDuration(0);
    setPositions([]);
  };

  const handleStartEdit = (session: TrackerSession) => {
    setEditingSessionId(session.id);
    setEditFields({
      steps: session.steps || 0,
      duration: session.duration || 0,
      calories: session.calories || 0
    });
  };

  const handleSaveEdit = () => {
    if (!editingSessionId) return;
    setSessions(prev => prev.map(s =>
      s.id === editingSessionId
        ? { ...s, ...editFields }
        : s
    ));
    setEditingSessionId(null);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  // GPS Status indicator
  const GpsStatusDot = () => {
    const colors = {
      idle: 'bg-slate-300',
      acquiring: 'bg-yellow-400 animate-pulse',
      active: 'bg-emerald-400',
      error: 'bg-red-400',
    };
    return <div className={`w-2.5 h-2.5 rounded-full ${colors[gpsStatus]}`} />;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="p-6 border-b border-slate-100 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold flex items-center gap-2 text-slate-900">
          <div className="relative">
            <MapPin size={18} className="text-emerald-500" />
            {isTracking && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full"
              />
            )}
          </div>
          GPS Fitness Tracker
        </h3>
        <div className="flex items-center gap-3">
          {isTracking && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* Activity Type Toggle */}
            <div className="px-6 pt-5">
              <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                <button
                  onClick={() => setActivityType('walking')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activityType === 'walking'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Footprints size={14} />
                  Walking
                </button>
                <button
                  onClick={() => setActivityType('running')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activityType === 'running'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Zap size={14} />
                  Running
                </button>
              </div>
            </div>

            {/* GPS Status Bar */}
            <div className="px-6 pt-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${useSimulation
                ? 'bg-emerald-50 text-emerald-700'
                : gpsStatus === 'error'
                  ? 'bg-yellow-50 text-yellow-700'
                  : gpsStatus === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : gpsStatus === 'acquiring'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-slate-50 text-slate-500'
                }`}>
                {useSimulation ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                ) : (
                  <GpsStatusDot />
                )}
                <Navigation size={12} />
                {useSimulation && '🏃 Step Tracking Active — Counting Steps'}
                {!useSimulation && gpsStatus === 'idle' && 'GPS Ready'}
                {!useSimulation && gpsStatus === 'acquiring' && 'Acquiring GPS signal...'}
                {!useSimulation && gpsStatus === 'active' && 'GPS Active — Tracking location'}
                {!useSimulation && gpsStatus === 'error' && (gpsError || 'GPS Error')}
              </div>
            </div>

            {/* Main Stats Grid */}
            <div className="p-6 space-y-5">
              {/* Step Counter with Progress Ring */}
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-1">Steps</div>
                      <div className="flex items-baseline gap-1">
                        <motion.span
                          key={steps}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="text-4xl font-black tabular-nums"
                        >
                          {steps.toLocaleString()}
                        </motion.span>
                        <span className="text-sm text-slate-400 font-medium">/ {(stepGoal || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <circle
                          cx="32" cy="32" r="28"
                          strokeWidth="5"
                          stroke="rgba(255,255,255,0.1)"
                          fill="none"
                        />
                        <motion.circle
                          cx="32" cy="32" r="28"
                          strokeWidth="5"
                          stroke="#10b981"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          animate={{ strokeDashoffset: `${2 * Math.PI * 28 * (1 - stepProgress / 100)}` }}
                          transition={{ duration: 0.5 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-emerald-400">
                          {Math.round(stepProgress)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step Calories */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <Flame size={14} className="text-orange-400" />
                    <span className="text-xs text-slate-300">Steps burned</span>
                    <span className="ml-auto text-sm font-bold text-orange-400 tabular-nums">{stepCalories} kcal</span>
                  </div>
                </div>
              </div>

              {/* Distance & Running Calories */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Navigation size={12} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Distance</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tabular-nums">
                    {distanceKm.toFixed(2)}
                    <span className="text-xs font-normal text-slate-400 ml-1">km</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    {(distanceKm * KM_TO_MILES).toFixed(2)} mi
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame size={12} className="text-orange-500" />
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">
                      {activityType === 'running' ? 'Run Burn' : 'Total Burn'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tabular-nums">
                    {activityType === 'running' ? runningCalories : totalCalories}
                    <span className="text-xs font-normal text-slate-400 ml-1">kcal</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ~{((activityType === 'running' ? runningCalories : totalCalories) / 7700 * 1000).toFixed(0)}g fat
                  </div>
                </div>
              </div>

              {/* Duration, Speed, Pace */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <Timer size={14} className="text-slate-400 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Duration</div>
                  <div className="text-sm font-black text-slate-900 tabular-nums">{formatDuration(duration)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <TrendingUp size={14} className="text-slate-400 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Speed</div>
                  <div className="text-sm font-black text-slate-900 tabular-nums">{speedKmh.toFixed(1)} <span className="text-[10px] font-normal">km/h</span></div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <Target size={14} className="text-slate-400 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pace</div>
                  <div className="text-sm font-black text-slate-900 tabular-nums">{formatPace(distance, duration)} <span className="text-[10px] font-normal">/km</span></div>
                </div>
              </div>

              {/* Total Calories Summary (for running mode) */}
              {activityType === 'running' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Zap size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Calories Burned</div>
                        <div className="text-xs opacity-60">Steps ({stepCalories}) + Running ({runningCalories})</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black tabular-nums">{totalCalories} <span className="text-xs font-normal opacity-70">kcal</span></div>
                  </div>
                </motion.div>
              )}

              {/* Control Buttons */}
              <div className="flex gap-3">
                {!isTracking ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStart}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Play size={20} fill="white" />
                    Start Tracking
                  </motion.button>
                ) : (
                  <>
                    {!isPaused ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handlePause}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Pause size={20} />
                        Pause
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleResume}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play size={20} fill="white" />
                        Resume
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStop}
                      className="bg-red-500 hover:bg-red-400 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <RotateCcw size={18} />
                      Stop
                    </motion.button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <Award size={16} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-600 flex-shrink-0">Daily Step Goal:</span>
                <input
                  type="number"
                  value={stepGoal}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setStepGoal(0);
                    } else {
                      setStepGoal(Math.max(100, parseInt(val) || 0));
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums w-20"
                />
                <span className="text-[10px] text-slate-400 font-bold">steps</span>
              </div>

              {/* Session History */}
              {sessions.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                  >
                    <span>Recent Sessions ({sessions.length})</span>
                    {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {sessions.slice(0, 5).map((session) => (
                          <div
                            key={session.id}
                            className="group relative flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-all"
                          >
                            {editingSessionId === session.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Steps</label>
                                    <input
                                      type="number"
                                      value={editFields.steps}
                                      onChange={(e) => setEditFields({ ...editFields, steps: parseInt(e.target.value) || 0 })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Duration (sec)</label>
                                    <input
                                      type="number"
                                      value={editFields.duration}
                                      onChange={(e) => setEditFields({ ...editFields, duration: parseInt(e.target.value) || 0 })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase">Calories</label>
                                  <input
                                    type="number"
                                    value={editFields.calories}
                                    onChange={(e) => setEditFields({ ...editFields, calories: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                  >
                                    <Check size={12} /> Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSessionId(null)}
                                    className="flex-1 bg-slate-200 text-slate-700 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                  >
                                    <X size={12} /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${session.type === 'running' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                        }`}
                                    >
                                      {session.type === 'running' ? <Zap size={14} /> : <Footprints size={14} />}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 capitalize">{session.type}</div>
                                      <div className="text-[10px] text-slate-400">
                                        {session.startTime ? new Date(session.startTime).toLocaleDateString() : 'Unknown Data'} • {formatDuration(session.duration || 0)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center gap-3">
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 tabular-nums">{(session.steps || 0).toLocaleString()} steps</div>
                                      <div className="text-[10px] text-orange-500 font-bold tabular-nums">{session.calories || 0} kcal</div>
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleStartEdit(session)}
                                        className="p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSession(session.id)}
                                        className="p-1 hover:bg-rose-100 rounded-md text-rose-500 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
