export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  saturatedFats?: number; // in grams
  vitaminA?: number; // in mcg
  vitaminC?: number; // in mg
  vitaminD?: number; // in mcg
  iron?: number; // in mg
  timestamp: number;
}

export interface WorkoutEntry {
  id: string;
  name: string;
  caloriesBurned: number;
  duration: number; // in minutes
  reps?: number; // Added reps
  timestamp: number;
}

export interface DailyStats {
  date: string;
  consumed: number;
  burned: number;
  goal: number;
}

export interface UserProfile {
  id: string;
  name: string;
  height: number;
  weight: number;
  dailyGoal?: number;
}
