import { useEffect, useState } from 'react';
import { api } from '../api';
import TermDash from './TermDash.jsx';
import BossBattle from './BossBattle.jsx';
import StoryQuest from './StoryQuest.jsx';
import VoiceGame from './VoiceGame.jsx';
import Multiplayer from './Multiplayer.jsx';

const GAMES = [
  { k: 'termdash', name: 'Term Dash', desc: 'Endless runner. Run through real terms from your notes, jump over imposters.', needs: 'terms' },
  { k: 'boss', name: 'Boss Battle', desc: 'Answer adaptive questions to defeat the boss before it defeats you.', needs: null },
  { k: 'story', name: 'Story Quest', desc: 'An AI-written adventure built from your notes. Questions unlock each chapter.', needs: 'story' },
  { k: 'voice', name: 'Circuit Trace (voice)', desc: 'Say each term aloud to light up the circuit. Pronunciation is scored.', needs: 'terms' },
  { k: 'multi', name: '1v1 Duel / Co-op', desc: 'Live rooms: race a friend, or team up against the clock.', needs: null }
];

export default function Games({ id, user }) {
  const [m, setM] = useState(null);
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.study(id).then(setM).catch(e => setError(e.message)); }, [id]);

  const ready = (needs) => !needs || (needs === 'terms' ? m.terms?.length >= 6 : m.story?.chapters?.length);
  const generate = async (needs) => {
    setBusy(needs); setError('');
    try { setM(await (needs === 'terms' ? api.genTerms(id) : api.genStory(id))); } catch (e) { setError(e.message); }
    setBusy('');
  };

  if (!m) return <p>{error || 'Loading…'}</p>;
  const exit = <button onClick={() => setGame(null)} className="text-sm text-gray-500 mb-3">← All games</button>;

  if (game === 'termdash') return <div>{exit}<TermDash id={id} terms={m.terms} distractors={m.distractors} /></div>;
  if (game === 'boss') return <div>{exit}<BossBattle id={id} /></div>;
  if (game === 'story') return <div>{exit}<StoryQuest id={id} story={m.story} /></div>;
  if (game === 'voice') return <div>{exit}<VoiceGame id={id} terms={m.terms} /></div>;
  if (game === 'multi') return <div>{exit}<Multiplayer id={id} user={user} /></div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {error && <p className="md:col-span-2 text-red-600">{error}</p>}
      {GAMES.map(g => (
        <div key={g.k} className="bg-white p-4 rounded-xl shadow flex flex-col gap-2">
          <div className="font-semibold">{g.name}</div>
          <p className="text-sm text-gray-500 flex-1">{g.desc}</p>
          {ready(g.needs)
            ? <button onClick={() => setGame(g.k)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white">Play</button>
            : <button onClick={() => generate(g.needs)} disabled={!!busy} className="px-3 py-2 rounded-lg border disabled:opacity-50">
                {busy === g.needs ? 'Generating…' : `Generate ${g.needs === 'terms' ? 'terms' : 'story'} to unlock`}
              </button>}
        </div>
      ))}
    </div>
  );
}
