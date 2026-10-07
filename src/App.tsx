import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  ChevronLeft, ChevronRight, Dumbbell, Flame, Plus, Trash2, 
  Calendar, History, GripVertical, X, Info
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

const ALL_RESISTANCE_EXERCISES = [
  "Ab Wheel Rollout", "Arnold Press", "Barbell Bicep Curl", "Barbell Row",
  "Barbell Squat", "Bench Press", "Bicycle Crunches",
  "Bulgarian Split Squat", "Cable Bicep Curl", "Cable Crossover",
  "Cable Lateral Raises", "Calf Raises", "Chest Press Machine",
  "Close Grip Bench Press", "Crunches", "Deadlift",
  "Decline Dumbbell Press", "Dips", "Dumbbell Flyes",
  "Dumbbell Hammer Curl", "Dumbbell Shoulder Press", "Face Pulls", "Front Raises",
  "Hack Squat", "Hanging Leg Raises", "Hip Thrust", "Incline Barbell Press",
  "Incline Dumbbell Curl", "Incline Dumbbell Press", "Lat Pulldown",
  "Lateral Raises", "Leg Extension", "Leg Press",
  "Lying Leg Curl", "One-Arm Dumbbell Row", "Overhead Press (OHP)",
  "Overhead Tricep Extension", "Pec Deck Machine", "Plank",
  "Preacher Curl", "Pull-ups", "Push-ups",
  "Romanian Deadlift (RDL)", "Russian Twists", "Seated Cable Row",
  "Shoulder Press Machine", "Shrugs", "Skull Crushers",
  "T-Bar Row", "Tricep Pushdown", "Walking Lunges"
];

const ALL_CARDIO_EXERCISES = [
  "Air Bike", "Box Jumps", "HIIT / Sprints", "Stairmaster",
  "Treadmill", "Elliptical", "Rowing",
  "Stationary Bike", "Jump Rope", "Outdoor Running"
];

