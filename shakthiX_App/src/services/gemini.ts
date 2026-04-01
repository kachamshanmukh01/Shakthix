import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// ============================================================================
// FALLBACK CALORIE DATABASE - used when API key is missing or API fails
// ============================================================================

interface FoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  saturatedFats: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  iron?: number;
  baseAmount?: number; // The amount these stats are for (e.g. 100 or 1)
  baseUnit?: string;   // The unit (e.g. 'g', 'ml', 'piece')
}

const FOOD_DATABASE: Record<string, FoodNutrition> = {
  // Indian Foods
  'chapathi': { calories: 120, protein: 3.5, carbs: 20, fats: 3.5, saturatedFats: 0.5, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.2, baseAmount: 1, baseUnit: 'piece' },
  'chapati': { calories: 120, protein: 3.5, carbs: 20, fats: 3.5, saturatedFats: 0.5, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.2, baseAmount: 1, baseUnit: 'piece' },
  'roti': { calories: 120, protein: 3.5, carbs: 20, fats: 3.5, saturatedFats: 0.5, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.2, baseAmount: 1, baseUnit: 'piece' },
  'naan': { calories: 260, protein: 8, carbs: 45, fats: 5, saturatedFats: 1.2, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 2.5, baseAmount: 1, baseUnit: 'piece' },
  'dal': { calories: 180, protein: 12, carbs: 28, fats: 3, saturatedFats: 0.4, vitaminA: 15, vitaminC: 2, vitaminD: 0, iron: 3.5, baseAmount: 1, baseUnit: 'cup' },
  'daal': { calories: 180, protein: 12, carbs: 28, fats: 3, saturatedFats: 0.4, vitaminA: 15, vitaminC: 2, vitaminD: 0, iron: 3.5, baseAmount: 1, baseUnit: 'cup' },
  'lentil': { calories: 180, protein: 12, carbs: 28, fats: 3, saturatedFats: 0.4, vitaminA: 15, vitaminC: 2, vitaminD: 0, iron: 3.5, baseAmount: 1, baseUnit: 'cup' },
  'rice': { calories: 200, protein: 4, carbs: 44, fats: 0.5, saturatedFats: 0.1, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 0.8, baseAmount: 1, baseUnit: 'cup' },
  'biryani': { calories: 350, protein: 14, carbs: 45, fats: 12, saturatedFats: 3.5, vitaminA: 30, vitaminC: 3, vitaminD: 0, iron: 2.2, baseAmount: 1, baseUnit: 'cup' },
  'idli': { calories: 60, protein: 2, carbs: 12, fats: 0.2, saturatedFats: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 0.5, baseAmount: 1, baseUnit: 'piece' },
  'dosa': { calories: 133, protein: 4, carbs: 18, fats: 5, saturatedFats: 1.2, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.2, baseAmount: 1, baseUnit: 'piece' },
  'sambar': { calories: 130, protein: 7, carbs: 18, fats: 3, saturatedFats: 0.5, vitaminA: 50, vitaminC: 8, vitaminD: 0, iron: 2.5, baseAmount: 1, baseUnit: 'cup' },
  'curry': { calories: 220, protein: 8, carbs: 15, fats: 14, saturatedFats: 5, vitaminA: 60, vitaminC: 5, vitaminD: 0, iron: 2.0, baseAmount: 100, baseUnit: 'g' },
  'paneer': { calories: 265, protein: 18, carbs: 4, fats: 20, saturatedFats: 13, vitaminA: 80, vitaminC: 0, vitaminD: 0.3, iron: 0.5, baseAmount: 100, baseUnit: 'g' },
  'paratha': { calories: 200, protein: 4, carbs: 28, fats: 8, saturatedFats: 2.5, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.5, baseAmount: 1, baseUnit: 'piece' },
  'puri': { calories: 150, protein: 3, carbs: 18, fats: 8, saturatedFats: 1.5, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.0, baseAmount: 1, baseUnit: 'piece' },
  'upma': { calories: 180, protein: 5, carbs: 28, fats: 6, saturatedFats: 1, vitaminA: 5, vitaminC: 0, vitaminD: 0, iron: 1.5, baseAmount: 1, baseUnit: 'cup' },
  'poha': { calories: 160, protein: 3, carbs: 30, fats: 4, saturatedFats: 0.8, vitaminA: 5, vitaminC: 2, vitaminD: 0, iron: 3.0, baseAmount: 1, baseUnit: 'cup' },
  'samosa': { calories: 250, protein: 5, carbs: 25, fats: 14, saturatedFats: 3, vitaminA: 10, vitaminC: 4, vitaminD: 0, iron: 1.5, baseAmount: 1, baseUnit: 'piece' },
  'vada': { calories: 170, protein: 6, carbs: 18, fats: 9, saturatedFats: 1.5, vitaminA: 5, vitaminC: 1, vitaminD: 0, iron: 1.2, baseAmount: 1, baseUnit: 'piece' },
  'curd': { calories: 60, protein: 3, carbs: 5, fats: 3.3, saturatedFats: 2.1, vitaminA: 30, vitaminC: 0.5, vitaminD: 0.1, iron: 0.1, baseAmount: 100, baseUnit: 'ml' },
  'yogurt': { calories: 60, protein: 3, carbs: 5, fats: 3.3, saturatedFats: 2.1, vitaminA: 30, vitaminC: 0.5, vitaminD: 0.1, iron: 0.1, baseAmount: 100, baseUnit: 'ml' },
  'raita': { calories: 75, protein: 3.5, carbs: 6, fats: 4, saturatedFats: 2.5, vitaminA: 35, vitaminC: 2, vitaminD: 0.1, iron: 0.2, baseAmount: 1, baseUnit: 'cup' },

  // General Foods
  'egg': { calories: 78, protein: 6, carbs: 0.6, fats: 5.3, saturatedFats: 1.6, vitaminA: 75, vitaminC: 0, vitaminD: 1, iron: 0.9, baseAmount: 1, baseUnit: 'piece' },
  'boiled egg': { calories: 78, protein: 6, carbs: 0.6, fats: 5.3, saturatedFats: 1.6, vitaminA: 75, vitaminC: 0, vitaminD: 1, iron: 0.9, baseAmount: 1, baseUnit: 'piece' },
  'omelette': { calories: 154, protein: 11, carbs: 1, fats: 12, saturatedFats: 3.4, vitaminA: 100, vitaminC: 0.5, vitaminD: 1.1, iron: 1.2, baseAmount: 1, baseUnit: 'serving' },
  'chicken': { calories: 239, protein: 27, carbs: 0, fats: 14, saturatedFats: 3.8, vitaminA: 15, vitaminC: 0, vitaminD: 0.1, iron: 1.3, baseAmount: 100, baseUnit: 'g' },
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fats: 3.6, saturatedFats: 1, vitaminA: 6, vitaminC: 0, vitaminD: 0.1, iron: 0.4, baseAmount: 100, baseUnit: 'g' },
  'fish': { calories: 206, protein: 22, carbs: 0, fats: 12, saturatedFats: 2.5, vitaminA: 50, vitaminC: 0, vitaminD: 10, iron: 0.5, baseAmount: 100, baseUnit: 'g' },
  'salmon': { calories: 208, protein: 20, carbs: 0, fats: 13, saturatedFats: 3.1, vitaminA: 12, vitaminC: 0, vitaminD: 11, iron: 0.3, baseAmount: 100, baseUnit: 'g' },
  'milk': { calories: 149, protein: 8, carbs: 12, fats: 8, saturatedFats: 4.6, vitaminA: 112, vitaminC: 0, vitaminD: 3, iron: 0.1, baseAmount: 240, baseUnit: 'ml' },
  'bread': { calories: 75, protein: 3, carbs: 14, fats: 1, saturatedFats: 0.2, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.0, baseAmount: 1, baseUnit: 'slice' },
  'toast': { calories: 75, protein: 3, carbs: 14, fats: 1, saturatedFats: 0.2, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.0, baseAmount: 1, baseUnit: 'slice' },
  'banana': { calories: 105, protein: 1.3, carbs: 27, fats: 0.4, saturatedFats: 0.1, vitaminA: 3, vitaminC: 10, vitaminD: 0, iron: 0.3, baseAmount: 1, baseUnit: 'piece' },
  'apple': { calories: 95, protein: 0.5, carbs: 25, fats: 0.3, saturatedFats: 0.1, vitaminA: 3, vitaminC: 8, vitaminD: 0, iron: 0.2, baseAmount: 1, baseUnit: 'piece' },
  'orange': { calories: 62, protein: 1.2, carbs: 15, fats: 0.2, saturatedFats: 0, vitaminA: 14, vitaminC: 70, vitaminD: 0, iron: 0.1, baseAmount: 1, baseUnit: 'piece' },
  'mango': { calories: 99, protein: 1.4, carbs: 25, fats: 0.6, saturatedFats: 0.1, vitaminA: 112, vitaminC: 60, vitaminD: 0, iron: 0.3, baseAmount: 1, baseUnit: 'piece' },
  'salad': { calories: 100, protein: 3, carbs: 12, fats: 5, saturatedFats: 0.7, vitaminA: 150, vitaminC: 20, vitaminD: 0, iron: 1.5, baseAmount: 1, baseUnit: 'cup' },
  'pizza': { calories: 285, protein: 12, carbs: 36, fats: 10, saturatedFats: 4.5, vitaminA: 50, vitaminC: 2, vitaminD: 0.1, iron: 2.0, baseAmount: 1, baseUnit: 'slice' },
  'burger': { calories: 354, protein: 20, carbs: 29, fats: 17, saturatedFats: 6.5, vitaminA: 20, vitaminC: 1, vitaminD: 0.2, iron: 3.0, baseAmount: 1, baseUnit: 'piece' },
  'sandwich': { calories: 250, protein: 12, carbs: 30, fats: 9, saturatedFats: 3, vitaminA: 15, vitaminC: 2, vitaminD: 0.1, iron: 2.0, baseAmount: 1, baseUnit: 'piece' },
  'pasta': { calories: 220, protein: 8, carbs: 43, fats: 1.3, saturatedFats: 0.2, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.5, baseAmount: 100, baseUnit: 'g' },
  'noodles': { calories: 220, protein: 8, carbs: 40, fats: 3.3, saturatedFats: 0.5, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.2, baseAmount: 100, baseUnit: 'g' },
  'oats': { calories: 150, protein: 5, carbs: 27, fats: 2.5, saturatedFats: 0.4, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 2.0, baseAmount: 40, baseUnit: 'g' },
  'oatmeal': { calories: 150, protein: 5, carbs: 27, fats: 2.5, saturatedFats: 0.4, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 2.0, baseAmount: 1, baseUnit: 'cup' },
  'cereal': { calories: 200, protein: 4, carbs: 40, fats: 2, saturatedFats: 0.3, vitaminA: 150, vitaminC: 15, vitaminD: 1, iron: 8, baseAmount: 50, baseUnit: 'g' },
  'tea': { calories: 30, protein: 0.5, carbs: 5, fats: 1, saturatedFats: 0.6, vitaminA: 5, vitaminC: 0, vitaminD: 0, iron: 0.2, baseAmount: 1, baseUnit: 'cup' },
  'coffee': { calories: 40, protein: 0.5, carbs: 5, fats: 2, saturatedFats: 1.2, vitaminA: 5, vitaminC: 0, vitaminD: 0, iron: 0.1, baseAmount: 1, baseUnit: 'cup' },
  'juice': { calories: 110, protein: 1, carbs: 26, fats: 0.3, saturatedFats: 0, vitaminA: 10, vitaminC: 45, vitaminD: 0, iron: 0.5, baseAmount: 1, baseUnit: 'cup' },
  'smoothie': { calories: 180, protein: 5, carbs: 35, fats: 2, saturatedFats: 0.5, vitaminA: 40, vitaminC: 50, vitaminD: 0, iron: 0.8, baseAmount: 1, baseUnit: 'cup' },
  'protein shake': { calories: 200, protein: 30, carbs: 10, fats: 3, saturatedFats: 1, vitaminA: 50, vitaminC: 15, vitaminD: 2, iron: 3, baseAmount: 1, baseUnit: 'serving' },
  'peanut butter': { calories: 190, protein: 7, carbs: 7, fats: 16, saturatedFats: 3, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 0.6, baseAmount: 32, baseUnit: 'g' },
  'cheese': { calories: 113, protein: 7, carbs: 0.4, fats: 9, saturatedFats: 5.6, vitaminA: 85, vitaminC: 0, vitaminD: 0.2, iron: 0.1, baseAmount: 28, baseUnit: 'g' },
  'butter': { calories: 102, protein: 0.1, carbs: 0, fats: 12, saturatedFats: 7.3, vitaminA: 97, vitaminC: 0, vitaminD: 0, iron: 0, baseAmount: 14, baseUnit: 'g' },
  'almonds': { calories: 164, protein: 6, carbs: 6, fats: 14, saturatedFats: 1.1, vitaminA: 0, vitaminC: 0, vitaminD: 0, iron: 1.1, baseAmount: 28, baseUnit: 'g' },
  'chocolate': { calories: 230, protein: 3, carbs: 25, fats: 13, saturatedFats: 8, vitaminA: 5, vitaminC: 0, vitaminD: 0, iron: 2.4, baseAmount: 43, baseUnit: 'g' },
  'ice cream': { calories: 207, protein: 3.5, carbs: 24, fats: 11, saturatedFats: 6.8, vitaminA: 80, vitaminC: 0.5, vitaminD: 0.2, iron: 0.2, baseAmount: 1, baseUnit: 'cup' },
  'cake': { calories: 260, protein: 3, carbs: 38, fats: 11, saturatedFats: 4.5, vitaminA: 30, vitaminC: 0, vitaminD: 0.1, iron: 1.2, baseAmount: 1, baseUnit: 'slice' },
  'cookie': { calories: 150, protein: 2, carbs: 20, fats: 7, saturatedFats: 3.5, vitaminA: 10, vitaminC: 0, vitaminD: 0, iron: 0.8, baseAmount: 1, baseUnit: 'piece' },
};

