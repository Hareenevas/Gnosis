import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export default function QuizPage({ materialId }) {
  const [q, setQ] = useState(null);
  const [result, setResult] = useState(null);
  const [tree, setTree] = useState([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const startedAt = useRef(Date.now());

  const load = async () => {
    try {
      setResult(null);
      const next = await api.nextQuestion(materialId);
      if (next.done) return setDone(true);
      setQ(next);
      startedAt.current = Date.now();
      setTree(await api.skillTree(materialId));
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [materialId]);

  const choose = async (i) => {
    if (result) return;
    const r = await api.answer({ questionId: q.id, selectedIndex: i, timeMs: Date.now() - startedAt.current });
    setResult({ ...r, picked: i });
    setTree(await api.skillTree(materialId));
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (done) return <p>You've answered every question. Re-generate the quiz for more.</p>;
  if (!q) return <p>Loading…</p>;

  const colour = { locked: 'bg-gray-300', weak: 'bg-red-400', learning: 'bg-yellow-400', mastered: 'bg-green-500' };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {tree.map(n => (
          <span key={n.topic} className={`px-3 py-1 rounded-full text-sm text-white ${colour[n.status]}`}>
            {n.topic} · {Math.round(n.mastery * 100)}%
          </span>
        ))}
      </div>

      <div className="text-sm text-gray-500">{q.topic} · difficulty {q.difficulty}/3</div>
      <h2 className="text-xl font-semibold">{q.text}</h2>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let style = 'border hover:bg-gray-50';
          if (result) {
            if (i === result.correctIndex) style = 'border-green-600 bg-green-50';
            else if (i === result.picked) style = 'border-red-600 bg-red-50';
          }
          return (
            <button key={i} onClick={() => choose(i)} disabled={!!result}
              className={`w-full text-left p-3 rounded-lg ${style}`}>{opt}</button>
          );
        })}
      </div>

      {result && (
        <div className="p-3 rounded-lg bg-blue-50">
          <p className="font-medium">{result.correct ? 'Correct!' : 'Not quite.'} {result.explanation}</p>
          <p className="text-sm mt-1">XP: {result.xp} · Streak: {result.streak} day(s)</p>
          <button onClick={load} className="mt-3 px-4 py-2 rounded bg-blue-600 text-white">Next question</button>
        </div>
      )}
    </div>
  );
}
