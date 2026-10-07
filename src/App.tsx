import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ChevronLeft, ChevronRight, Dumbbell, Flame, Plus, Trash2, Calendar, Sparkles } from 'lucide-react';

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
}

// Βάση δεδομένων με τις 10 πιο γνωστές ασκήσεις ανά μυϊκή ομάδα
const EXERCISE_DATABASE: Record<string, string[]> = {
  "Στήθος": [
    "Bench Press (Ίσιος Πάγκος)",
    "Incline Dumbbell Press (Επικλινής με Αλτήρες)",
    "Dumbbell Flyes (Ανοίγματα)",
    "Dips (Βυθίσεις Στήθους)",
    "Cable Crossover (Τροχαλία)",
    "Push-ups (Κάμψεις)",
    "Chest Press Machine",
    "Incline Barbell Press",
    "Pec Deck Machine",
    "Decline Dumbbell Press"
  ],
  "Πλάτη": [
    "Deadlift (Άρσεις Θανάτου)",
    "Pull-ups (Έλξεις Μονοζύγου)",
    "Lat Pulldown (Έλξεις Τροχαλίας)",
    "Barbell Row (Κωπηλατική με Μπάρα)",
    "Seated Cable Row (Κωπηλατική Τροχαλίας)",
    "One-Arm Dumbbell Row",
    "T-Bar Row",
    "Face Pulls",
    "Hyperextensions (Ραχιαίοι)",
    "Straight Arm Pulldown"
  ],
  "Πόδια": [
    "Barbell Squat (Κάθισμα με Μπάρα)",
    "Leg Press (Πρέσα)",
    "Romanian Deadlift (RDL)",
    "Bulgarian Split Squat",
    "Leg Extension (Τετρακέφαλοι)",
    "Lying Leg Curl (Μηριαίοι Δικέφαλοι)",
    "Calf Raises (Γάμπες)",
    "Walking Lunges (Προβολές)",
    "Hip Thrust (Γλουτοί)",
    "Hack Squat"
  ],
  "Ώμοι": [
    "Overhead Press (OHP με Μπάρα)",
    "Dumbbell Shoulder Press",
    "Lateral Raises (Πλάγιες Εκτάσεις)",
    "Arnold Press",
    "Rear Delt Flyes (Οπίσθιοι Δελτοειδείς)",
    "Front Raises (Εμπρόσθιες Εκτάσεις)",
    "Cable Lateral Raises",
    "Upright Row",
    "Dumbbell Shrugs (Τραπεζοειδείς)",
    "Machine Shoulder Press"
  ],
  "Χέρια": [
    "Barbell Bicep Curl",
    "Dumbbell Hammer Curl",
    "Preacher Curl (Μαξιλάρι)",
    "Incline Dumbbell Curl",
    "Tricep Pushdown (Τροχαλία)",
    "Skull Crushers (Γαλλικές)",
    "Close Grip Bench Press",
    "Overhead Tricep Extension",
    "Dips Τρικεφάλων σε Πάγκο",
    "Cable Bicep Curl"
  ],
  "Κοιλιακοί / Core": [
    "Plank (Σανίδα)",
    "Hanging Leg Raises",
    "Cable Woodchoppers",
    "Ab Wheel Rollout",
    "Crunches (Ροκανίσματα)",
    "Russian Twists",
    "Bicycle Crunches",
    "Decline Sit-ups",
    "Mountain Climbers",
    "Leg Raises στο Πάτωμα"
  ],
  "Cardio": [
    "Διάδρομος (Treadmill)",
    "Στατικό Ποδήλατο",
    "Ελλειπτικό (Elliptical)",
    "Stairmaster (Σκάλες)",
    "Κωπηλατικό (Rowing)",
    "Σχοινάκι (Jump Rope)",
    "Air Bike",
    "Τρέξιμο σε Εξωτερικό Χώρο",
    "HIIT / Sprint Διαλείμματα",
    "Box Jumps"
  ]
};