interface WorkoutInfo {
  caloriesPerMin: number; // per minute for a 70kg person
  defaultDuration: number;
  defaultReps?: number;
}

const WORKOUT_DATABASE: Record<string, WorkoutInfo> = {
  'walking': { caloriesPerMin: 4.5, defaultDuration: 30 },
  'walk': { caloriesPerMin: 4.5, defaultDuration: 30 },
  'running': { caloriesPerMin: 11.5, defaultDuration: 20 },
  'run': { caloriesPerMin: 11.5, defaultDuration: 20 },
  'jogging': { caloriesPerMin: 8, defaultDuration: 25 },
  'jog': { caloriesPerMin: 8, defaultDuration: 25 },
  'cycling': { caloriesPerMin: 7.5, defaultDuration: 30 },
  'cycle': { caloriesPerMin: 7.5, defaultDuration: 30 },
  'biking': { caloriesPerMin: 7.5, defaultDuration: 30 },
  'swimming': { caloriesPerMin: 10, defaultDuration: 30 },
  'swim': { caloriesPerMin: 10, defaultDuration: 30 },
  'push ups': { caloriesPerMin: 7, defaultDuration: 10, defaultReps: 30 },
  'pushups': { caloriesPerMin: 7, defaultDuration: 10, defaultReps: 30 },
  'push-ups': { caloriesPerMin: 7, defaultDuration: 10, defaultReps: 30 },
  'pull ups': { caloriesPerMin: 8, defaultDuration: 10, defaultReps: 20 },
  'pullups': { caloriesPerMin: 8, defaultDuration: 10, defaultReps: 20 },
  'pull-ups': { caloriesPerMin: 8, defaultDuration: 10, defaultReps: 20 },
  'squats': { caloriesPerMin: 6, defaultDuration: 10, defaultReps: 30 },
  'squat': { caloriesPerMin: 6, defaultDuration: 10, defaultReps: 30 },
  'crunches': { caloriesPerMin: 5, defaultDuration: 10, defaultReps: 40 },
  'crunch': { caloriesPerMin: 5, defaultDuration: 10, defaultReps: 40 },
  'sit ups': { caloriesPerMin: 5, defaultDuration: 10, defaultReps: 30 },
  'situps': { caloriesPerMin: 5, defaultDuration: 10, defaultReps: 30 },
  'plank': { caloriesPerMin: 4, defaultDuration: 5 },
  'planks': { caloriesPerMin: 4, defaultDuration: 5 },
  'burpees': { caloriesPerMin: 12, defaultDuration: 10, defaultReps: 20 },
  'burpee': { caloriesPerMin: 12, defaultDuration: 10, defaultReps: 20 },
  'jumping jacks': { caloriesPerMin: 8, defaultDuration: 15, defaultReps: 50 },
  'jump rope': { caloriesPerMin: 12, defaultDuration: 15 },
  'skipping': { caloriesPerMin: 12, defaultDuration: 15 },
  'yoga': { caloriesPerMin: 3.5, defaultDuration: 30 },
  'stretching': { caloriesPerMin: 2.5, defaultDuration: 20 },
  'weight training': { caloriesPerMin: 6, defaultDuration: 45 },
  'weights': { caloriesPerMin: 6, defaultDuration: 45 },
  'lifting': { caloriesPerMin: 6, defaultDuration: 45 },
  'deadlift': { caloriesPerMin: 7, defaultDuration: 15, defaultReps: 15 },
  'bench press': { caloriesPerMin: 5, defaultDuration: 15, defaultReps: 20 },
  'lunges': { caloriesPerMin: 6, defaultDuration: 10, defaultReps: 24 },
  'lunge': { caloriesPerMin: 6, defaultDuration: 10, defaultReps: 24 },
  'hiit': { caloriesPerMin: 13, defaultDuration: 20 },
  'cardio': { caloriesPerMin: 9, defaultDuration: 30 },
  'boxing': { caloriesPerMin: 10, defaultDuration: 30 },
  'kickboxing': { caloriesPerMin: 10, defaultDuration: 30 },
  'dancing': { caloriesPerMin: 6, defaultDuration: 30 },
  'dance': { caloriesPerMin: 6, defaultDuration: 30 },
  'zumba': { caloriesPerMin: 8, defaultDuration: 30 },
  'martial arts': { caloriesPerMin: 10, defaultDuration: 30 },
  'rowing': { caloriesPerMin: 8.5, defaultDuration: 20 },
  'elliptical': { caloriesPerMin: 8, defaultDuration: 30 },
  'stair climbing': { caloriesPerMin: 9, defaultDuration: 15 },
  'stairs': { caloriesPerMin: 9, defaultDuration: 15 },
  'treadmill': { caloriesPerMin: 10, defaultDuration: 30 },
  'sprinting': { caloriesPerMin: 15, defaultDuration: 10 },
  'sprint': { caloriesPerMin: 15, defaultDuration: 10 },
  'mountain climbers': { caloriesPerMin: 10, defaultDuration: 10, defaultReps: 30 },
  'battle ropes': { caloriesPerMin: 12, defaultDuration: 10 },
  'cricket': { caloriesPerMin: 5, defaultDuration: 60 },
  'badminton': { caloriesPerMin: 7, defaultDuration: 30 },
  'basketball': { caloriesPerMin: 8, defaultDuration: 30 },
  'football': { caloriesPerMin: 9, defaultDuration: 45 },
  'soccer': { caloriesPerMin: 9, defaultDuration: 45 },
  'tennis': { caloriesPerMin: 8, defaultDuration: 30 },
};