export default function App() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Ημερομηνία
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [category, setCategory] = useState<'resistance' | 'cardio'>('resistance');
  const [exerciseName, setExerciseName] = useState('');
  
  // Resistance State
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  // Cardio State
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [incline, setIncline] = useState('');

  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalExercise, setModalExercise] = useState<{
    name: string;
    category: 'resistance' | 'cardio';
    items: WorkoutItem[];
  } | null>(null);
  const [modalHistoryByDate, setModalHistoryByDate] = useState<Record<string, WorkoutItem[]>>({});

  // Drag & Drop State
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [draggingExercise, setDraggingExercise] = useState<string | null>(null);
  const longPressTimer = useRef<any>(null);

  // PWA Install listener
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

  // Απαγόρευση context menu (popups) στο κινητό
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

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

  // Φόρτωση ασκήσεων της ημέρας
  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('id')
        .eq('workout_date', selectedDate)
        .maybeSingle();

      if (workoutError) throw workoutError;

      if (workout) {
        const { data: items, error: itemsError } = await supabase
          .from('workout_items')
          .select('*')
          .eq('workout_id', workout.id)
          .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;
        setWorkoutItems(items || []);
      } else {
        setWorkoutItems([]);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, [selectedDate]);

  // Ομαδοποίηση σημερινών σετ ανά άσκηση
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

  // Φόρτωση ιστορικού για το Modal (Ομαδοποίηση ανά ημερομηνία)
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
          // Εξαιρούμε τη σημερινή μέρα γιατί φαίνεται ήδη στα "Σημερινά Σετ"
          if (itemDate === selectedDate) return;
          if (!byDate[itemDate]) {
            byDate[itemDate] = [];
          }
          byDate[itemDate].push(item);
        });
        setModalHistoryByDate(byDate);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Αποθήκευση Άσκησης
  const handleAddItem = async (e: React.FormEvent) => {
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

        if (createError || !newWorkout) {
          throw createError || new Error('Αποτυχία δημιουργίας προπόνησης');
        }
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
        if (!duration) return alert('Ο χρόνος (λεπτά) είναι υποχρεωτικός στο cardio!');
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
    } catch (err: any) {
      alert('Σφάλμα: ' + err.message);
    }
  };

  // Διαγραφή σετ
  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from('workout_items').delete().eq('id', id);
    if (!error) {
      setWorkoutItems((prev) => prev.filter((item) => item.id !== id));
      if (modalExercise) {
        setModalExercise((prev) => prev ? {
          ...prev,
          items: prev.items.filter((item) => item.id !== id)
        } : null);
      }
    }
  };

  // ================= DRAG & DROP =================
  const handleTouchStart = (name: string) => {
    longPressTimer.current = setTimeout(() => {
      setDraggingExercise(name);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    }, 350);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingExercise) {
      clearTimeout(longPressTimer.current);
      return;
    }
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetCard = element?.closest('[data-exercise-name]');
    if (targetCard) {
      const targetName = targetCard.getAttribute('data-exercise-name');
      if (targetName && targetName !== draggingExercise) {
        setExerciseOrder((prev) => {
          const curIdx = prev.indexOf(draggingExercise);
          const tgtIdx = prev.indexOf(targetName);
          if (curIdx === -1 || tgtIdx === -1) return prev;
          const updated = [...prev];
          updated.splice(curIdx, 1);
          updated.splice(tgtIdx, 0, draggingExercise);
          return updated;
        });
      }
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    setDraggingExercise(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto font-sans pb-24">
      
      {/* PWA Install Button */}
      {installPrompt && (
        <button
          onClick={handleInstallClick}
          className="w-full mb-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 animate-pulse"
        >
          📲 Εγκατάσταση Εφαρμογής στο Κινητό
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <span>FIT TRACKER</span>
        </h1>
        <button 
          onClick={setToday}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" /> Σήμερα
        </button>
      </div>

      {/* 1. Date Navigator */}
      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800/80 mb-6 shadow-sm">
        <button 
          onClick={() => changeDate(-1)} 
          className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Ημερομηνια</span>
          <span className="font-bold text-base text-indigo-400">{formatDateDisplay(selectedDate)}</span>
        </div>
        <button 
          onClick={() => changeDate(1)} 
          className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Toggle: Resistance vs Cardio */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800/80 mb-6">
        <button
          onClick={() => {
            setCategory('resistance');
            setExerciseName('');
          }}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            category === 'resistance' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Dumbbell className="w-4 h-4" /> Βάρη
        </button>
        <button
          onClick={() => {
            setCategory('cardio');
            setExerciseName('');
          }}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            category === 'cardio' 
              ? 'bg-rose-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4" /> Cardio
        </button>
      </div>

      {/* 3. Φόρμα Καταγραφής (Πεντακάθαρη, χωρίς το περιττό κουτί ιστορικού) */}
      <form onSubmit={handleAddItem} className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 space-y-4 mb-6 shadow-sm">
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
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Επαναλήψεις</label>
              <input
                type="number"
                placeholder="π.χ. 8"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500 placeholder:text-slate-600 transition-colors"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-slate-700 placeholder:text-slate-600 transition-colors"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-slate-700 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> Προσθήκη Σετ
        </button>
      </form>

      {/* 4. Ομαδοποιημένη Λίστα Ασκήσεων με Drag & Drop */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Σημερινες Ασκησεις
          </h3>
          <span className="text-[10px] text-slate-600">
            Παρατεταμένο πάτημα για αλλαγή σειράς
          </span>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Φόρτωση...</div>
        ) : exerciseOrder.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800/80 rounded-2xl">
            <p className="text-sm text-slate-500">Καμία καταγεγραμμένη άσκηση για αυτή τη μέρα.</p>
          </div>
        ) : (
          <div 
            className="space-y-3"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {exerciseOrder.map((name) => {
              const group = groupedExercises[name];
              if (!group) return null;
              const isDragging = draggingExercise === name;

              return (
                <div
                  key={name}
                  data-exercise-name={name}
                  onTouchStart={() => handleTouchStart(name)}
                  draggable
                  onDragStart={() => setDraggingExercise(name)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggingExercise && draggingExercise !== name) {
                      setExerciseOrder((prev) => {
                        const curIdx = prev.indexOf(draggingExercise);
                        const tgtIdx = prev.indexOf(name);
                        const updated = [...prev];
                        updated.splice(curIdx, 1);
                        updated.splice(tgtIdx, 0, draggingExercise);
                        return updated;
                      });
                    }
                  }}
                  onDragEnd={() => setDraggingExercise(null)}
                  className={`bg-slate-900 border rounded-2xl p-4 transition-all shadow-sm ${
                    isDragging 
                      ? 'border-indigo-500 shadow-indigo-500/20 shadow-lg scale-[1.02] bg-slate-850' 
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Header: Όνομα + Grip + Κλικ για Modal */}
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3">
                    <div 
                      onClick={() => openExerciseModal(group)}
                      className="cursor-pointer flex-1 flex items-center gap-2 group"
                    >
                      <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                        {group.name}
                      </h4>
                      <Info className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        group.category === 'resistance' 
                          ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50' 
                          : 'bg-rose-950/60 text-rose-400 border border-rose-900/50'
                      }`}>
                        {group.category === 'resistance' ? `${group.items.length} Σετ` : 'Cardio'}
                      </span>
                      <div className="text-slate-600 cursor-grab active:cursor-grabbing p-1">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Αριθμημένα Σετ */}
                  <div className="space-y-1.5">
                    {group.items.map((item, setIndex) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950/40"
                      >
                        <span className="text-slate-500 font-semibold w-6">
                          #{setIndex + 1}
                        </span>

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
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-600 hover:text-rose-500 p-1 transition-colors"
                          title="Διαγραφή σετ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Κουμπί για γρήγορη προσθήκη επόμενου σετ */}
                  <button
                    onClick={() => {
                      setExerciseName(group.name);
                      setCategory(group.category);
                      const lastItem = group.items[group.items.length - 1];
                      if (lastItem && lastItem.weight) setWeight(lastItem.weight.toString());
                      window.scrollTo({ top: 150, behavior: 'smooth' });
                    }}
                    className="mt-3 w-full py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-400 bg-slate-950/60 hover:bg-slate-950 rounded-lg border border-slate-800/60 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Προσθήκη επόμενου σετ
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL ΠΑΡΑΘΥΡΟ (ΚΟΥΤΑΚΙΑ ΑΝΑ ΗΜΕΡΑ) ================= */}
      {modalExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-white">{modalExercise.name}</h3>
                <span className="text-xs text-slate-500">Ιστορικό & Παλαιότερες Προπονήσεις</span>
              </div>
              <button 
                onClick={() => setModalExercise(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Σημερινά Σετ */}
            <div>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
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
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-600 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Παλαιότερες Προπονήσεις σε ΚΟΥΤΑΚΙΑ ανά Ημερομηνία */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" /> Παλαιοτερες Ημερες
              </h4>

              {Object.keys(modalHistoryByDate).length === 0 ? (
                <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center">
                  <p className="text-xs text-slate-600 italic">Δεν βρέθηκαν προηγούμενες ημέρες για αυτή την άσκηση.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(modalHistoryByDate)
                    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // πιο πρόσφατη μέρα πρώτη
                    .map(([dateStr, sets]) => (
                      <div key={dateStr} className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2 shadow-sm">
                        {/* Κεφαλίδα κουτιού με Ημερομηνία */}
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                          <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                            📅 {formatDateDisplay(dateStr)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                            {sets.length} {sets.length === 1 ? 'σετ' : 'σετ'}
                          </span>
                        </div>

                        {/* Λίστα σετ εκείνης της ημέρας */}
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
                                    {s.duration_minutes} min {s.distance_km ? `| ${s.distance_km} km` : ''} {s.incline ? `| ${s.incline}%` : ''}
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

            {/* Κλείσιμο */}
            <button
              onClick={() => setModalExercise(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold text-slate-300 transition-colors"
            >
              Κλείσιμο
            </button>

          </div>
        </div>
      )}

    </div>
  );
}