import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  ChevronLeft, ChevronRight, Dumbbell, Flame, Plus, Trash2, 
  Calendar, History, X, Info, ArrowUp, ArrowDown,
  Utensils, Moon, Droplets, Scale, BedDouble, Save, 
  TrendingDown, TrendingUp, Minus, Settings as SettingsIcon,
  Target, Award, Coffee, Sun, Sunset, Apple, Home, ArrowRight,
  Search, Check
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
  targetCalories: '2400',
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

const INITIAL_RESISTANCE_EXERCISES = [
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

const INITIAL_CARDIO_EXERCISES = [
  "Air Bike", "Box Jumps", "HIIT / Sprints", "Stairmaster (Σκάλες)",
  "Διάδρομος (Treadmill)", "Ελλειπτικό (Elliptical)", "Κωπηλατικό (Rowing)",
  "Στατικό Ποδήλατο", "Σχοινάκι (Jump Rope)", "Τρέξιμο σε Εξωτερικό Χώρο"
];

const GREEK_MONTHS_SHORT = [
  "Ιαν", "Φεβ", "Μάρ", "Απρ", "Μάι", "Ιούν",
  "Ιούλ", "Αύγ", "Σεπ", "Οκτ", "Νοέ", "Δεκ"
];

const GREEK_MONTHS_FULL = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'workout' | 'nutrition' | 'body_sleep'>('home');

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('fit_tracker_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [customExercises, setCustomExercises] = useState<{ resistance: string[]; cardio: string[] }>(() => {
    const saved = localStorage.getItem('fit_tracker_custom_exercises');
    return saved ? JSON.parse(saved) : { resistance: [], cardio: [] };
  });

  const [category, setCategory] = useState<'resistance' | 'cardio'>('resistance');
  const [exerciseName, setExerciseName] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  const [activeMealForAdd, setActiveMealForAdd] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks' | null>(null);
  const [foodForm, setFoodForm] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });

  const [weightKg, setWeightKg] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  // Αρχική κατάσταση ύπνου: null (ανέπαφη από προεπιλογή)
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [weeklyWeightDiff, setWeeklyWeightDiff] = useState<number | null>(null);
  const [savingHealth, setSavingHealth] = useState(false);

  // Αποθήκευση Ρυθμίσεων
  const saveSettings = (updated: UserSettings) => {
    setSettings(updated);
    localStorage.setItem('fit_tracker_settings', JSON.stringify(updated));
  };

  const availableExercises = Array.from(
    new Set([
      ...(category === 'resistance' ? INITIAL_RESISTANCE_EXERCISES : INITIAL_CARDIO_EXERCISES),
      ...customExercises[category]
    ])
  ).sort();

  const filteredExercises = availableExercises.filter((ex) =>
    ex.toLowerCase().includes(exerciseName.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddNewExerciseFromSearch = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const updated = {
      ...customExercises,
      [category]: Array.from(new Set([...customExercises[category], trimmed])).sort()
    };

    setCustomExercises(updated);
    localStorage.setItem('fit_tracker_custom_exercises', JSON.stringify(updated));
    setExerciseName(trimmed);
    setIsSearchOpen(false);
  };

  // Compact ημερομηνία: π.χ. "11 Οκτ" ή "Σήμερα, 11 Οκτ"
  const formatDateCompact = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const monthName = GREEK_MONTHS_SHORT[parseInt(month, 10) - 1];
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    return isToday ? `Σήμερα, ${parseInt(day, 10)} ${monthName}` : `${parseInt(day, 10)} ${monthName} ${year}`;
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

  const loadMealsForDay = () => {
    const saved = localStorage.getItem(`meals_${selectedDate}`);
    if (saved) {
      try {
        setMeals(JSON.parse(saved));
      } catch (e) {
        setMeals({ breakfast: [], lunch: [], dinner: [], snacks: [] });
      }
    } else {
      // Ρεαλιστικά dummy δεδομένα μόνο αν είναι η πρώτη ημέρα και κενό
      setMeals({
        breakfast: [{ id: '1', name: 'Βρώμη με γάλα & μπανάνα', calories: 380, protein: 14, carbs: 62, fats: 7 }],
        lunch: [{ id: '2', name: 'Κοτόπουλο στήθος με ρύζι', calories: 550, protein: 48, carbs: 65, fats: 9 }],
        dinner: [],
        snacks: []
      });
    }
  };

  const saveMealsForDay = (updatedMeals: typeof meals) => {
    setMeals(updatedMeals);
    localStorage.setItem(`meals_${selectedDate}`, JSON.stringify(updatedMeals));
    
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
        setSleepQuality(data.sleep_quality !== null && data.sleep_quality !== undefined ? data.sleep_quality : null);
      } else {
        setWaterMl(0);
        setWeightKg('');
        setSleepHours('');
        setSleepQuality(null);
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
          weight_kg: weightKg ? Math.max(0, parseFloat(weightKg)) : null,
          sleep_hours: sleepHours ? Math.max(0, parseFloat(sleepHours)) : null,
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

  const allLoggedFoods = Object.values(meals).flat();
  const totalCaloriesEaten = allLoggedFoods.reduce((acc, f) => acc + f.calories, 0);
  const totalProteinEaten = allLoggedFoods.reduce((acc, f) => acc + (f.protein || 0), 0);
  const totalCarbsEaten = allLoggedFoods.reduce((acc, f) => acc + (f.carbs || 0), 0);
  const totalFatsEaten = allLoggedFoods.reduce((acc, f) => acc + (f.fats || 0), 0);

  const calorieGoal = Number(settings.targetCalories) || 2400;
  const caloriesRemaining = Math.max(0, calorieGoal - totalCaloriesEaten);
  const caloriePercent = Math.min(100, Math.round((totalCaloriesEaten / calorieGoal) * 100));

  const targetProteinG = Math.round((calorieGoal * 0.30) / 4);
  const targetCarbsG = Math.round((calorieGoal * 0.40) / 4);
  const targetFatsG = Math.round((calorieGoal * 0.30) / 9);

  const handleAddFoodToMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMealForAdd || !foodForm.name || !foodForm.calories) return;

    const newFood: FoodItem = {
      id: Date.now().toString(),
      name: foodForm.name.trim(),
      calories: Math.max(0, Number(foodForm.calories)),
      protein: foodForm.protein ? Math.max(0, Number(foodForm.protein)) : undefined,
      carbs: foodForm.carbs ? Math.max(0, Number(foodForm.carbs)) : undefined,
      fats: foodForm.fats ? Math.max(0, Number(foodForm.fats)) : undefined
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

  const hasWorkout = workoutItems.length > 0;
  const hasCaloriesLogged = totalCaloriesEaten > 0;
  const hasWaterLogged = waterMl > 0;
  const hasSleepLogged = Boolean(sleepHours && Number(sleepHours) > 0);
  const isDayComplete = hasWorkout && hasCaloriesLogged && hasWaterLogged && hasSleepLogged;

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
    if (!exerciseName.trim()) return alert('Επίλεξε ή γράψε άσκηση!');

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
          weight: Math.max(0, Number(weight)),
          reps: Math.max(0, Number(reps))
        }]);
        if (error) throw error;
      } else {
        if (!duration) return alert('Ο χρόνος είναι υποχρεωτικός στο cardio!');
        const { error } = await supabase.from('workout_items').insert([{
          workout_id: currentWorkoutId,
          exercise_name: exerciseName.trim(),
          category: 'cardio',
          duration_minutes: Math.max(0, Number(duration)),
          distance_km: distance ? Math.max(0, Number(distance)) : null,
          incline: incline ? Math.max(0, Number(incline)) : null
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
          className={`h-9 w-9 mx-auto rounded-xl text-xs font-semibold tabular-nums flex flex-col items-center justify-center relative transition-all ${
            isSelected 
              ? 'bg-blue-600 text-white shadow-md' 
              : isToday 
              ? 'border border-blue-500 text-blue-400' 
              : 'text-slate-300 hover:bg-white/[0.04]'
          }`}
        >
          <span>{d}</span>
          {hasLogs && !isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute bottom-1" />
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 max-w-md mx-auto font-sans tabular-nums pb-28">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold tracking-tight text-white uppercase">
          Fit Tracker
        </h1>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setCalendarViewDate(new Date(selectedDate));
              setIsCalendarOpen(true);
            }}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-colors"
            title="Ημερολόγιο"
          >
            <Calendar className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-colors"
            title="Ρυθμίσεις"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Compact Inline Date Bar */}
      <div className="flex items-center justify-between bg-[#111827] border border-white/[0.06] px-3 py-2 rounded-xl mb-4">
        <button 
          onClick={() => changeDate(-1)} 
          className="p-1.5 hover:bg-white/[0.06] rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <button 
          onClick={setToday}
          className="text-xs font-semibold text-white hover:text-blue-400 transition-colors"
          title="Επαναφορά στο Σήμερα"
        >
          {formatDateCompact(selectedDate)}
        </button>

        <button 
          onClick={() => changeDate(1)} 
          className="p-1.5 hover:bg-white/[0.06] rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Completion Banner */}
      {isDayComplete && (
        <div className="mb-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl p-3 flex items-center gap-3">
          <Award className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="text-xs">
            <h4 className="font-semibold text-white">Ημέρα Ολοκληρώθηκε</h4>
            <p className="text-slate-400">Κατέγραψες Προπόνηση, Διατροφή, Νερό και Ύπνο.</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          ΚΑΡΤΕΛΑ: ΑΡΧΙΚΗ ΟΘΟΝΗ (ΠΡΑΓΜΑΤΙΚΟ DASHBOARD)
         ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-semibold text-white">Επισκόπηση Ημέρας</h2>
            <span className="text-xs text-slate-400">
              {settings.goal === 'cut' ? 'Στόχος: Cut' : settings.goal === 'bulk' ? 'Στόχος: Bulk' : 'Συντήρηση'}
            </span>
          </div>

          {/* 1. Dashboard: Διατροφή & Θερμίδες */}
          <div 
            onClick={() => setActiveTab('nutrition')}
            className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 cursor-pointer hover:border-white/[0.12] transition-colors"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-slate-400">Θερμίδες & Macros</span>
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                Καταγραφή <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex justify-between items-baseline mb-2">
              <span className="text-2xl font-bold text-white tracking-tight">{totalCaloriesEaten}</span>
              <span className="text-xs text-slate-400">από {calorieGoal} kcal ({caloriesRemaining} απομένουν)</span>
            </div>

            {/* Calorie Bar */}
            <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden mb-3">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${caloriePercent}%` }}
              />
            </div>

            {/* Muted Macros */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.04] text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Πρωτεΐνη</span>
                <span className="font-semibold text-white">{totalProteinEaten} <span className="text-slate-400 text-[10px]">/ {targetProteinG}g</span></span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Υδατάνθρακες</span>
                <span className="font-semibold text-white">{totalCarbsEaten} <span className="text-slate-400 text-[10px]">/ {targetCarbsG}g</span></span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Λιπαρά</span>
                <span className="font-semibold text-white">{totalFatsEaten} <span className="text-slate-400 text-[10px]">/ {targetFatsG}g</span></span>
              </div>
            </div>
          </div>

          {/* 2. Dashboard: Σημερινή Προπόνηση */}
          <div 
            onClick={() => setActiveTab('workout')}
            className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 cursor-pointer hover:border-white/[0.12] transition-colors"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-400">Προπόνηση Ημέρας</span>
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                {workoutItems.length > 0 ? 'Προβολή' : 'Έναρξη'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {workoutItems.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <span className="text-sm font-semibold text-white block">
                  {Object.keys(groupedExercises).length} {Object.keys(groupedExercises).length === 1 ? 'άσκηση' : 'ασκήσεις'} ({workoutItems.length} συνολικά σετ)
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.keys(groupedExercises).slice(0, 4).map((name) => (
                    <span key={name} className="text-xs bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg text-slate-300">
                      {name}
                    </span>
                  ))}
                  {Object.keys(groupedExercises).length > 4 && (
                    <span className="text-xs text-slate-400 self-center">+{Object.keys(groupedExercises).length - 4} ακόμα</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-1">
                Δεν έχει καταγραφεί προπόνηση για σήμερα. Πάτησε για να ξεκινήσεις.
              </p>
            )}
          </div>

          {/* 3. Dashboard: Σώμα, Ύπνος & Νερό */}
          <div className="grid grid-cols-2 gap-3">
            {/* Βάρος & Ύπνος */}
            <div 
              onClick={() => setActiveTab('body_sleep')}
              className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 cursor-pointer hover:border-white/[0.12] transition-colors"
            >
              <span className="text-xs font-medium text-slate-400 block mb-1">Σώμα & Ύπνος</span>
              <div className="my-1">
                <span className="text-lg font-bold text-white block">{weightKg ? `${weightKg} kg` : '—'}</span>
                <span className="text-xs text-slate-400">{sleepHours ? `${sleepHours} ώρες ύπνου` : 'Χωρίς ύπνο'}</span>
              </div>
              {weeklyWeightDiff !== null && (
                <span className="text-[11px] text-slate-400 block pt-1 border-t border-white/[0.04]">
                  {weeklyWeightDiff > 0 ? `+${weeklyWeightDiff}` : weeklyWeightDiff} kg / εβδ.
                </span>
              )}
            </div>

            {/* Νερό (Με άμεσο +250ml) */}
            <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-400">Νερό</span>
                  <span className="text-xs font-semibold text-white">{waterMl} ml</span>
                </div>
                <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden my-2">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (waterMl / Number(settings.targetWater || 2500)) * 100)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWaterAmount(waterMl + 250)}
                className="w-full py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-200 rounded-xl text-xs font-medium transition-colors"
              >
                +250 ml
              </button>
            </div>
          </div>

          {/* 4. Εβδομαδιαίος Στόχος Προπονήσεων */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 block">Εβδομαδιαίος Στόχος Προπονήσεων</span>
              <span className="text-xs text-slate-300">
                Στόχος: <strong className="text-white">{settings.targetWorkoutsPerWeek || 4}</strong> ημέρες / εβδομάδα
              </span>
            </div>
            <span className="text-xs font-semibold text-blue-400 bg-blue-600/10 px-2.5 py-1 rounded-lg">
              Ενεργός
            </span>
          </div>

        </div>
      )}

      {/* =========================================================================
          ΚΑΡΤΕΛΑ: ΠΡΟΠΟΝΗΣΗ (BLUE ACCENT)
         ========================================================================= */}
      {activeTab === 'workout' && (
        <div className="space-y-4">
          {/* Category Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#111827] p-1 rounded-xl border border-white/[0.06]">
            <button
              onClick={() => { setCategory('resistance'); setExerciseName(''); }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                category === 'resistance' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Βάρη
            </button>
            <button
              onClick={() => { setCategory('cardio'); setExerciseName(''); }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                category === 'cardio' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cardio
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAddWorkoutItem} className="bg-[#111827] p-4 rounded-2xl border border-white/[0.06] space-y-3">
            <div ref={searchContainerRef} className="relative">
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Άσκηση
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Αναζήτηση (π.χ. Bench Press, Squat...)"
                  value={exerciseName}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setExerciseName(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>

              {isSearchOpen && (
                <div 
                  onMouseDown={(e) => e.preventDefault()} 
                  className="absolute left-0 right-0 top-full mt-1.5 bg-[#111827] border border-white/[0.08] rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1 space-y-1"
                >
                  {filteredExercises.length > 0 ? (
                    filteredExercises.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => {
                          setExerciseName(ex);
                          setIsSearchOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          exerciseName.toLowerCase() === ex.toLowerCase()
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span>{ex}</span>
                        {exerciseName.toLowerCase() === ex.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-slate-400">Δεν βρέθηκε άσκηση.</p>
                      {exerciseName.trim() && (
                        <button
                          type="button"
                          onClick={() => handleAddNewExerciseFromSearch(exerciseName)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
                        >
                          Προσθήκη «{exerciseName.trim()}»
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {category === 'resistance' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Κιλά (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="π.χ. 60"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value.replace('-', ''))}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Επαναλήψεις</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="π.χ. 8"
                    value={reps}
                    onChange={(e) => setReps(e.target.value.replace('-', ''))}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Χρόνος (Λεπτά)*</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="π.χ. 25"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value.replace('-', ''))}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Απόσταση (km)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="π.χ. 3.5"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value.replace('-', ''))}
                      className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Κλίση (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="π.χ. 2"
                      value={incline}
                      onChange={(e) => setIncline(e.target.value.replace('-', ''))}
                      className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              + Προσθήκη Σετ
            </button>
          </form>

          {/* Workout List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Σημερινές Ασκήσεις
            </h3>
            
            {loadingWorkouts ? (
              <div className="text-center py-6 text-slate-400 text-xs">Φόρτωση...</div>
            ) : exerciseOrder.length === 0 ? (
              <div className="text-center py-6 border border-white/[0.06] rounded-2xl bg-[#111827]">
                <p className="text-xs text-slate-400">Καμία άσκηση καταγεγραμμένη για σήμερα.</p>
              </div>
            ) : (
              exerciseOrder.map((name, index) => {
                const group = groupedExercises[name];
                if (!group) return null;

                return (
                  <div key={name} className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                      <div 
                        onClick={() => openExerciseModal(group)}
                        className="cursor-pointer flex-1 flex items-center gap-2 group mr-2"
                      >
                        <h4 className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                          {group.name}
                        </h4>
                        <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                          {group.category === 'resistance' ? `${group.items.length} σετ` : 'Cardio'}
                        </span>

                        <div className="flex items-center bg-[#0B0F19] rounded-lg p-0.5 border border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => moveExercise(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-white/[0.06] disabled:opacity-20 text-slate-400 hover:text-white rounded"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveExercise(index, 'down')}
                            disabled={index === exerciseOrder.length - 1}
                            className="p-1 hover:bg-white/[0.06] disabled:opacity-20 text-slate-400 hover:text-white rounded"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((item, setIndex) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-[#0B0F19]">
                          <span className="text-slate-400 font-medium w-6">#{setIndex + 1}</span>
                          <div className="flex-1 font-medium">
                            {item.category === 'resistance' ? (
                              <span>
                                <strong className="text-white">{item.weight} kg</strong>
                                <span className="text-slate-400 mx-1.5">×</span>
                                <strong className="text-slate-200">{item.reps} reps</strong>
                              </span>
                            ) : (
                              <span className="text-slate-200">
                                <strong>{item.duration_minutes} min</strong> 
                                {item.distance_km && ` | ${item.distance_km} km`} 
                                {item.incline && ` | ${item.incline}%`}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteWorkoutItem(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
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
                        window.scrollTo({ top: 100, behavior: 'smooth' });
                      }}
                      className="mt-3 w-full py-2 text-xs font-medium text-slate-400 hover:text-white bg-[#0B0F19] rounded-xl border border-white/[0.06] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Επόμενο σετ
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ΚΑΡΤΕΛΑ: ΔΙΑΤΡΟΦΗ (CLEAN LIFESUM & WATER PROGRESS)
         ========================================================================= */}
      {activeTab === 'nutrition' && (
        <div className="space-y-4">
          
          {/* Calorie Hero Card */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-400">Υπόλοιπο Θερμίδων</span>
              <span className="text-xs font-semibold text-blue-400">{caloriePercent}% του στόχου</span>
            </div>

            <div className="text-center py-2">
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {caloriesRemaining}
              </div>
              <span className="text-xs text-slate-400">kcal απομένουν</span>
            </div>

            <div className="w-full bg-[#0B0F19] h-2 rounded-full overflow-hidden my-3">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${caloriePercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-slate-400 border-b border-white/[0.04] pb-3 mb-3">
              <span>Κατανάλωση: <strong className="text-white">{totalCaloriesEaten}</strong> kcal</span>
              <span>Στόχος: <strong className="text-white">{calorieGoal}</strong> kcal</span>
            </div>

            {/* Muted Tasteful Macros */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#0B0F19] p-2 rounded-xl border border-white/[0.04]">
                <span className="text-[11px] text-amber-300/80 block mb-0.5">Υδατάνθρακες</span>
                <span className="font-semibold text-white">{totalCarbsEaten} <span className="text-slate-500 text-[10px]">/ {targetCarbsG}g</span></span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-xl border border-white/[0.04]">
                <span className="text-[11px] text-sky-300/80 block mb-0.5">Πρωτεΐνη</span>
                <span className="font-semibold text-white">{totalProteinEaten} <span className="text-slate-500 text-[10px]">/ {targetProteinG}g</span></span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-xl border border-white/[0.04]">
                <span className="text-[11px] text-rose-300/80 block mb-0.5">Λιπαρά</span>
                <span className="font-semibold text-white">{totalFatsEaten} <span className="text-slate-500 text-[10px]">/ {targetFatsG}g</span></span>
              </div>
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Γεύματα
            </h3>

            {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((mealKey) => {
              const label = mealKey === 'breakfast' ? 'Πρωινό' : mealKey === 'lunch' ? 'Μεσημεριανό' : mealKey === 'dinner' ? 'Βραδινό' : 'Σνακ';
              const mealItems = meals[mealKey];
              const mealCals = mealItems.reduce((acc, f) => acc + f.calories, 0);

              return (
                <div key={mealKey} className="bg-[#111827] border border-white/[0.06] rounded-2xl p-3.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{label}</span>
                      <span className="text-xs text-slate-400">({mealCals} kcal)</span>
                    </div>

                    <button
                      onClick={() => setActiveMealForAdd(mealKey)}
                      className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-lg border border-white/[0.06] transition-colors"
                      title="Προσθήκη φαγητού"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {mealItems.length > 0 && (
                    <div className="space-y-1 pt-2.5 mt-2 border-t border-white/[0.04]">
                      {mealItems.map((food) => (
                        <div key={food.id} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-[#0B0F19]">
                          <span className="text-slate-200">{food.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">{food.calories} kcal</span>
                            <button onClick={() => handleDeleteFoodItem(mealKey, food.id)} className="text-slate-500 hover:text-rose-400">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clean Water Tracker (Progress Bar + Quick Button) */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-semibold text-white">Κατανάλωση Νερού</h4>
                <span className="text-xs text-slate-400">Στόχος: {settings.targetWater || 2500} ml</span>
              </div>
              <span className="text-base font-bold text-white">{waterMl} ml</span>
            </div>

            <div className="w-full bg-[#0B0F19] h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (waterMl / Number(settings.targetWater || 2500)) * 100)}%` }}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setWaterAmount(waterMl + 250)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                +250 ml
              </button>
              <button
                type="button"
                onClick={() => setWaterAmount(0)}
                className="py-2.5 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white rounded-xl text-xs font-medium transition-colors"
              >
                Μηδενισμός
              </button>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          ΚΑΡΤΕΛΑ: ΣΩΜΑ & ΥΠΝΟΣ (FIXED OVERFLOW & CLEAN SLIDER)
         ========================================================================= */}
      {activeTab === 'body_sleep' && (
        <div className="space-y-4 w-full max-w-full">
          
          {/* Βάρος Card */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-white">Σημερινό Βάρος</h3>
              {weeklyWeightDiff !== null && (
                <span className="text-xs text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                  {weeklyWeightDiff > 0 ? `+${weeklyWeightDiff}` : weeklyWeightDiff} kg / εβδ.
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="π.χ. 78.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value.replace('-', ''))}
                className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 text-lg font-bold text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-medium">kg</span>
            </div>

            {settings.targetWeight && (
              <div className="flex justify-between text-xs text-slate-400 pt-1">
                <span>Στόχος: <strong className="text-white">{settings.targetWeight} kg</strong></span>
                {weightKg && (
                  <span>Διαφορά: {(Number(weightKg) - Number(settings.targetWeight)).toFixed(1)} kg</span>
                )}
              </div>
            )}
          </div>

          {/* Ύπνος Card με Custom Minimal Range Slider */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-white">Ύπνος</h3>
              {settings.targetSleep && (
                <span className="text-xs text-slate-400">Στόχος: {settings.targetSleep} ώρες</span>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Ώρες Ύπνου</label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="π.χ. 7.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value.replace('-', ''))}
                className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>

            {/* Custom Range Slider (Neutral on start) */}
            <div className="space-y-2 pt-2 border-t border-white/[0.04]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Ποιότητα Ύπνου</span>
                <span className="font-semibold text-white">
                  {sleepQuality !== null ? `${sleepQuality} / 10` : 'Ανέπαφο'}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sleepQuality !== null ? sleepQuality : 5}
                onChange={(e) => setSleepQuality(parseInt(e.target.value, 10))}
                className="w-full sleep-slider cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-slate-500 px-0.5">
                <span>1 (Κακός)</span>
                <span>5</span>
                <span>10 (Εξαιρετικός)</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={savingHealth}
            onClick={() => handleSaveBodyAndSleep()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {savingHealth ? 'Αποθήκευση...' : 'Αποθήκευση Σώματος & Ύπνου'}
          </button>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Add Food Modal */}
      {activeMealForAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-sm p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
              <h3 className="font-semibold text-sm text-white">
                Προσθήκη στο {activeMealForAdd === 'breakfast' ? 'Πρωινό' : activeMealForAdd === 'lunch' ? 'Μεσημεριανό' : activeMealForAdd === 'dinner' ? 'Βραδινό' : 'Σνακ'}
              </h3>
              <button onClick={() => setActiveMealForAdd(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFoodToMeal} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Φαγητό</label>
                <input
                  type="text"
                  placeholder="π.χ. Κοτόπουλο με ρύζι"
                  value={foodForm.name}
                  onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Θερμίδες (kcal)*</label>
                <input
                  type="number"
                  min="0"
                  placeholder="π.χ. 450"
                  value={foodForm.calories}
                  onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value.replace('-', '') })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Πρωτεΐνη (g)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="g"
                    value={foodForm.protein}
                    onChange={(e) => setFoodForm({ ...foodForm, protein: e.target.value.replace('-', '') })}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2 text-xs placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Υδατάνθρακες</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="g"
                    value={foodForm.carbs}
                    onChange={(e) => setFoodForm({ ...foodForm, carbs: e.target.value.replace('-', '') })}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2 text-xs placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Λιπαρά</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="g"
                    value={foodForm.fats}
                    onChange={(e) => setFoodForm({ ...foodForm, fats: e.target.value.replace('-', '') })}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2 text-xs placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                + Προσθήκη
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <button
                onClick={() => {
                  const d = new Date(calendarViewDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarViewDate(d);
                }}
                className="p-1 hover:bg-white/[0.04] rounded-lg text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-semibold text-xs text-white">
                {GREEK_MONTHS_FULL[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
              </span>

              <button
                onClick={() => {
                  const d = new Date(calendarViewDate);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarViewDate(d);
                }}
                className="p-1 hover:bg-white/[0.04] rounded-lg text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-500">
              <span>Δε</span><span>Τρ</span><span>Τε</span><span>Πε</span><span>Πα</span><span>Σα</span><span>Κυ</span>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
              {renderCalendarDays()}
            </div>

            <button
              onClick={() => setIsCalendarOpen(false)}
              className="w-full bg-white/[0.04] hover:bg-white/[0.08] py-2 rounded-xl text-xs font-semibold text-slate-300"
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-md p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="font-semibold text-sm text-white">Ρυθμίσεις & Στόχοι</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium block">Κύριος Στόχος</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cut', 'maintain', 'bulk'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSettings({ ...settings, goal: g })}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      settings.goal === g
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0B0F19] text-slate-400 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {g === 'cut' ? 'Cut' : g === 'maintain' ? 'Συντήρηση' : 'Bulk'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Τωρινό Βάρος (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="π.χ. 78"
                  value={settings.currentWeight}
                  onChange={(e) => setSettings({ ...settings, currentWeight: e.target.value.replace('-', '') })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Βάρους (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="π.χ. 75"
                  value={settings.targetWeight}
                  onChange={(e) => setSettings({ ...settings, targetWeight: e.target.value.replace('-', '') })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Θερμίδων</label>
                <input
                  type="number"
                  min="0"
                  placeholder="π.χ. 2400"
                  value={settings.targetCalories}
                  onChange={(e) => setSettings({ ...settings, targetCalories: e.target.value.replace('-', '') })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Νερού (ml)</label>
                <input
                  type="number"
                  min="0"
                  step="250"
                  placeholder="π.χ. 2500"
                  value={settings.targetWater}
                  onChange={(e) => setSettings({ ...settings, targetWater: e.target.value.replace('-', '') })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Στόχος Ύπνου (ώρες)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="π.χ. 8"
                  value={settings.targetSleep}
                  onChange={(e) => setSettings({ ...settings, targetSleep: e.target.value.replace('-', '') })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Προπονήσεις / Εβδ.</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  placeholder="π.χ. 4"
                  value={settings.targetWorkoutsPerWeek}
                  onChange={(e) => setSettings({ ...settings, targetWorkoutsPerWeek: e.target.value.replace('-', '') })}
                  className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                saveSettings(settings);
                setIsSettingsOpen(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              Αποθήκευση
            </button>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {modalExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-md p-4 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="font-semibold text-sm text-white">{modalExercise.name}</h3>
              <button onClick={() => setModalExercise(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-medium text-slate-400 mb-2">Σημερινά Σετ ({modalExercise.items.length})</h4>
              <div className="space-y-1">
                {modalExercise.items.map((item, idx) => (
                  <div key={item.id} className="flex justify-between items-center bg-[#0B0F19] p-2 rounded-xl text-xs">
                    <span className="text-slate-400">Σετ #{idx + 1}</span>
                    <span className="font-medium text-white">
                      {item.category === 'resistance' ? `${item.weight} kg × ${item.reps} reps` : `${item.duration_minutes} min`}
                    </span>
                    <button onClick={() => handleDeleteWorkoutItem(item.id)} className="text-slate-500 hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(modalHistoryByDate).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-slate-400 mb-2">Ιστορικό</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(modalHistoryByDate).map(([dateStr, sets]) => (
                    <div key={dateStr} className="bg-[#0B0F19] p-2 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400 border-b border-white/[0.04] pb-1">
                        <span>{formatDateCompact(dateStr)}</span>
                        <span>{sets.length} σετ</span>
                      </div>
                      {sets.map((s, sIdx) => (
                        <div key={s.id} className="flex justify-between text-slate-300">
                          <span className="text-slate-500">#{sIdx + 1}</span>
                          <span>{s.weight} kg × {s.reps}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setModalExercise(null)}
              className="w-full bg-white/[0.04] hover:bg-white/[0.08] py-2 rounded-xl text-xs font-medium text-slate-300"
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR (UNIFIED BLUE ACCENT) ================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#111827]/95 backdrop-blur-md border-t border-white/[0.06] flex justify-around p-2 z-40">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            activeTab === 'home' ? 'text-blue-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px]">Αρχική</span>
        </button>

        <button
          onClick={() => setActiveTab('workout')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            activeTab === 'workout' ? 'text-blue-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[11px]">Προπόνηση</span>
        </button>

        <button
          onClick={() => setActiveTab('nutrition')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            activeTab === 'nutrition' ? 'text-blue-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Utensils className="w-5 h-5" />
          <span className="text-[11px]">Διατροφή</span>
        </button>

        <button
          onClick={() => setActiveTab('body_sleep')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            activeTab === 'body_sleep' ? 'text-blue-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Moon className="w-5 h-5" />
          <span className="text-[11px]">Σώμα & Ύπνος</span>
        </button>
      </nav>

    </div>
  );
}