// Conversion map to standard units (g for weight, ml for volume)
const UNIT_CONVERSIONS: Record<string, number> = {
  // Volume (to ml)
  'ml': 1,
  'milliliter': 1,
  'milliliters': 1,
  'milli liter': 1,
  'milli liters': 1,
  'l': 1000,
  'liter': 1000,
  'liters': 1000,
  'cup': 240,
  'cups': 240,
  'tbsp': 15,
  'tsp': 5,
  'oz': 29.57,
  'ounce': 29.57,
  'ounces': 29.57,
  // Weight (to g)
  'g': 1,
  'gram': 1,
  'grams': 1,
  'kg': 1000,
  'kilogram': 1000,
  'kilograms': 1000,
  'mg': 0.001,
  'milligram': 0.001,
  'milligrams': 0.001,
  'milli gram': 0.001,
  'milli grams': 0.001,
  // Piece
  'piece': 1,
  'unit': 1,
  'serving': 1,
  'slice': 1,
};

// Parse input string to extract amount, unit and food items
function parseInput(input: string): { amount: number; unit: string; items: string[] } {
  const cleaned = input.toLowerCase().trim();

  // Updated regex to catch units like "ml", "liters", "grams" etc following a number
  const regex = /^(\d+\.?\d*)\s*(ml|milliliters?|milli liters?|l|liters?|g|grams?|kg|kilograms?|mg|milligrams?|milli grams?|cups?|tbsp|tsp|oz|ounces?|pieces?|units?|servings?|slices?)?\s+/i;
  const match = cleaned.match(regex);

  const amount = match ? parseFloat(match[1]) : 1;
  const unit = match && match[2] ? match[2].toLowerCase() : 'piece';

  // Remove the quantity and unit from the string
  const remaining = match ? cleaned.slice(match[0].length) : cleaned;

  // Split by common separators: "and", "with", ",", "&", "+"
  const items = remaining
    .split(/\s+(?:and|with|,|&|\+)\s+|\s*,\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return { amount, unit, items };
}

// Extract duration from input
function extractDuration(input: string): number | null {
  const durationMatch = input.match(/(\d+\.?\d*)\s*(?:min(?:ute)?s?|mins?|m\b)/i);
  if (durationMatch) return parseFloat(durationMatch[1]);

  const hourMatch = input.match(/(\d+\.?\d*)\s*(?:hour|hr|h)\s*/i);
  if (hourMatch) return parseFloat(hourMatch[1]) * 60;

  return null;
}

// Extract reps from input
function extractReps(input: string): number | null {
  const repsMatch = input.match(/(\d+)\s*(?:reps?|repetitions?|times?|x)\b/i);
  if (repsMatch) return parseInt(repsMatch[1]);
  return null;
}

// Extract quantity from "I did 3 sets" or "50 pushups"
function extractQuantity(input: string): number {
  const setsMatch = input.match(/(\d+)\s*sets?\b/i);
  if (setsMatch) return parseInt(setsMatch[1]);

  const numMatch = input.match(/^(\d+)\s+/);
  if (numMatch) return parseInt(numMatch[1]);

  return 1;
}

// Lookup food in database with fuzzy matching
function lookupFood(item: string): { name: string; nutrition: FoodNutrition } | null {
  const cleaned = item.toLowerCase().trim();

  // Exact match
  if (FOOD_DATABASE[cleaned]) {
    return { name: cleaned, nutrition: FOOD_DATABASE[cleaned] };
  }

  // Check if any keyword is in the input
  for (const [key, nutrition] of Object.entries(FOOD_DATABASE)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return { name: key, nutrition };
    }
  }

  // Partial word matching
  const words = cleaned.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const [key, nutrition] of Object.entries(FOOD_DATABASE)) {
      if (key.includes(word) || word.includes(key)) {
        return { name: key, nutrition };
      }
    }
  }

  return null;
}

