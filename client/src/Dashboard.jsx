import { useEffect, useState } from 'react';
import { api } from './api';

export default function Dashboard({ me, onOpen }) {
  const [materials, setMaterials] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const refresh = () => api.materials().then(setMaterials).catch(e => setError(e.message));
  useEffect(() => { refresh(); }, []);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const form = e.target;
    setBusy('Analysing your notes…'); setError('');
    try {
      const m = await api.upload(file);
      setBusy('Generating quiz questions…');
      await api.generateQuiz(m.id);
      setFile(null); form.reset();
      await refresh();
    } catch (err) { setError(err.message); }
    setBusy('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {me && me.badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {me.badges.map(b => <span key={b.id} className="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-800">🏅 {b.label}</span>)}
        </div>
      )}
      <form onSubmit={upload} className="bg-white p-4 rounded-xl shadow flex flex-wrap items-center gap-3">
        <input type="file" accept=".pdf,.txt" onChange={(e) => setFile(e.target.files[0])} />
        <button disabled={!file || !!busy} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">Upload notes</button>
      </form>
      {busy && <p className="text-indigo-600">{busy}</p>}
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-3">
        {materials.length === 0 && <p className="text-gray-500">No materials yet. Upload a PDF or text file to begin.</p>}
        {materials.map(m => (
          <button key={m._id} onClick={() => onOpen(m._id)} className="block w-full text-left bg-white p-4 rounded-xl shadow hover:shadow-md">
            <div className="font-semibold">{m.title}</div>
            <div className="text-sm text-gray-500">{m.topics.join(' · ')}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
