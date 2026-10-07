import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ChevronLeft, ChevronRight, Dumbbell, Flame, Plus, Trash2, 
  Calendar, History, X, Info, ArrowUp, ArrowDown,
  Utensils, Moon, Droplets, Scale, BedDouble, Save, 
  TrendingDown, TrendingUp, Minus, Settings as SettingsIcon,
  Target, Award, Coffee, Sun, Sunset, Apple, PlusCircle
} from 'lucide-react';

interface WorkoutItem {
  id: string;
  workout_id: string;
  exercise_name: string;
  category: 'resistance' | 'cardio';
  weight?: number;
  reps?: number;
  duration_minutes?: number;
  distance_km?: number;
  incline?: number;
  created_at?: string;
  workouts?: {
    workout_date: string;
  };
}

interface UserSettings {
  goal: 'cut' | 'maintain' | 'bulk';
  currentWeight: string;
  targetWeight: string;
  targetCalories: string;
  targetWater: string;
  targetSleep: string;
  targetWorkoutsPerWeek: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  goal: 'maintain',
  currentWeight: '78',
  targetWeight: '75',
  targetCalories: '2200',
  targetWater: '2500',
  targetSleep: '8',
  targetWorkoutsPerWeek: '4'
};

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

const ALL_RESISTANCE_EXERCISES = [
  "Ab Wheel Rollout", "Arnold Press", "Barbell Bicep Curl", "Barbell Row (Κωπηλατική)",
  "Barbell Squat (Κάθισμα)", "Bench Press (Ίσιος Πάγκος)", "Bicycle Crunches",
  "Bulgarian Split Squat", "Cable Bicep Curl", "Cable Crossover (Τροχαλία)",
  "Cable Lateral Raises", "Calf Raises (Γάμπες)", "Chest Press Machine",
  "Close Grip Bench Press", "Crunches (Ροκανίσματα)", "Deadlift (Άρσεις Θανάτου)",
  "Decline Dumbbell Press", "Dips (Βυθίσεις)", "Dumbbell Flyes (Ανοίγματα)",
  "Dumbbell Hammer Curl", "Dumbbell Shoulder Press", "Face Pulls", "Front Raises",
  "Hack Squat", "Hanging Leg Raises", "Hip Thrust", "Incline Barbell Press",
  "Incline Dumbbell Curl", "Incline Dumbbell Press", "Lat Pulldown (Έλξεις Τροχαλίας)",
  "Lateral Raises (Πλάγιες Εκτάσεις)", "Leg Extension (Τετρακέφαλοι)", "Leg Press (Πρέσα)",
  "Lying Leg Curl (Μηριαίοι)", "One-Arm Dumbbell Row", "Overhead Press (OHP)",
  "Overhead Tricep Extension", "Pec Deck Machine", "Plank (Σανίδα)",
  "Preacher Curl (Μαξιλάρι)", "Pull-ups (Έλξεις)", "Push-ups (Κάμψεις)",
  "Romanian Deadlift (RDL)", "Russian Twists", "Seated Cable Row",
  "Shoulder Press Machine", "Shrugs (Τραπεζοειδείς)", "Skull Crushers (Γαλλικές)",
  "T-Bar Row", "Tricep Pushdown (Τροχαλία)", "Walking Lunges (Προβολές)"
];

const ALL_CARDIO_EXERCISES = [
  "Air Bike", "Box Jumps", "HIIT / Sprints", "Stairmaster (Σκάλες)",
  "Διάδρομος (Treadmill)", "Ελλειπτικό (Elliptical)", "Κωπηλατικό (Rowing)",
  "Στατικό Ποδήλατο", "Σχοινάκι (Jump Rope)", "Τρέξιμο σε Εξωτερικό Χώρο"
];