// Lookup workout in database
function lookupWorkout(input: string): { name: string; info: WorkoutInfo } | null {
  const cleaned = input.toLowerCase().trim();

  // Remove common prefixes
  const withoutPrefix = cleaned
    .replace(/^(i did|i was|did|doing|do|went for a|went|had a|had)\s+/i, '')
    .replace(/^(some|a|an|the)\s+/i, '');

  // Exact match
  if (WORKOUT_DATABASE[withoutPrefix]) {
    return { name: withoutPrefix, info: WORKOUT_DATABASE[withoutPrefix] };
  }

  // Check if any keyword is in the input
  for (const [key, info] of Object.entries(WORKOUT_DATABASE)) {
    if (withoutPrefix.includes(key) || key.includes(withoutPrefix)) {
      return { name: key, info };
    }
  }

  // Word-by-word matching
  const words = withoutPrefix.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const [key, info] of Object.entries(WORKOUT_DATABASE)) {
      if (key.includes(word) || word.includes(key)) {
        return { name: key, info };
      }
    }
  }

  return null;
}

// Fallback food estimation
function fallbackEstimateFood(input: string, profile?: { height: number; weight: number }): any {
  const { amount, unit, items } = parseInput(input);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalSaturatedFats = 0;
  let totalVitA = 0;
  let totalVitC = 0;
  let totalVitD = 0;
  let totalIron = 0;
  let foundNames: string[] = [];

  const inputMultiplier = UNIT_CONVERSIONS[unit] || 1;
  const totalInputInStandard = amount * inputMultiplier;

  if (items.length === 0) {
    items.push(input.replace(/^\d+\s*(?:[a-zA-Z]+)?\s*/, '').trim());
  }

  for (const item of items) {
    const found = lookupFood(item);
    if (found) {
      // Scale based on serving size in database
      const baseAmount = found.nutrition.baseAmount || 1;
      const baseUnitMultiplier = UNIT_CONVERSIONS[found.nutrition.baseUnit || 'piece'] || 1;
      const baseInStandard = baseAmount * baseUnitMultiplier;

      // Ratio of input amount to database base amount
      const scale = totalInputInStandard / baseInStandard;

      totalCalories += found.nutrition.calories * scale;
      totalProtein += found.nutrition.protein * scale;
      totalCarbs += found.nutrition.carbs * scale;
      totalFats += found.nutrition.fats * scale;
      totalSaturatedFats += (found.nutrition.saturatedFats || 0) * scale;
      totalVitA += (found.nutrition.vitaminA || 0) * scale;
      totalVitC += (found.nutrition.vitaminC || 0) * scale;
      totalVitD += (found.nutrition.vitaminD || 0) * scale;
      totalIron += (found.nutrition.iron || 0) * scale;
      foundNames.push(amount > 1 ? `${amount}${unit} ${found.name}` : found.name);
    } else {
      // Default estimate for unknown items: ~200 kcal per standard serving
      totalCalories += 200 * amount;
      totalProtein += 8 * amount;
      totalCarbs += 25 * amount;
      totalFats += 7 * amount;
      totalSaturatedFats += 2 * amount;
      foundNames.push(item);
    }
  }

  const displayName = foundNames.length > 0
    ? foundNames.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' + ')
    : input;

  return {
    name: displayName,
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein),
    carbs: Math.round(totalCarbs),
    fats: Math.round(totalFats),
    saturatedFats: Math.round(totalSaturatedFats * 10) / 10,
    vitaminA: Math.round(totalVitA),
    vitaminC: Math.round(totalVitC),
    vitaminD: Math.round(totalVitD * 10) / 10,
    iron: Math.round(totalIron * 10) / 10,
  };
}