export default function App() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Ημερομηνία Ημερολογίου (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [category, setCategory] = useState<'resistance' | 'cardio'>('resistance');
  const [exerciseName, setExerciseName] = useState('');
  
  // Επιλογές γρήγορης λίστας ασκήσεων
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');

  // Resistance State
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  // Cardio State
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [incline, setIncline] = useState('');

  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Listener για εγκατάσταση PWA
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
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Απαγόρευση παρατεταμένου κλικ / context menu στο κινητό
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

  // Μετατροπή YYYY-MM-DD σε DD/MM/YYYY (Σωστή τοποθέτηση!)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Αλλαγή ημέρας ( +1 / -1 )
  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Επαναφορά στο σήμερα
  const setToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Φόρτωση ασκήσεων για την ημέρα
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
          exercise_name: exerciseName,
          category: 'resistance',
          weight: Number(weight),
          reps: Number(reps)
        }]);
        if (error) throw error;
      } else {
        if (!duration) return alert('Ο χρόνος (λεπτά) είναι υποχρεωτικός στο cardio!');
        const { error } = await supabase.from('workout_items').insert([{
          workout_id: currentWorkoutId,
          exercise_name: exerciseName,
          category: 'cardio',
          duration_minutes: Number(duration),
          distance_km: distance ? Number(distance) : null,
          incline: incline ? Number(incline) : null
        }]);
        if (error) throw error;
      }

      // Καθαρισμός φορμών
      setExerciseName('');
      setWeight('');
      setReps('');
      setDuration('');
      setDistance('');
      setIncline('');
      setSelectedMuscle('');
      
      fetchWorkouts();
    } catch (err: any) {
      alert('Σφάλμα: ' + err.message);
    }
  };

  // Διαγραφή άσκησης
  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from('workout_items').delete().eq('id', id);
    if (!error) {
      setWorkoutItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto font-sans pb-20">
      
      {/* Κουμπί Εγκατάστασης (αν είναι διαθέσιμο) */}
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

      {/* 1. Date Navigator (Ημερολόγιο) */}
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

      {/* 2. Επιλογή Κατηγορίας: Resistance vs Cardio */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800/80 mb-6">
        <button
          onClick={() => {
            setCategory('resistance');
            setSelectedMuscle('');
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
            setSelectedMuscle('Cardio');
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

      {/* 3. Φόρμα Καταγραφής */}
      <form onSubmit={handleAddItem} className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 space-y-4 mb-6 shadow-sm">
        
        {/* Quick Select Ασκήσεων ανά Μυϊκή Ομάδα */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 space-y-2.5">
          <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Γρηγορη Επιλογη Ασκησης
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Dropdown Μυϊκής Ομάδας */}
            <select
              value={selectedMuscle}
              onChange={(e) => {
                setSelectedMuscle(e.target.value);
                setExerciseName('');
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Μυϊκή Ομάδα...</option>
              {Object.keys(EXERCISE_DATABASE)
                .filter((muscle) => category === 'cardio' ? muscle === 'Cardio' : muscle !== 'Cardio')
                .map((muscle) => (
                  <option key={muscle} value={muscle}>{muscle}</option>
                ))}
            </select>

            {/* Dropdown των 10 Ασκήσεων */}
            <select
              disabled={!selectedMuscle}
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="">Διάλεξε άσκηση...</option>
              {selectedMuscle && EXERCISE_DATABASE[selectedMuscle]?.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Όνομα Άσκησης (αν θες δικό σου) */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Όνομα Άσκησης</label>
          <input
            type="text"
            placeholder={category === 'resistance' ? "π.χ. Bench Press" : "π.χ. Διάδρομος"}
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors"
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
          <Plus className="w-4 h-4" /> Προσθήκη στην Ημέρα
        </button>
      </form>

      {/* 4. Λίστα Καταγεγραμμένων Ασκήσεων της Ημέρας */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
          Ασκησεις Ημερας
        </h3>
        
        {loading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Φόρτωση...</div>
        ) : workoutItems.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800/80 rounded-2xl">
            <p className="text-sm text-slate-500">Καμία καταγεγραμμένη άσκηση για αυτή τη μέρα.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {workoutItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl flex justify-between items-center group shadow-sm"
              >
                <div>
                  <h4 className="font-semibold text-sm text-white">{item.exercise_name}</h4>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                    item.category === 'resistance' 
                      ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50' 
                      : 'bg-rose-950/60 text-rose-400 border border-rose-900/50'
                  }`}>
                    {item.category === 'resistance' ? 'Βάρη' : 'Cardio'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {item.category === 'resistance' ? (
                      <span className="font-bold text-sm text-indigo-400">
                        {item.weight} kg × {item.reps}
                      </span>
                    ) : (
                      <span className="font-bold text-sm text-rose-400">
                        {item.duration_minutes} min {item.distance_km ? `| ${item.distance_km} km` : ''} {item.incline ? `| ${item.incline}%` : ''}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-slate-600 hover:text-rose-500 p-1 rounded-lg transition-colors"
                    title="Διαγραφή"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}