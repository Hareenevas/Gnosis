import { useEffect, useState } from 'react';
import { api } from './api';

function Compare({ friend }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.compare(friend.id).then(setRows).catch(() => setRows([])); }, [friend.id]);
  if (!rows) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-gray-400">No skill data yet.</p>;
  const bar = (v, c) => <div className="h-2 rounded bg-gray-100"><div className={`h-2 rounded ${c}`} style={{ width: `${Math.round((v || 0) * 100)}%` }} /></div>;
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-500">Indigo = you · Orange = {friend.name}</div>
      {rows.map(r => (
        <div key={r.topic}><div className="text-sm">{r.topic}</div>{bar(r.me, 'bg-indigo-500')}{bar(r.friend, 'bg-orange-400')}</div>
      ))}
    </div>
  );
}

export default function Social() {
  const [fr, setFr] = useState({ friends: [], incoming: [], outgoing: 0 });
  const [squads, setSquads] = useState([]);
  const [board, setBoard] = useState([]);
  const [email, setEmail] = useState('');
  const [squadName, setSquadName] = useState('');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.friends().then(setFr); api.squads().then(setSquads); api.leaderboard().then(setBoard);
  };
  useEffect(() => { load(); }, []);
  const run = (fn, ok) => async (e) => {
    e?.preventDefault(); setMsg('');
    try { await fn(); setMsg(ok); load(); } catch (err) { setMsg(err.message); }
  };
  const card = 'bg-white p-4 rounded-xl shadow space-y-3';
  const input = 'border rounded-lg px-3 py-2 flex-1 min-w-0';

  return (
    <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
      {msg && <p className="md:col-span-3 text-sm text-indigo-700">{msg}</p>}

      <section className={card}>
        <h2 className="font-semibold">Friends</h2>
        <form className="flex gap-2" onSubmit={run(async () => { await api.friendRequest(email); setEmail(''); }, 'Request sent')}>
          <input className={input} type="email" placeholder="Friend's email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="px-3 rounded-lg bg-indigo-600 text-white">Add</button>
        </form>
        {fr.incoming.map(r => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <span>{r.name} wants to connect</span>
            <button onClick={run(() => api.acceptFriend(r.id), 'Friend added')} className="px-2 py-1 rounded bg-green-600 text-white">Accept</button>
          </div>
        ))}
        {fr.outgoing > 0 && <p className="text-xs text-gray-400">{fr.outgoing} request(s) pending</p>}
        {fr.friends.map(f => (
          <div key={f.id} className="text-sm border-t pt-2">
            <div className="flex justify-between">
              <span>{f.name} <span className="text-gray-400">· {f.xp} XP</span></span>
              <button className="text-indigo-600" onClick={() => setOpen(open === f.id ? null : f.id)}>Compare</button>
            </div>
            {open === f.id && <Compare friend={f} />}
          </div>
        ))}
        {!fr.friends.length && <p className="text-sm text-gray-400">No friends yet.</p>}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Study squads</h2>
        <form className="flex gap-2" onSubmit={run(async () => { await api.createSquad(squadName); setSquadName(''); }, 'Squad created')}>
          <input className={input} placeholder="New squad name" value={squadName} onChange={(e) => setSquadName(e.target.value)} required />
          <button className="px-3 rounded-lg bg-indigo-600 text-white">Create</button>
        </form>
        <form className="flex gap-2" onSubmit={run(async () => { await api.joinSquad(code); setCode(''); }, 'Joined squad')}>
          <input className={input} placeholder="Join with code" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button className="px-3 rounded-lg border">Join</button>
        </form>
        {squads.map(s => (
          <div key={s.id} className="border-t pt-2 text-sm">
            <div className="font-medium">{s.name} <span className="text-gray-400">· code {s.code} · {s.totalXp} XP</span></div>
            {s.members.map((m, i) => <div key={m.id} className="flex justify-between"><span>{i + 1}. {m.name}</span><span>{m.xp} XP</span></div>)}
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Leaderboard</h2>
        {board.map((u, i) => (
          <div key={u._id} className="flex justify-between text-sm">
            <span>{i + 1}. {u.name}</span><span>{u.xp} XP · 🔥 {u.streak}</span>
          </div>
        ))}
        {!board.length && <p className="text-sm text-gray-400">No players yet.</p>}
      </section>
    </div>
  );
}