// Fallback workout estimation
function fallbackEstimateWorkout(input: string, profile?: { height: number; weight: number }): any {
  const weightKg = profile?.weight || 70;
  const weightMultiplier = weightKg / 70;

  const workout = lookupWorkout(input);
  const duration = extractDuration(input);
  const reps = extractReps(input);
  const qty = extractQuantity(input);

  if (workout) {
    const actualDuration = duration || workout.info.defaultDuration;
    const actualReps = reps || (workout.info.defaultReps ? workout.info.defaultReps * qty : undefined);
    const calories = Math.round(workout.info.caloriesPerMin * actualDuration * weightMultiplier);

    return {
      name: workout.name.charAt(0).toUpperCase() + workout.name.slice(1),
      calories,
      duration: Math.round(actualDuration),
      reps: actualReps,
    };
  }

  // Default: assume moderate intensity exercise
  const actualDuration = duration || 30;
  const defaultCalPerMin = 6; // moderate intensity
  const calories = Math.round(defaultCalPerMin * actualDuration * weightMultiplier);

  return {
    name: input.charAt(0).toUpperCase() + input.slice(1),
    calories,
    duration: Math.round(actualDuration),
    reps: reps,
  };
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export const estimateCalories = async (input: string, type: 'food' | 'workout', profile?: { height: number, weight: number }) => {
  // Try Gemini API first
  if (ai) {
    const model = "gemini-2.0-flash";

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The name of the item" },
        calories: { type: Type.NUMBER, description: "Estimated calories" },
        protein: { type: Type.NUMBER, description: "Estimated protein in grams (for food only)", nullable: true },
        carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams (for food only)", nullable: true },
        fats: { type: Type.NUMBER, description: "Estimated total fats in grams (for food only)", nullable: true },
        saturatedFats: { type: Type.NUMBER, description: "Estimated saturated fats in grams (for food only)", nullable: true },
        vitaminA: { type: Type.NUMBER, description: "Estimated Vitamin A in mcg (for food only)", nullable: true },
        vitaminC: { type: Type.NUMBER, description: "Estimated Vitamin C in mg (for food only)", nullable: true },
        vitaminD: { type: Type.NUMBER, description: "Estimated Vitamin D in mcg (for food only)", nullable: true },
        iron: { type: Type.NUMBER, description: "Estimated Iron in mg (for food only)", nullable: true },
        duration: { type: Type.NUMBER, description: "Duration in minutes (for workouts only)", nullable: true },
        reps: { type: Type.NUMBER, description: "Number of reps (for workouts only)", nullable: true }
      },
      required: ["name", "calories"]
    };

    const profileContext = profile ? ` The user is ${profile.height}cm tall and weighs ${profile.weight}kg.` : '';
    const prompt = type === 'food'
      ? `Estimate the calories, macronutrients (protein, carbohydrates, total fats, saturated fats in grams), and key vitamins/minerals (Vitamin A in mcg, Vitamin C in mg, Vitamin D in mcg, Iron in mg) for this food item: "${input}". 
      IMPORTANT: Pay extremely close attention to the requested amount and units (e.g., liters, ml, grams, mg, kilograms, oz, cups). Scale the output accurately for the SPECIFIED volume or weight. If the user mentions "1 liter" of a liquid, ensure the calories are calculated for the full 1000ml. Provide a concise name and the counts.${profileContext}`
      : `Estimate the calories burned for this workout: "${input}". Provide a concise name, the calorie count, duration in minutes, and number of reps if applicable.${profileContext} Use the user's height and weight for a more accurate estimation of calories burned.`;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema
        }
      });

      const parsed = JSON.parse(result.text || "{}");
      if (parsed && parsed.calories > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn("Gemini API unavailable, using built-in calculator:", error);
    }
  }

  // Fallback to local calculation
  console.log("Using built-in calorie calculator for:", input);
  if (type === 'food') {
    return fallbackEstimateFood(input, profile);
  } else {
    return fallbackEstimateWorkout(input, profile);
  }
};

