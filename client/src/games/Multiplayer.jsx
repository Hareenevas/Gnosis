import { useEffect, useState } from 'react';
import { getSocket } from '../socket';

export default function Multiplayer({ id, user }) {
  const [mode, setMode] = useState('duel');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState(null);
  const [q, setQ] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [picked, setPicked] = useState(null);
  const [over, setOver] = useState(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSocket();
    s.on('room:update', setRoom);
    s.on('question', (d) => { setQ(d); setReveal(null); setPicked(null); });
    s.on('reveal', setReveal);
    s.on('game:over', (d) => { setOver(d); setQ(null); });
    s.on('room:closed', () => { setRoom(null); setError('The host closed the room.'); });
    s.on('connect_error', (e) => setError('Connection problem: ' + e.message));
    return () => { s.emit('room:leave'); ['room:update', 'question', 'reveal', 'game:over', 'room:closed', 'connect_error'].forEach(ev => s.off(ev)); };
  }, []);

  useEffect(() => {
    if (!q || reveal) return;
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((q.deadline - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, [q, reveal]);

  const call = (ev, data) => {
    setError('');
    getSocket().emit(ev, data, (r) => r?.error && setError(r.error));
  };
  const pick = (i) => { if (picked !== null || reveal) return; setPicked(i); getSocket().emit('answer', { choice: i }); };

  if (over) {
    const names = Object.fromEntries(over.players.map(p => [p.id, p.name]));
    return (
      <div className="bg-white p-6 rounded-xl shadow text-center space-y-2">
        <div className="text-3xl">{over.mode === 'coop' ? '🤝' : '🏁'}</div>
        {over.mode === 'coop'
          ? <p className="font-semibold">Team score: {over.teamScore}</p>
          : <p className="font-semibold">{over.winnerId ? `${names[over.winnerId]} wins!` : "It's a tie!"}</p>}
        {over.players.map(p => <p key={p.id} className="text-sm">{p.name}: {over.mode === 'coop' ? '' : p.score + ' pts · '}+{over.xp[p.id]} XP</p>)}
      </div>
    );
  }

  if (!room) return (
    <div className="grid md:grid-cols-2 gap-4">
      {error && <p className="md:col-span-2 text-red-600">{error}</p>}
      <div className="bg-white p-4 rounded-xl shadow space-y-3">
        <h2 className="font-semibold">Host a game with these notes</h2>
        <select className="border rounded-lg px-3 py-2 w-full" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="duel">1v1 Duel (2 players, individual scores)</option>
          <option value="coop">Co-op (up to 4, shared team score)</option>
        </select>
        <button onClick={() => call('room:create', { materialId: id, mode })} className="w-full py-2 rounded-lg bg-indigo-600 text-white">Create room</button>
      </div>
      <div className="bg-white p-4 rounded-xl shadow space-y-3">
        <h2 className="font-semibold">Join a friend</h2>
        <input className="border rounded-lg px-3 py-2 w-full uppercase" placeholder="Room code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button onClick={() => call('room:join', { code })} className="w-full py-2 rounded-lg border">Join room</button>
      </div>
    </div>
  );

  const isHost = room.host === user.id;
  const scoreboard = (
    <div className="flex flex-wrap gap-3 text-sm">
      {room.players.map(p => (
        <span key={p.id} className="px-3 py-1 rounded-full bg-indigo-50">
          {p.name}{p.id === user.id ? ' (you)' : ''}{room.mode === 'duel' ? ` · ${p.score}` : ''}
        </span>
      ))}
      {room.mode === 'coop' && <span className="px-3 py-1 rounded-full bg-amber-100">Team {room.teamScore}</span>}
    </div>
  );

  if (room.state === 'lobby') return (
    <div className="bg-white p-6 rounded-xl shadow text-center space-y-3">
      <div className="text-sm text-gray-500">{room.mode === 'duel' ? '1v1 Duel' : 'Co-op'} lobby. Share this code:</div>
      <div className="text-4xl font-mono tracking-widest">{room.code}</div>
      <div className="flex justify-center">{scoreboard}</div>
      {error && <p className="text-red-600">{error}</p>}
      {isHost
        ? <button onClick={() => call('room:start')} className="px-5 py-2 rounded-lg bg-indigo-600 text-white">Start game</button>
        : <p className="text-gray-500">Waiting for the host to start…</p>}
    </div>
  );

  if (!q) return <p>Get ready…</p>;
  const mine = reveal?.results.find(r => r.id === user.id);
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {scoreboard}
      <div className="flex justify-between text-sm text-gray-500">
        <span>Question {q.index + 1} / {q.total} · {q.topic}</span>
        {!reveal && <span className={left <= 5 ? 'text-red-600 font-bold' : ''}>⏱ {left}s</span>}
      </div>
      <h2 className="text-lg font-semibold">{q.text}</h2>
      <div className="space-y-2">
        {q.options.map((o, i) => {
          let st = 'border bg-white hover:bg-gray-50';
          if (reveal) st = i === reveal.correctIndex ? 'border-green-600 bg-green-50' : i === picked ? 'border-red-600 bg-red-50' : 'border bg-white';
          else if (picked === i) st = 'border-indigo-600 bg-indigo-50';
          return <button key={i} disabled={picked !== null || !!reveal} onClick={() => pick(i)} className={`w-full text-left p-3 rounded-lg ${st}`}>{o}</button>;
        })}
      </div>
      {picked !== null && !reveal && <p className="text-sm text-gray-500">Answer locked. Waiting for the others…</p>}
      {reveal && (
        <div className="p-3 rounded-lg bg-blue-50 text-sm space-y-1">
          <p>{mine?.correct ? `Correct! +${mine.gained}` : 'Not this time.'} {reveal.explanation}</p>
        </div>
      )}
    </div>
  );
}