const GREEK_MONTHS = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'workout' | 'nutrition' | 'body_sleep'>('nutrition');

  // Ημερομηνία
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Ημερολόγιο & Ρυθμίσεις Modal
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('fit_tracker_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Workout State
  const [category, setCategory] = useState<'resistance' | 'cardio'>('resistance');
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [incline, setIncline] = useState('');
  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>([]);
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [modalExercise, setModalExercise] = useState<{
    name: string;
    category: 'resistance' | 'cardio';
    items: WorkoutItem[];
  } | null>(null);
  const [modalHistoryByDate, setModalHistoryByDate] = useState<Record<string, WorkoutItem[]>>({});

  // ================= LIFESUM-INSPIRED NUTRITION STATE =================
  const [waterMl, setWaterMl] = useState(0);
  const [meals, setMeals] = useState<{
    breakfast: FoodItem[];
    lunch: FoodItem[];
    dinner: FoodItem[];
    snacks: FoodItem[];
  }>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  });

  // Food Modal
  const [activeMealForAdd, setActiveMealForAdd] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks' | null>(null);
  const [foodForm, setFoodForm] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });

  // Body & Sleep State
  const [weightKg, setWeightKg] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(7);
  const [weeklyWeightDiff, setWeeklyWeightDiff] = useState<number | null>(null);
  const [savingHealth, setSavingHealth] = useState(false);

  // PWA Prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const saveSettings = (updated: UserSettings) => {
    setSettings(updated);
    localStorage.setItem('fit_tracker_settings', JSON.stringify(updated));
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  useEffect(() => {
    fetchWorkouts();
    fetchDailyHealthLogs();
    calculateWeeklyWeightTrend();
    fetchAllLoggedDates();
    loadMealsForDay();
  }, [selectedDate]);

  // Φόρτωση γευμάτων για τη συγκεκριμένη ημέρα (localStorage persistence)
  const loadMealsForDay = () => {
    const saved = localStorage.getItem(`meals_${selectedDate}`);
    if (saved) {
      try {
        setMeals(JSON.parse(saved));
      } catch (e) {
        setMeals({ breakfast: [], lunch: [], dinner: [], snacks: [] });
      }
    } else {
      setMeals({ breakfast: [], lunch: [], dinner: [], snacks: [] });
    }
  };

  const saveMealsForDay = (updatedMeals: typeof meals) => {
    setMeals(updatedMeals);
    localStorage.setItem(`meals_${selectedDate}`, JSON.stringify(updatedMeals));
    
    // Αυτόματος συγχρονισμός των συνολικών θερμίδων και macros στο Supabase
    const allItems = Object.values(updatedMeals).flat();
    const totalCals = allItems.reduce((acc, i) => acc + i.calories, 0);
    const totalProt = allItems.reduce((acc, i) => acc + (i.protein || 0), 0);
    const totalCarb = allItems.reduce((acc, i) => acc + (i.carbs || 0), 0);
    const totalFat = allItems.reduce((acc, i) => acc + (i.fats || 0), 0);

    syncNutritionToSupabase(totalCals, totalProt, totalCarb, totalFat);
  };

  const syncNutritionToSupabase = async (cals: number, prot: number, carb: number, fat: number) => {
    try {
      await supabase.from('daily_logs').upsert({
        log_date: selectedDate,
        calories: cals > 0 ? cals : null,
        protein_g: prot > 0 ? prot : null,
        carbs_g: carb > 0 ? carb : null,
        fats_g: fat > 0 ? fat : null,
        water_ml: waterMl
      }, { onConflict: 'log_date' });
      fetchAllLoggedDates();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllLoggedDates = async () => {
    try {
      const { data: wDates } = await supabase.from('workouts').select('workout_date');
      const { data: dDates } = await supabase.from('daily_logs').select('log_date');
      const datesSet = new Set<string>();

      wDates?.forEach((w) => w.workout_date && datesSet.add(w.workout_date));
      dDates?.forEach((d) => d.log_date && datesSet.add(d.log_date));

      setLoggedDates(datesSet);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkouts = async () => {
    setLoadingWorkouts(true);
    try {
      const { data: workout } = await supabase
        .from('workouts')
        .select('id')
        .eq('workout_date', selectedDate)
        .maybeSingle();

      if (workout) {
        const { data: items } = await supabase
          .from('workout_items')
          .select('*')
          .eq('workout_id', workout.id)
          .order('created_at', { ascending: true });

        setWorkoutItems(items || []);
      } else {
        setWorkoutItems([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const fetchDailyHealthLogs = async () => {
    try {
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', selectedDate)
        .maybeSingle();

      if (data) {
        setWaterMl(data.water_ml || 0);
        setWeightKg(data.weight_kg ? data.weight_kg.toString() : '');
        setSleepHours(data.sleep_hours ? data.sleep_hours.toString() : '');
        setSleepQuality(data.sleep_quality ?? 7);
      } else {
        setWaterMl(0);
        setWeightKg('');
        setSleepHours('');
        setSleepQuality(7);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateWeeklyWeightTrend = async () => {
    try {
      const { data } = await supabase
        .from('daily_logs')
        .select('log_date, weight_kg')
        .lte('log_date', selectedDate)
        .not('weight_kg', 'is', null)
        .order('log_date', { ascending: false })
        .limit(14);

      if (!data || data.length < 3) {
        setWeeklyWeightDiff(null);
        return;
      }

      const currDate = new Date(selectedDate).getTime();
      const msDay = 24 * 60 * 60 * 1000;

      const currentWeekWeights = data.filter((d) => {
        const diff = (currDate - new Date(d.log_date).getTime()) / msDay;
        return diff >= 0 && diff < 7;
      }).map((d) => Number(d.weight_kg));

      const prevWeekWeights = data.filter((d) => {
        const diff = (currDate - new Date(d.log_date).getTime()) / msDay;
        return diff >= 7 && diff < 14;
      }).map((d) => Number(d.weight_kg));

      if (currentWeekWeights.length > 0 && prevWeekWeights.length > 0) {
        const avgCurrent = currentWeekWeights.reduce((a, b) => a + b, 0) / currentWeekWeights.length;
        const avgPrev = prevWeekWeights.reduce((a, b) => a + b, 0) / prevWeekWeights.length;
        setWeeklyWeightDiff(Number((avgCurrent - avgPrev).toFixed(2)));
      } else {
        setWeeklyWeightDiff(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBodyAndSleep = async () => {
    setSavingHealth(true);
    try {
      const { error } = await supabase
        .from('daily_logs')
        .upsert({
          log_date: selectedDate,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
          sleep_quality: sleepQuality,
          water_ml: waterMl
        }, { onConflict: 'log_date' });

      if (error) throw error;
      calculateWeeklyWeightTrend();
      fetchAllLoggedDates();
    } catch (err: any) {
      alert('Σφάλμα: ' + err.message);
    } finally {
      setSavingHealth(false);
    }
  };

  const setWaterAmount = async (amount: number) => {
    const updated = Math.max(0, amount);
    setWaterMl(updated);
    try {
      await supabase.from('daily_logs').upsert({
        log_date: selectedDate,
        water_ml: updated
      }, { onConflict: 'log_date' });
      fetchAllLoggedDates();
    } catch (e) {
      console.error(e);
    }
  };

  // Lifesum Calculations
  const allLoggedFoods = Object.values(meals).flat();
  const totalCaloriesEaten = allLoggedFoods.reduce((acc, f) => acc + f.calories, 0);
  const totalProteinEaten = allLoggedFoods.reduce((acc, f) => acc + (f.protein || 0), 0);
  const totalCarbsEaten = allLoggedFoods.reduce((acc, f) => acc + (f.carbs || 0), 0);
  const totalFatsEaten = allLoggedFoods.reduce((acc, f) => acc + (f.fats || 0), 0);

  const calorieGoal = Number(settings.targetCalories) || 2200;
  const caloriesRemaining = Math.max(0, calorieGoal - totalCaloriesEaten);
  const caloriePercent = Math.min(100, Math.round((totalCaloriesEaten / calorieGoal) * 100));

  // Εκτίμηση στόχων Macros (40% Carbs, 30% Protein, 30% Fat - Lifesum Standard)
  const targetProteinG = Math.round((calorieGoal * 0.30) / 4);
  const targetCarbsG = Math.round((calorieGoal * 0.40) / 4);
  const targetFatsG = Math.round((calorieGoal * 0.30) / 9);

  // Lifesum Meal Distribution Suggestions
  const recommendedMealCalories = {
    breakfast: Math.round(calorieGoal * 0.25),
    lunch: Math.round(calorieGoal * 0.35),
    dinner: Math.round(calorieGoal * 0.30),
    snacks: Math.round(calorieGoal * 0.10)
  };

  const handleAddFoodToMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMealForAdd || !foodForm.name || !foodForm.calories) return;

    const newFood: FoodItem = {
      id: Date.now().toString(),
      name: foodForm.name.trim(),
      calories: Number(foodForm.calories),
      protein: foodForm.protein ? Number(foodForm.protein) : undefined,
      carbs: foodForm.carbs ? Number(foodForm.carbs) : undefined,
      fats: foodForm.fats ? Number(foodForm.fats) : undefined
    };

    const updated = {
      ...meals,
      [activeMealForAdd]: [...meals[activeMealForAdd], newFood]
    };

    saveMealsForDay(updated);
    setFoodForm({ name: '', calories: '', protein: '', carbs: '', fats: '' });
    setActiveMealForAdd(null);
  };

  const handleDeleteFoodItem = (mealKey: keyof typeof meals, id: string) => {
    const updated = {
      ...meals,
      [mealKey]: meals[mealKey].filter((f) => f.id !== id)
    };
    saveMealsForDay(updated);
  };

  // Daily Completion Flag
  const hasWorkout = workoutItems.length > 0;
  const hasCaloriesLogged = totalCaloriesEaten > 0;
  const hasWaterLogged = waterMl > 0;
  const hasSleepLogged = Boolean(sleepHours && Number(sleepHours) > 0);
  const isDayComplete = hasWorkout && hasCaloriesLogged && hasWaterLogged && hasSleepLogged;

  // Workout Order logic
  const groupedExercises = workoutItems.reduce((acc, item) => {
    if (!acc[item.exercise_name]) {
      acc[item.exercise_name] = {
        name: item.exercise_name,
        category: item.category,
        items: []
      };
    }
    acc[item.exercise_name].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; category: 'resistance' | 'cardio'; items: WorkoutItem[] }>);

  useEffect(() => {
    const names = Object.keys(groupedExercises);
    setExerciseOrder((prev) => {
      const existing = prev.filter((n) => names.includes(n));
      const newNames = names.filter((n) => !existing.includes(n));
      return [...existing, ...newNames];
    });
  }, [workoutItems]);

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exerciseOrder.length) return;

    setExerciseOrder((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });
  };

  const handleAddWorkoutItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim()) return alert('Συμπλήρωσε το όνομα της άσκησης!');

    try {
      let { data: workout } = await supabase
        .from('workouts')
        .select('id')
        .eq('workout_date', selectedDate)
        .maybeSingle();

      let currentWorkoutId = workout?.id;

      if (!currentWorkoutId) {
        const { data: newWorkout, error: createError } = await supabase
          .from('workouts')
          .insert([{ workout_date: selectedDate }])
          .select()
          .single();

        if (createError || !newWorkout) throw createError || new Error('Σφάλμα');
        currentWorkoutId = newWorkout.id;
      }

      if (category === 'resistance') {
        if (!weight || !reps) return alert('Συμπλήρωσε κιλά και επαναλήψεις!');
        const { error } = await supabase.from('workout_items').insert([{
          workout_id: currentWorkoutId,
          exercise_name: exerciseName.trim(),
          category: 'resistance',
          weight: Number(weight),
          reps: Number(reps)
        }]);
        if (error) throw error;
      } else {
        if (!duration) return alert('Ο χρόνος είναι υποχρεωτικός στο cardio!');
        const { error } = await supabase.from('workout_items').insert([{
          workout_id: currentWorkoutId,
          exercise_name: exerciseName.trim(),
          category: 'cardio',
          duration_minutes: Number(duration),
          distance_km: distance ? Number(distance) : null,
          incline: incline ? Number(incline) : null
        }]);
        if (error) throw error;
      }

      setReps('');
      setDuration('');
      fetchWorkouts();
      fetchAllLoggedDates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteWorkoutItem = async (id: string) => {
    const { error } = await supabase.from('workout_items').delete().eq('id', id);
    if (!error) {
      setWorkoutItems((prev) => prev.filter((item) => item.id !== id));
      if (modalExercise) {
        setModalExercise((prev) => prev ? {
          ...prev,
          items: prev.items.filter((item) => item.id !== id)
        } : null);
      }
      fetchAllLoggedDates();
    }
  };

  const openExerciseModal = async (group: { name: string; category: 'resistance' | 'cardio'; items: WorkoutItem[] }) => {
    setModalExercise(group);
    try {
      const { data } = await supabase
        .from('workout_items')
        .select('*, workouts(workout_date)')
        .eq('exercise_name', group.name)
        .order('created_at', { ascending: true });

      if (data) {
        const byDate: Record<string, WorkoutItem[]> = {};
        data.forEach((item: any) => {
          const itemDate = item.workouts?.workout_date || (item.created_at ? item.created_at.split('T')[0] : 'Άγνωστη');
          if (itemDate === selectedDate) return;
          if (!byDate[itemDate]) byDate[itemDate] = [];
          byDate[itemDate].push(item);
        });
        setModalHistoryByDate(byDate);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSleepQualityInfo = (val: number) => {
    if (val <= 3) return { label: 'Χαμηλή / Κακός', color: 'text-rose-400' };
    if (val <= 6) return { label: 'Μέτρια', color: 'text-amber-400' };
    if (val <= 8) return { label: 'Καλή', color: 'text-indigo-400' };
    return { label: 'Εξαιρετική!', color: 'text-emerald-400' };
  };

  const renderCalendarDays = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-9" />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const monthStr = (month + 1).toString().padStart(2, '0');
      const dayStr = d.toString().padStart(2, '0');
      const dateString = `${year}-${monthStr}-${dayStr}`;

      const isSelected = selectedDate === dateString;
      const isToday = new Date().toISOString().split('T')[0] === dateString;
      const hasLogs = loggedDates.has(dateString);

      days.push(
        <button
          key={dateString}
          onClick={() => {
            setSelectedDate(dateString);
            setIsCalendarOpen(false);
          }}
          className={`h-9 w-9 mx-auto rounded-full text-xs font-semibold flex flex-col items-center justify-center relative transition-all ${
            isSelected 
              ? 'bg-emerald-600 text-white shadow-lg scale-105' 
              : isToday 
              ? 'border border-emerald-400 text-emerald-400' 
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span>{d}</span>
          {hasLogs && !isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-1" />
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto font-sans pb-28">
      
      {/* PWA Prompt */}
      {installPrompt && (
        <button
          onClick={handleInstallClick}
          className="w-full mb-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 animate-pulse"
        >
          📲 Εγκατάσταση Εφαρμογής στο Κινητό
        </button>
      )}

      {/* Top Header: Title + Calendar Button + Settings Gear */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <span>FIT TRACKER</span>
        </h1>
        
        <div className="flex items-center gap-2">
          {/* Κουμπί Ημερολόγιο */}
          <button 
            onClick={() => {
              setCalendarViewDate(new Date(selectedDate));
              setIsCalendarOpen(true);
            }}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Calendar className="w-3.5 h-3.5" /> Ημερολόγιο
          </button>
          
          {/* Γρανάζι Ρυθμίσεων */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Bar: Κλικ στο κέντρο σε πάει στο ΣΗΜΕΡΑ! */}
      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800/80 mb-5 shadow-sm">
        <button 
          onClick={() => changeDate(-1)} 
          className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {/* Κλικ για Σήμερα */}
        <div 
          onClick={setToday}
          className="text-center cursor-pointer group px-3 py-1 rounded-xl hover:bg-slate-850 transition-colors"
          title="Πάτησε για να πας στο Σήμερα"
        >
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold group-hover:text-emerald-400">
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Σημερα' : 'Πατησε για Σημερα'}
          </span>
          <span className="font-bold text-base text-emerald-400 group-hover:underline">
            {formatDateDisplay(selectedDate)}
          </span>
        </div>

        <button 
          onClick={() => changeDate(1)} 
          className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Banner Ολοκλήρωσης Ημέρας */}
      {isDayComplete ? (
        <div className="mb-5 bg-gradient-to-r from-emerald-950/90 to-slate-900 border border-emerald-500/50 rounded-2xl p-3.5 shadow-lg flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-sm text-white">Ημέρα Ολοκληρώθηκε 100%! 🎉</h4>
            <p className="text-[11px] text-emerald-300">Κατέγραψες Προπόνηση, Διατροφή, Νερό & Ύπνο!</p>
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          ΚΑΡΤΕΛΑ: ΔΙΑΤΡΟΦΗ (LIFESUM PHILOSOPHY)
         ========================================================================= */}
      {activeTab === 'nutrition' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* 1. LIFESUM HERO CARD: Θερμίδες που Απομένουν & Macros */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Υπολοιπο Θερμιδων
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                {caloriePercent}% του στόχου
              </span>
            </div>

            {/* Κεντρικό μεγάλο νούμερο Lifesum */}
            <div className="text-center py-2">
              <div className="text-4xl font-black text-white tracking-tight">
                {caloriesRemaining}
              </div>
              <span className="text-xs text-slate-400 font-medium">kcal απομένουν για σήμερα</span>
            </div>

            {/* Λεπτή κυρτή μπάρα προόδου */}
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden my-4 border border-slate-800/60 p-0.5">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${caloriePercent}%` }}
              />
            </div>

            {/* Στοιχεία: Κατανάλωση vs Στόχος */}
            <div className="flex justify-between text-xs text-slate-400 font-medium border-b border-slate-800/80 pb-4 mb-4">
              <span>Κατανάλωση: <strong className="text-white">{totalCaloriesEaten}</strong> kcal</span>
              <span>Στόχος: <strong className="text-white">{calorieGoal}</strong> kcal</span>
            </div>

            {/* Τα 3 Macros (Carbs, Protein, Fat) σε στυλ Lifesum */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Υδατάνθρακες */}
              <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Υδατάνθρακες
                </span>
                <span className="text-sm font-black text-white">
                  {totalCarbsEaten} <span className="text-[10px] text-slate-500">/ {targetCarbsG}g</span>
                </span>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalCarbsEaten / targetCarbsG) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Πρωτεΐνη */}
              <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                  Πρωτεΐνη
                </span>
                <span className="text-sm font-black text-white">
                  {totalProteinEaten} <span className="text-[10px] text-slate-500">/ {targetProteinG}g</span>
                </span>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-indigo-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalProteinEaten / targetProteinG) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Λιπαρά */}
              <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  Λιπαρά
                </span>
                <span className="text-sm font-black text-white">
                  {totalFatsEaten} <span className="text-[10px] text-slate-500">/ {targetFatsG}g</span>
                </span>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-rose-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalFatsEaten / targetFatsG) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. LIFESUM MEAL CARDS (4 Διακριτά Γεύματα) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Γευματα Ημερας
            </h3>

            {/* Πρωινό */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Πρωινό</h4>
                    <span className="text-[10px] text-slate-500">Συνιστώμενο: ~{recommendedMealCalories.breakfast} kcal</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {meals.breakfast.reduce((sum, f) => sum + f.calories, 0)} kcal
                  </span>
                  <button
                    onClick={() => setActiveMealForAdd('breakfast')}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {meals.breakfast.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60 mt-2">
                  {meals.breakfast.map((food) => (
                    <div key={food.id} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/40">
                      <div>
                        <span className="text-slate-200 font-medium">{food.name}</span>
                        {food.protein && <span className="text-[10px] text-indigo-400 ml-2">({food.protein}g P)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400">{food.calories} kcal</span>
                        <button onClick={() => handleDeleteFoodItem('breakfast', food.id)} className="text-slate-600 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Μεσημεριανό */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Μεσημεριανό</h4>
                    <span className="text-[10px] text-slate-500">Συνιστώμενο: ~{recommendedMealCalories.lunch} kcal</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {meals.lunch.reduce((sum, f) => sum + f.calories, 0)} kcal
                  </span>
                  <button
                    onClick={() => setActiveMealForAdd('lunch')}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {meals.lunch.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60 mt-2">
                  {meals.lunch.map((food) => (
                    <div key={food.id} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/40">
                      <div>
                        <span className="text-slate-200 font-medium">{food.name}</span>
                        {food.protein && <span className="text-[10px] text-indigo-400 ml-2">({food.protein}g P)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400">{food.calories} kcal</span>
                        <button onClick={() => handleDeleteFoodItem('lunch', food.id)} className="text-slate-600 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Βραδινό */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <Sunset className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Βραδινό</h4>
                    <span className="text-[10px] text-slate-500">Συνιστώμενο: ~{recommendedMealCalories.dinner} kcal</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {meals.dinner.reduce((sum, f) => sum + f.calories, 0)} kcal
                  </span>
                  <button
                    onClick={() => setActiveMealForAdd('dinner')}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {meals.dinner.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60 mt-2">
                  {meals.dinner.map((food) => (
                    <div key={food.id} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/40">
                      <div>
                        <span className="text-slate-200 font-medium">{food.name}</span>
                        {food.protein && <span className="text-[10px] text-indigo-400 ml-2">({food.protein}g P)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400">{food.calories} kcal</span>
                        <button onClick={() => handleDeleteFoodItem('dinner', food.id)} className="text-slate-600 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Snacks */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                    <Apple className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Σνακ & Φρούτα</h4>
                    <span className="text-[10px] text-slate-500">Συνιστώμενο: ~{recommendedMealCalories.snacks} kcal</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {meals.snacks.reduce((sum, f) => sum + f.calories, 0)} kcal
                  </span>
                  <button
                    onClick={() => setActiveMealForAdd('snacks')}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {meals.snacks.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60 mt-2">
                  {meals.snacks.map((food) => (
                    <div key={food.id} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/40">
                      <div>
                        <span className="text-slate-200 font-medium">{food.name}</span>
                        {food.protein && <span className="text-[10px] text-indigo-400 ml-2">({food.protein}g P)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400">{food.calories} kcal</span>
                        <button onClick={() => handleDeleteFoodItem('snacks', food.id)} className="text-slate-600 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. LIFESUM WATER TRACKER (Διαδραστικά Ποτηράκια) */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" /> Νερό Ημέρας
                </h3>
                <span className="text-[11px] text-slate-500">Στόχος: {settings.targetWater || 2500} ml (10 ποτήρια)</span>
              </div>
              <span className="text-lg font-black text-cyan-400">{waterMl} ml</span>
            </div>

            {/* Ποτηράκια Νερού (10 ποτήρια των 250ml) */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cupNum) => {
                const cupMl = cupNum * 250;
                const isFilled = waterMl >= cupMl;

                return (
                  <button
                    key={cupNum}
                    type="button"
                    onClick={() => setWaterAmount(isFilled ? cupMl - 250 : cupMl)}
                    className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      isFilled
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                        : 'bg-slate-950 text-slate-600 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">{isFilled ? '💧' : '🥛'}</span>
                    <span className="text-[9px] font-bold mt-0.5">{cupNum * 250}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setWaterAmount(waterMl + 250)}
                className="text-xs bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/50 px-3 py-1.5 rounded-xl font-bold"
              >
                + 1 Ποτήρι (250ml)
              </button>
              <button
                onClick={() => setWaterAmount(0)}
                className="text-xs text-slate-600 hover:text-slate-400"
              >
                Μηδενισμός
              </button>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          ΚΑΡΤΕΛΑ: ΠΡΟΠΟΝΗΣΗ
         ========================================================================= */}
      {activeTab === 'workout' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => { setCategory('resistance'); setExerciseName(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                category === 'resistance' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dumbbell className="w-4 h-4" /> Βάρη
            </button>
            <button
              onClick={() => { setCategory('cardio'); setExerciseName(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                category === 'cardio' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4" /> Cardio
            </button>
          </div>

          <form onSubmit={handleAddWorkoutItem} className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 space-y-4 shadow-sm">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Διάλεξε ή Γράψε Άσκηση</label>
              <select
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mb-2"
              >
                <option value="">-- Διάλεξε από τη λίστα --</option>
                {(category === 'resistance' ? ALL_RESISTANCE_EXERCISES : ALL_CARDIO_EXERCISES).map((ex) => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="...ή πληκτρολόγησε άλλο όνομα άσκησης"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>

            {category === 'resistance' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Κιλά (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="π.χ. 80"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Επαναλήψεις</label>
                  <input
                    type="number"
                    placeholder="π.χ. 8"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-rose-400 mb-1.5 block">Χρόνος (Λεπτά)*</label>
                  <input
                    type="number"
                    placeholder="π.χ. 25"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Απόσταση (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="π.χ. 3.5"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Κλίση (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="π.χ. 2"
                      value={incline}
                      onChange={(e) => setIncline(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Προσθήκη Σετ
            </button>
          </form>

          {/* Λίστα Ασκήσεων */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Σημερινες Ασκησεις
            </h3>
            
            {loadingWorkouts ? (
              <div className="text-center py-8 text-slate-600 text-sm">Φόρτωση...</div>
            ) : exerciseOrder.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800/80 rounded-2xl">
                <p className="text-sm text-slate-500">Καμία καταγεγραμμένη άσκηση για αυτή τη μέρα.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exerciseOrder.map((name, index) => {
                  const group = groupedExercises[name];
                  if (!group) return null;

                  return (
                    <div key={name} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3">
                        <div 
                          onClick={() => openExerciseModal(group)}
                          className="cursor-pointer flex-1 flex items-center gap-2 group mr-2"
                        >
                          <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                            {group.name}
                          </h4>
                          <Info className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 shrink-0" />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            group.category === 'resistance' 
                              ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50' 
                              : 'bg-rose-950/60 text-rose-400 border border-rose-900/50'
                          }`}>
                            {group.category === 'resistance' ? `${group.items.length} Σετ` : 'Cardio'}
                          </span>

                          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => moveExercise(index, 'up')}
                              disabled={index === 0}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-white rounded"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveExercise(index, 'down')}
                              disabled={index === exerciseOrder.length - 1}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-white rounded"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {group.items.map((item, setIndex) => (
                          <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950/40">
                            <span className="text-slate-500 font-semibold w-6">#{setIndex + 1}</span>
                            <div className="flex-1 font-medium">
                              {item.category === 'resistance' ? (
                                <span>
                                  <strong className="text-indigo-400">{item.weight} kg</strong>
                                  <span className="text-slate-400 mx-1.5">×</span>
                                  <strong className="text-white">{item.reps} reps</strong>
                                </span>
                              ) : (
                                <span className="text-rose-400">
                                  <strong>{item.duration_minutes} min</strong> 
                                  {item.distance_km && ` | ${item.distance_km} km`} 
                                  {item.incline && ` | ${item.incline}%`}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteWorkoutItem(item.id)}
                              className="text-slate-600 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setExerciseName(group.name);
                          setCategory(group.category);
                          const lastItem = group.items[group.items.length - 1];
                          if (lastItem && lastItem.weight) setWeight(lastItem.weight.toString());
                          window.scrollTo({ top: 150, behavior: 'smooth' });
                        }}
                        className="mt-3 w-full py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-400 bg-slate-950/60 rounded-lg border border-slate-800/60 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Προσθήκη επόμενου σετ
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ΚΑΡΤΕΛΑ: ΣΩΜΑ & ΥΠΝΟΣ
         ========================================================================= */}
      {activeTab === 'body_sleep' && (
        <div className="space-y-5">
          {/* Κάρτα Βάρους */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" /> Σημερινό Βάρος (kg)
              </h3>

              {weeklyWeightDiff !== null && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  weeklyWeightDiff > 0 
                    ? 'bg-rose-950/60 text-rose-400 border-rose-900/50' 
                    : weeklyWeightDiff < 0 
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {weeklyWeightDiff > 0 ? <TrendingUp className="w-3 h-3" /> : weeklyWeightDiff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {weeklyWeightDiff > 0 ? `+${weeklyWeightDiff}` : weeklyWeightDiff} kg vs προηγ. εβδ.
                </span>
              )}
            </div>

            <input
              type="number"
              step="0.1"
              placeholder="π.χ. 78.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xl font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
            />

            {settings.targetWeight && (
              <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                <span>Στόχος ({settings.goal.toUpperCase()}): <strong className="text-white">{settings.targetWeight} kg</strong></span>
                {weightKg && (
                  <span className="text-emerald-400 font-semibold">
                    {Number(weightKg) > Number(settings.targetWeight) 
                      ? `Υπολείπονται ${(Number(weightKg) - Number(settings.targetWeight)).toFixed(1)} kg`
                      : 'Πέτυχες τον στόχο σου! 🎉'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Κάρτα Ύπνου */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-indigo-400" /> Ύπνος
              </h3>
              {settings.targetSleep && (
                <span className="text-xs text-slate-500">
                  Στόχος: <strong className="text-indigo-400">{settings.targetSleep}</strong> ώρες
                </span>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Ώρες Ύπνου</label>
              <input
                type="number"
                step="0.5"
                placeholder="π.χ. 7.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-400 font-medium">Ποιότητα Ύπνου (1 - 10)</label>
                <span className={`text-xs font-bold ${getSleepQualityInfo(sleepQuality).color}`}>
                  {getSleepQualityInfo(sleepQuality).label}
                </span>
              </div>

              <div className="text-center py-2 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-2xl font-black text-white">{sleepQuality}</span>
                <span className="text-xs text-slate-500 font-bold ml-1">/ 10</span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-500 font-bold px-1">
                <span>1 (Κακός)</span>
                <span>5 (Μέτριος)</span>
                <span>10 (Τέλειος)</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={savingHealth}
            onClick={() => handleSaveBodyAndSleep()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            <Save className="w-4 h-4" /> {savingHealth ? 'Αποθήκευση...' : 'Αποθήκευση Σώματος & Ύπνου'}
          </button>
        </div>
      )}

      {/* ================= MODAL ΠΡΟΣΘΗΚΗΣ ΦΑΓΗΤΟΥ (LIFESUM STYLE) ================= */}
      {activeMealForAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white capitalize">
                Προσθήκη στο {
                  activeMealForAdd === 'breakfast' ? 'Πρωινό' : 
                  activeMealForAdd === 'lunch' ? 'Μεσημεριανό' : 
                  activeMealForAdd === 'dinner' ? 'Βραδινό' : 'Σνακ'
                }
              </h3>
              <button onClick={() => setActiveMealForAdd(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFoodToMeal} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Όνομα Φαγητού / Γεύματος</label>
                <input
                  type="text"
                  placeholder="π.χ. Κοτόπουλο στήθος με ρύζι"
                  value={foodForm.name}
                  onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Θερμίδες (kcal)*</label>
                <input
                  type="number"
                  placeholder="π.χ. 450"
                  value={foodForm.calories}
                  onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Πρωτεΐνη (g)</label>
                  <input
                    type="number"
                    placeholder="g"
                    value={foodForm.protein}
                    onChange={(e) => setFoodForm({ ...foodForm, protein: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Υδατάνθρακες (g)</label>
                  <input
                    type="number"
                    placeholder="g"
                    value={foodForm.carbs}
                    onChange={(e) => setFoodForm({ ...foodForm, carbs: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Λιπαρά (g)</label>
                  <input
                    type="number"
                    placeholder="g"
                    value={foodForm.fats}
                    onChange={(e) => setFoodForm({ ...foodForm, fats: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-colors"
              >
                + Προσθήκη Φαγητού
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ΠΛΗΡΟΥΣ ΗΜΕΡΟΛΟΓΙΟΥ ================= */}
      {isCalendarOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => {
                  const d = new Date(calendarViewDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarViewDate(d);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="font-bold text-sm text-white">
                {GREEK_MONTHS[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
              </span>

              <button
                onClick={() => {
                  const d = new Date(calendarViewDate);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarViewDate(d);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-500">
              <span>Δε</span><span>Τρ</span><span>Τε</span><span>Πε</span><span>Πα</span><span>Σα</span><span>Κυ</span>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
              {renderCalendarDays()}
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 border-t border-slate-800/80 pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Καταγραφή
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-emerald-400" /> Σήμερα
              </span>
            </div>

            <button
              onClick={() => setIsCalendarOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-xs font-bold text-slate-300"
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL ΡΥΘΜΙΣΕΩΝ & ΣΤΟΧΩΝ (⚙️) ================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base text-white">Στόχοι & Ρυθμίσεις</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Φάση */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">Κύριος Στόχος</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cut', 'maintain', 'bulk'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSettings({ ...settings, goal: g })}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                      settings.goal === g
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {g === 'cut' ? 'Cut' : g === 'maintain' ? 'Συντήρηση' : 'Bulk'}
                  </button>
                ))}
              </div>
            </div>

            {/* Τωρινό Βάρος & Στόχος Βάρους */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Τωρινό Βάρος (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="π.χ. 78"
                  value={settings.currentWeight}
                  onChange={(e) => setSettings({ ...settings, currentWeight: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Βάρους (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="π.χ. 75"
                  value={settings.targetWeight}
                  onChange={(e) => setSettings({ ...settings, targetWeight: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Στόχος Θερμίδων & Νερού */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Θερμίδων (kcal)</label>
                <input
                  type="number"
                  placeholder="π.χ. 2200"
                  value={settings.targetCalories}
                  onChange={(e) => setSettings({ ...settings, targetCalories: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Νερού (ml)</label>
                <input
                  type="number"
                  step="250"
                  placeholder="π.χ. 2500"
                  value={settings.targetWater}
                  onChange={(e) => setSettings({ ...settings, targetWater: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Στόχος Ύπνου & Προπονήσεων */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Ύπνου (ώρες)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="π.χ. 8"
                  value={settings.targetSleep}
                  onChange={(e) => setSettings({ ...settings, targetSleep: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Προπονήσεις / Εβδομάδα</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  placeholder="π.χ. 4"
                  value={settings.targetWorkoutsPerWeek}
                  onChange={(e) => setSettings({ ...settings, targetWorkoutsPerWeek: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                saveSettings(settings);
                setIsSettingsOpen(false);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              Αποθήκευση Στόχων
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL ΙΣΤΟΡΙΚΟΥ ΑΣΚΗΣΗΣ ================= */}
      {modalExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-white">{modalExercise.name}</h3>
                <span className="text-xs text-slate-500">Ιστορικό & Παλαιότερες Προπονήσεις</span>
              </div>
              <button onClick={() => setModalExercise(null)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Σημερινα Σετ ({modalExercise.items.length})
              </h4>
              <div className="space-y-1.5">
                {modalExercise.items.map((item, idx) => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-400 font-bold">Σετ #{idx + 1}</span>
                    <span className="font-semibold text-white">
                      {item.category === 'resistance' ? (
                        `${item.weight} kg × ${item.reps} reps`
                      ) : (
                        `${item.duration_minutes} min ${item.distance_km ? `| ${item.distance_km} km` : ''}`
                      )}
                    </span>
                    <button onClick={() => handleDeleteWorkoutItem(item.id)} className="text-slate-600 hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-400" /> Παλαιοτερες Ημερες
              </h4>

              {Object.keys(modalHistoryByDate).length === 0 ? (
                <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center">
                  <p className="text-xs text-slate-600 italic">Δεν βρέθηκαν προηγούμενες ημέρες για αυτή την άσκηση.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(modalHistoryByDate)
                    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                    .map(([dateStr, sets]) => (
                      <div key={dateStr} className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2 shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            📅 {formatDateDisplay(dateStr)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                            {sets.length} σετ
                          </span>
                        </div>

                        <div className="space-y-1">
                          {sets.map((s, sIdx) => (
                            <div key={s.id} className="flex justify-between items-center text-xs text-slate-300">
                              <span className="text-slate-500 font-medium w-6">#{sIdx + 1}</span>
                              <div className="flex-1 text-right">
                                {s.category === 'resistance' ? (
                                  <span>
                                    <strong className="text-white">{s.weight} kg</strong>
                                    <span className="text-slate-500 mx-1">×</span>
                                    <span>{s.reps} reps</span>
                                  </span>
                                ) : (
                                  <span className="text-rose-300 font-medium">
                                    {s.duration_minutes} min {s.distance_km ? `| ${s.distance_km} km` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setModalExercise(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold text-slate-300"
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR ================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800/90 flex justify-around p-2 z-40 shadow-2xl">
        <button
          onClick={() => setActiveTab('workout')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            activeTab === 'workout' 
              ? 'text-emerald-400 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Προπόνηση</span>
        </button>

        <button
          onClick={() => setActiveTab('nutrition')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            activeTab === 'nutrition' 
              ? 'text-emerald-400 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Utensils className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Διατροφή</span>
        </button>

        <button
          onClick={() => setActiveTab('body_sleep')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            activeTab === 'body_sleep' 
              ? 'text-emerald-400 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Moon className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Σώμα & Ύπνος</span>
        </button>
      </nav>

    </div>
  );
}