export const getExerciseSuggestions = async (calories: number, workoutType: string = 'any', profile?: { height: number, weight: number }) => {
  if (calories <= 0) return [];

  // Try Gemini API first
  if (ai) {
    const model = "gemini-2.0-flash";
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          exercise: { type: Type.STRING, description: "Name of the exercise" },
          duration: { type: Type.NUMBER, description: "Duration in minutes to burn the target calories" },
          intensity: { type: Type.STRING, description: "Intensity level (Low, Moderate, High)" }
        },
        required: ["exercise", "duration", "intensity"]
      }
    };

    const profileContext = profile ? ` The user is ${profile.height}cm tall and weighs ${profile.weight}kg.` : '';
    const prompt = `Suggest 3 different ${workoutType !== 'any' ? workoutType : ''} exercises to burn exactly ${calories} calories. Provide the exercise name, the duration required in minutes, and the intensity level.${profileContext} Use the user's height and weight for a more accurate estimation of the duration needed.`;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema
        }
      });

      const parsed = JSON.parse(result.text || "[]");
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn("Gemini API unavailable for exercise suggestions, using fallback:", error);
    }
  }

  // Fallback
  const weightKg = profile?.weight || 70;
  const weightMultiplier = weightKg / 70;

  type ExerciseOption = { exercise: string; caloriesPerMin: number; intensity: string; type: string };
  const exercises: ExerciseOption[] = [
    { exercise: 'Brisk Walking', caloriesPerMin: 4.5, intensity: 'Low', type: 'cardio' },
    { exercise: 'Jogging', caloriesPerMin: 8, intensity: 'Moderate', type: 'cardio' },
    { exercise: 'Running', caloriesPerMin: 11.5, intensity: 'High', type: 'cardio' },
    { exercise: 'Cycling', caloriesPerMin: 7.5, intensity: 'Moderate', type: 'cardio' },
    { exercise: 'Swimming', caloriesPerMin: 10, intensity: 'High', type: 'cardio' },
    { exercise: 'Jump Rope', caloriesPerMin: 12, intensity: 'High', type: 'hiit' },
    { exercise: 'Yoga Flow', caloriesPerMin: 3.5, intensity: 'Low', type: 'yoga' },
    { exercise: 'Weight Training', caloriesPerMin: 6, intensity: 'Moderate', type: 'strength' },
    { exercise: 'HIIT Circuit', caloriesPerMin: 13, intensity: 'High', type: 'hiit' },
    { exercise: 'Dancing', caloriesPerMin: 6, intensity: 'Moderate', type: 'cardio' },
    { exercise: 'Squats', caloriesPerMin: 6, intensity: 'Moderate', type: 'strength' },
    { exercise: 'Burpees', caloriesPerMin: 12, intensity: 'High', type: 'hiit' },
  ];

  let filtered = workoutType !== 'any'
    ? exercises.filter(e => e.type === workoutType.toLowerCase())
    : exercises;

  if (filtered.length < 3) filtered = exercises;

  // Pick 3 diverse exercises
  const selected: ExerciseOption[] = [];
  const intensities = ['Low', 'Moderate', 'High'];
  for (const intensity of intensities) {
    const match = filtered.find(e => e.intensity === intensity && !selected.includes(e));
    if (match) selected.push(match);
    if (selected.length >= 3) break;
  }
  while (selected.length < 3) {
    const remaining = filtered.filter(e => !selected.includes(e));
    if (remaining.length > 0) selected.push(remaining[0]);
    else break;
  }

  return selected.map(e => ({
    exercise: e.exercise,
    duration: Math.round(calories / (e.caloriesPerMin * weightMultiplier)),
    intensity: e.intensity,
  }));
};

