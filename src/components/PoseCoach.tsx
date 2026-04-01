import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { Camera, Play, Square, Trophy, Activity, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PoseCoachProps {
    onWorkoutComplete?: (workout: { type: string; reps: number; calories: number }) => void;
}

type ExerciseType = 'squats' | 'pushups' | 'jumpingjacks';

// Angle calculation helper
const calculateAngle = (a: any, b: any, c: any, width: number = 1, height: number = 1) => {
    const ax = a.x * width;
    const ay = a.y * height;
    const bx = b.x * width;
    const by = b.y * height;
    const cx = c.x * width;
    const cy = c.y * height;

    const radians = Math.atan2(cy - by, cx - bx) - Math.atan2(ay - by, ax - bx);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

export const PoseCoach: React.FC<PoseCoachProps> = ({ onWorkoutComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [exercise, setExercise] = useState<ExerciseType>('squats');
    const [reps, setReps] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formFeedback, setFormFeedback] = useState<string>("Get in position");
    const [visionQuality, setVisionQuality] = useState<number>(0);

    // Tracking state for counting
    const stateRef = useRef<'up' | 'down'>('up');
    const landmarkerRef = useRef<PoseLandmarker | null>(null);
    const requestRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number>(0);
    const smoothingRef = useRef<{ [key: string]: number[] }>({});

    // Initialize MediaPipe
    useEffect(() => {
        const initPose = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`,
                        delegate: "CPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                landmarkerRef.current = landmarker;
                setIsLoading(false);
            } catch (err) {
                console.error("Failed to load MediaPipe:", err);
                setError("AI model could not be loaded. Please check your connection.");
            }
        };
        initPose();

        return () => {
            if (landmarkerRef.current) landmarkerRef.current.close();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().then(() => {
                        setIsActive(true);
                        setReps(0);
                        stateRef.current = 'up';
                        detectPose();
                    });
                };
            }
        } catch (err) {
            setError("Camera access denied. Please enable camera permissions.");
        }
    };

    const stopCamera = () => {
        setIsActive(false);
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        // Finalize workout
        if (reps > 0 && onWorkoutComplete) {
            onWorkoutComplete({ type: exercise, reps, calories: reps * 2 });
        }
    };

    const detectPose = async () => {
        if (!videoRef.current || !canvasRef.current || !landmarkerRef.current || !isActive) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx || video.paused || video.ended) return;

        // Ensure canvas matches video display size for accurate overlays
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        let startTimeMs = performance.now();
        if (startTimeMs <= lastTimestampRef.current) {
            startTimeMs = lastTimestampRef.current + 1; // MediaPipe requires strictly increasing timestamps
        }
        lastTimestampRef.current = startTimeMs;

        // Skip detection if the video frame hasn't updated
        if (!video.currentTime) {
            requestRef.current = requestAnimationFrame(detectPose);
            return;
        }

        let results;
        try {
            results = landmarkerRef.current.detectForVideo(video, startTimeMs);
        } catch (e) {
            console.warn("Pose detection error:", e);
            requestRef.current = requestAnimationFrame(detectPose);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const drawingUtils = new DrawingUtils(ctx);

            // Calculate vision quality based on visible landmarks
            const visibleCount = landmarks.filter(l => l.visibility > 0.6).length;
            setVisionQuality(Math.min(100, Math.floor((visibleCount / 33) * 100)));

            // Draw skeletal connectors with glow
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: 'rgba(16, 185, 129, 0.4)',
                lineWidth: 10
            });

            // Draw standard connectors
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: '#10b981',
                lineWidth: 5
            });

            drawingUtils.drawLandmarks(landmarks, {
                color: '#ffffff',
                fillColor: '#10b981',
                radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 12, 4)
            });

            // Draw Real-time Angle Visualization
            let currentAngle = 0;
            let anglePoint = landmarks[0]; // fallback

            if (exercise === 'squats') {
                const hip = landmarks[23];
                const knee = landmarks[25];
                const ankle = landmarks[27];
                currentAngle = calculateAngle(hip, knee, ankle, canvas.width, canvas.height);
                anglePoint = knee;
            } else if (exercise === 'pushups') {
                const shoulder = landmarks[11];
                const elbow = landmarks[13];
                const wrist = landmarks[15];
                currentAngle = calculateAngle(shoulder, elbow, wrist, canvas.width, canvas.height);
                anglePoint = elbow;
            }

            if (exercise !== 'jumpingjacks') {
                ctx.save();
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);

                // Position text near the joint
                const x = anglePoint.x * canvas.width;
                const y = anglePoint.y * canvas.height;

                ctx.font = '900 64px Inter, system-ui';
                ctx.fillStyle = currentAngle < 100 ? '#34d399' : '#ffffff'; // Emerald-400 for better contrast or white
                ctx.strokeStyle = '#0f172a'; // Dark slate border to make it pop
                ctx.lineWidth = 6;
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';

                // Draw stroke then fill for crisp text
                ctx.strokeText(`${Math.round(currentAngle)}°`, x + 40, y + 20);
                ctx.fillText(`${Math.round(currentAngle)}°`, x + 40, y + 20);
                ctx.restore();
            }

            // Core Exercise Analysis Logic
            processExercise(landmarks, canvas.width, canvas.height);
        } else {
            setVisionQuality(0);
        }

        requestRef.current = requestAnimationFrame(detectPose);
    };

    const smooth = (key: string, value: number, windowSize: number = 5) => {
        if (!smoothingRef.current[key]) smoothingRef.current[key] = [];
        smoothingRef.current[key].push(value);
        if (smoothingRef.current[key].length > windowSize) smoothingRef.current[key].shift();
        return smoothingRef.current[key].reduce((a, b) => a + b) / smoothingRef.current[key].length;
    };

    const processExercise = (landmarks: any[], width: number, height: number) => {
        const MIN_VISIBILITY = 0.3; // Significantly lower to ensure tracking works easily

        if (exercise === 'squats') {
            const leftHip = landmarks[23];
            const leftKnee = landmarks[25];
            const leftAnkle = landmarks[27];
            const rightHip = landmarks[24];
            const rightKnee = landmarks[26];
            const rightAnkle = landmarks[28];

            if (
                (leftHip.visibility > MIN_VISIBILITY && leftKnee.visibility > MIN_VISIBILITY && leftAnkle.visibility > MIN_VISIBILITY) &&
                (rightHip.visibility > MIN_VISIBILITY && rightKnee.visibility > MIN_VISIBILITY && rightAnkle.visibility > MIN_VISIBILITY)
            ) {
                const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle, width, height);
                const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle, width, height);
                const angle = smooth('squat_angle', (leftAngle + rightAngle) / 2);

                if (angle < 120) { // More forgiving down position
                    if (stateRef.current === 'up') {
                        stateRef.current = 'down';
                        setFormFeedback("Great depth! Now stand up.");
                    }
                } else if (angle > 150) { // Reached up position
                    if (stateRef.current === 'down') {
                        setReps(prev => prev + 1);
                        stateRef.current = 'up';
                        setFormFeedback("Perfect Rep! Keep going.");
                    } else if (reps === 0 && stateRef.current === 'up') {
                        setFormFeedback("Perfect position! Start your first rep.");
                    }
                } else if (angle >= 120 && angle <= 150 && stateRef.current === 'up') {
                    if (reps === 0) {
                        setFormFeedback("Get in position: Stand up straight.");
                    } else {
                        setFormFeedback("Lower your hips...");
                    }
                }
            } else {
                setFormFeedback(reps === 0 ? "Step back. Ensure full body is visible." : "Tracking lost. Ensure full body is visible.");
            }
        } else if (exercise === 'pushups') {
            const leftShoulder = landmarks[11];
            const leftElbow = landmarks[13];
            const leftWrist = landmarks[15];
            const rightShoulder = landmarks[12];
            const rightElbow = landmarks[14];
            const rightWrist = landmarks[16];

            if (
                (leftShoulder.visibility > MIN_VISIBILITY && leftElbow.visibility > MIN_VISIBILITY && leftWrist.visibility > MIN_VISIBILITY) ||
                (rightShoulder.visibility > MIN_VISIBILITY && rightElbow.visibility > MIN_VISIBILITY && rightWrist.visibility > MIN_VISIBILITY)
            ) {
                const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist, width, height);
                const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist, width, height);
                const angle = smooth('pushup_angle', (leftAngle + rightAngle) / 2);

                if (angle < 110) {
                    if (stateRef.current === 'up') {
                        stateRef.current = 'down';
                        setFormFeedback("Lowered! Now push up.");
                    }
                } else if (angle > 140) {
                    if (stateRef.current === 'down') {
                        setReps(prev => prev + 1);
                        stateRef.current = 'up';
                        setFormFeedback("Strong push! Excellent.");
                    } else if (reps === 0 && stateRef.current === 'up') {
                        setFormFeedback("Ready! Start your pushups.");
                    }
                } else if (angle >= 110 && angle <= 140 && stateRef.current === 'up') {
                    if (reps === 0) {
                        setFormFeedback("Get in position: Straighten your arms.");
                    } else {
                        setFormFeedback("Go deeper for a full rep...");
                    }
                }
            } else {
                setFormFeedback(reps === 0 ? "Get in position: Camera on floor facing side." : "Position camera to side for pushups");
            }
        } else if (exercise === 'jumpingjacks') {
            const leftWrist = landmarks[15];
            const rightWrist = landmarks[16];
            const leftAnkle = landmarks[27];
            const rightAnkle = landmarks[28];
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            const head = landmarks[0];

            if (
                leftWrist.visibility > MIN_VISIBILITY && rightWrist.visibility > MIN_VISIBILITY &&
                leftAnkle.visibility > MIN_VISIBILITY && rightAnkle.visibility > MIN_VISIBILITY &&
                leftShoulder.visibility > MIN_VISIBILITY && rightShoulder.visibility > MIN_VISIBILITY
            ) {
                // Use shoulder width as a dynamic baseline for distance thresholds
                const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
                const ankleDist = Math.abs(leftAnkle.x - rightAnkle.x);

                const wristsAboveHead = leftWrist.y < head.y && rightWrist.y < head.y;
                const anklesSpread = ankleDist > (shoulderWidth * 1.2); // More forgiving leg spread

                if (wristsAboveHead && anklesSpread) {
                    if (stateRef.current === 'up') {
                        stateRef.current = 'down';
                        setFormFeedback("In the air! Now land back.");
                    }
                } else if (!wristsAboveHead && !anklesSpread) {
                    if (stateRef.current === 'down') {
                        setReps(prev => prev + 1);
                        stateRef.current = 'up';
                        setFormFeedback("Keep jumping! Excellent rhythm.");
                    } else if (reps === 0 && stateRef.current === 'up') {
                        setFormFeedback("Perfect position! Jump to start.");
                    }
                } else if (reps === 0) {
                    setFormFeedback("Get in position: Stand straight, arms down.");
                }
            } else {
                setFormFeedback(reps === 0 ? "Step back to see full body." : "Stand back further to see legs");
            }
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-xl">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">AI Fitness Coach</h3>
                        <p className="text-xs text-slate-400">Real-time Pose Estimation</p>
                    </div>
                </div>

                <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                    {(['squats', 'pushups', 'jumpingjacks'] as ExerciseType[]).map((ex) => (
                        <button
                            key={ex}
                            onClick={() => { setExercise(ex); setReps(0); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${exercise === ex ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {ex}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative aspect-video bg-slate-100 flex items-center justify-center group">
                {isLoading && (
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"
                        />
                        <p className="text-sm font-medium">Initializing AI Coach...</p>
                    </div>
                )}

                {error && (
                    <div className="p-6 text-center max-w-sm">
                        <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-900 mb-2">Setup Error</h4>
                        <p className="text-sm text-slate-500 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!isActive && !isLoading && !error && (
                    <div className="text-center z-10 transition-transform group-hover:scale-105 duration-300">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/40">
                            <Camera size={32} className="text-white" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">Ready to Start?</h4>
                        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">
                            Place your device clearly 5-7 feet away so your full body is visible.
                        </p>
                        <button
                            onClick={startCamera}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 mx-auto transition-all shadow-xl shadow-emerald-500/20"
                        >
                            <Play size={18} fill="white" />
                            START CAMERA
                        </button>
                    </div>
                )}

                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover rounded-none flip-horizontal ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    style={{ transform: 'scaleX(-1)' }}
                    muted
                    playsInline
                />
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full object-cover z-20 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    width={640}
                    height={480}
                    style={{ transform: 'scaleX(-1)' }}
                />
                {/* HUD Overlay */}
                {isActive && (
                    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6">
                        <div className="flex justify-between items-start">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10"
                            >
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Current Reps</div>
                                <div className="text-4xl font-black text-white">{reps}</div>
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">
                                        Vision Accuracy
                                        <span>{visionQuality}%</span>
                                    </div>
                                    <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            animate={{ width: `${visionQuality}%` }}
                                            className={`h-full ${visionQuality > 80 ? 'bg-emerald-500' : visionQuality > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            <div className="flex flex-col items-end gap-2">
                                <motion.div
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="bg-red-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-red-500/50 flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Recording Live</span>
                                </motion.div>

                                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Exercise</div>
                                    <div className="text-lg font-black text-white capitalize">{exercise}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <motion.div
                                key={formFeedback}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-xl flex items-center gap-2"
                            >
                                <Info size={16} />
                                {formFeedback}
                            </motion.div>

                            <button
                                onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                                className="pointer-events-auto bg-red-500 hover:bg-red-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg"
                            >
                                <Square size={16} fill="white" />
                                Finish Workout
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 grid grid-cols-3 gap-8">
                <div className="text-center">
                    <div className="text-3xl font-black text-slate-900 mb-1">{reps}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Reps</div>
                </div>
                <div className="text-center border-x border-slate-100">
                    <div className="text-3xl font-black text-slate-900 mb-1">{reps * 2}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated kcal</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-black text-slate-900 mb-1">
                        {reps > 10 ? 'Elite' : reps > 5 ? 'Pro' : 'Beginner'}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Performance</div>
                </div>
            </div>

            {reps >= 10 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mx-6 mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <div className="font-black text-emerald-900">New Achievement!</div>
                        <div className="text-xs text-emerald-600 font-medium">10+ {exercise} streak unlocked</div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
