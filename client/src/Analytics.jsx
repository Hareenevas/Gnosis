import { useEffect, useState } from 'react';
import { api } from './api';

export default function Analytics() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.analytics().then(setD).catch(e => setError(e.message)); }, []);
  if (error) return <p className="text-red-600">{error}</p>;
  if (!d) return <p>Loading…</p>;
  const stat = (label, value) => (
    <div className="bg-white p-4 rounded-xl shadow text-center">
      <div className="text-2xl font-bold text-indigo-600">{value}</div><div className="text-sm text-gray-500">{label}</div>
    </div>
  );
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat('Students', d.students)}{stat('Answers submitted', d.attempts)}
        {stat('Answers this week', d.weekAttempts)}{stat('Class accuracy', Math.round(d.accuracy * 100) + '%')}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white p-4 rounded-xl shadow space-y-2">
          <h2 className="font-semibold">Weakest topics across the class</h2>
          {d.weakestTopics.map(t => (
            <div key={t.topic}>
              <div className="flex justify-between text-sm"><span>{t.topic}</span><span className="text-gray-400">{t.learners} learner(s)</span></div>
              <div className="h-2 bg-gray-100 rounded"><div className="h-2 rounded bg-red-400" style={{ width: `${Math.round(t.avgMastery * 100)}%` }} /></div>
            </div>
          ))}
          {!d.weakestTopics.length && <p className="text-sm text-gray-400">No attempts yet.</p>}
        </section>
        <section className="bg-white p-4 rounded-xl shadow space-y-2">
          <h2 className="font-semibold">Top students</h2>
          {d.topStudents.map((s, i) => <div key={s._id} className="flex justify-between text-sm"><span>{i + 1}. {s.name}</span><span>{s.xp} XP</span></div>)}
        </section>
      </div>
    </div>
  );
}