export const getWeeklyWorkoutPlan = async (goal: string, profile?: { height: number, weight: number }) => {
  // Try Gemini API first
  if (ai) {
    const model = "gemini-2.0-flash";
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: "Day of the week" },
          workout: { type: Type.STRING, description: "Workout name" },
          duration: { type: Type.NUMBER, description: "Duration in minutes" },
          focus: { type: Type.STRING, description: "Focus area (e.g., Cardio, Strength, Recovery)" }
        },
        required: ["day", "workout", "duration", "focus"]
      }
    };

    const profileContext = profile ? ` The user is ${profile.height}cm tall and weighs ${profile.weight}kg.` : '';
    const prompt = `Create a 7-day workout plan for someone whose goal is: "${goal}". Provide a workout for each day, including duration and focus area.${profileContext} Tailor the intensity and duration to their physical profile.`;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema
        }
      });

      const parsed = JSON.parse(result.text || "[]");
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn("Gemini API unavailable for weekly plan, using fallback:", error);
    }
  }

  // Fallback weekly plan
  return [
    { day: 'Monday', workout: 'HIIT Circuit', duration: 30, focus: 'Full Body Cardio' },
    { day: 'Tuesday', workout: 'Upper Body Strength', duration: 45, focus: 'Strength' },
    { day: 'Wednesday', workout: 'Jogging', duration: 35, focus: 'Cardio' },
    { day: 'Thursday', workout: 'Lower Body Strength', duration: 45, focus: 'Strength' },
    { day: 'Friday', workout: 'Yoga & Stretching', duration: 40, focus: 'Recovery' },
    { day: 'Saturday', workout: 'Running + Core', duration: 40, focus: 'Cardio + Core' },
    { day: 'Sunday', workout: 'Active Recovery Walk', duration: 30, focus: 'Recovery' },
  ];
};

