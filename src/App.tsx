import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ChevronLeft, ChevronRight, Dumbbell, Flame, Plus, Trash2, Calendar } from 'lucide-react';

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

export default function App() {
  // 1. Ημερομηνία Ημερολογίου (YYYY-MM-DD)
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

  // Φόρτωση ασκήσεων για την επιλεγμένη ημέρα
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
      // 1. Έλεγχος αν υπάρχει workout για τη μέρα, αλλιώς δημιουργία
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

      // 2. Εισαγωγή της άσκησης
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

      // Καθαρισμός πεδίων
      setExerciseName('');
      setWeight('');
      setReps('');
      setDuration('');
      setDistance('');
      setIncline('');
      
      // Ανανέωση λίστας
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
      
      {/* Τίτλος */}
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
          <span className="font-bold text-base text-indigo-400">{selectedDate}</span>
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
          onClick={() => setCategory('resistance')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            category === 'resistance' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Dumbbell className="w-4 h-4" /> Βάρη
        </button>
        <button
          onClick={() => setCategory('cardio')}
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