export const getHealthAdvice = async (stats: any, profile?: { height: number, weight: number }) => {
  // Try Gemini API first
  if (ai) {
    const model = "gemini-2.0-flash";
    const profileContext = profile ? ` The user is ${profile.height}cm tall and weighs ${profile.weight}kg.` : '';
    const prompt = `Based on today's stats: Consumed ${stats.consumed} kcal, Burned ${stats.burned} kcal, Goal ${stats.goal} kcal.${profileContext} 
    Give a single sentence of encouraging health advice or a quick tip tailored to their physical profile if relevant.`;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      if (result.text) return result.text;
    } catch (error) {
      console.warn("Gemini API unavailable for health advice, using fallback:", error);
    }
  }

  // Fallback advice based on stats
  const { consumed, burned, goal } = stats;
  const net = consumed - burned;
  const remaining = goal - net;

  if (consumed === 0 && burned === 0) {
    return "Start your day right! Log your breakfast to begin tracking your nutrition. 🌅";
  }
  if (burned > consumed && consumed > 0) {
    return `Amazing work! You've burned more than you've consumed. Make sure to fuel up with a protein-rich meal! 💪`;
  }
  if (remaining < 0) {
    return `You've exceeded your goal by ${Math.abs(remaining)} kcal. Consider a light workout to balance things out! 🏃`;
  }
  if (remaining < 500 && remaining > 0) {
    return `Almost at your goal! Just ${remaining} kcal remaining. You're doing great — keep it up! 🎯`;
  }
  if (consumed > 0 && burned === 0) {
    return "You've logged some food — now it's time to get moving! Even a short walk makes a difference. 🚶";
  }
  return "Keep moving and stay hydrated! Consistency is key to reaching your fitness goals. 💧";
};

export const calculateDailyNeeds = async (profile: { age: number, weight: number, height: number, gender: string, activityLevel: string }) => {
  // Try Gemini API first
  if (ai) {
    const model = "gemini-2.0-flash";
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        bmr: { type: Type.NUMBER, description: "Basal Metabolic Rate" },
        tdee: { type: Type.NUMBER, description: "Total Daily Energy Expenditure" },
        maintenance: { type: Type.NUMBER, description: "Calories for maintenance" },
        weightLoss: { type: Type.NUMBER, description: "Calories for weight loss" },
        weightGain: { type: Type.NUMBER, description: "Calories for weight gain" },
        explanation: { type: Type.STRING, description: "Brief explanation of the calculation" }
      },
      required: ["bmr", "tdee", "maintenance", "weightLoss", "weightGain", "explanation"]
    };

    const prompt = `Calculate the BMR and TDEE for a ${profile.gender}, ${profile.age} years old, weighing ${profile.weight}kg, ${profile.height}cm tall, with an activity level of "${profile.activityLevel}". Provide the BMR, TDEE, and recommended daily calorie intake for maintenance, weight loss, and weight gain.`;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema
        }
      });

      const parsed = JSON.parse(result.text || "{}");
      if (parsed && parsed.bmr > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn("Gemini API unavailable for daily needs, using fallback:", error);
    }
  }

  // Fallback: Mifflin-St Jeor formula
  let bmr: number;
  if (profile.gender.toLowerCase() === 'male') {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
  }

  const activityMultipliers: Record<string, number> = {
    'sedentary': 1.2,
    'light': 1.375,
    'lightly active': 1.375,
    'moderate': 1.55,
    'moderately active': 1.55,
    'active': 1.725,
    'very active': 1.725,
    'extra active': 1.9,
  };

  const multiplier = activityMultipliers[profile.activityLevel.toLowerCase()] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  return {
    bmr: Math.round(bmr),
    tdee,
    maintenance: tdee,
    weightLoss: Math.round(tdee - 500),
    weightGain: Math.round(tdee + 500),
    explanation: `Calculated using Mifflin-St Jeor equation. BMR = ${Math.round(bmr)} kcal/day. With ${profile.activityLevel} activity (×${multiplier}), TDEE = ${tdee} kcal/day. For weight loss, aim for a 500 kcal deficit; for weight gain, add 500 kcal.`
  };
};
