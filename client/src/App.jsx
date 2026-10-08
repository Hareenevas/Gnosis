import { useEffect, useState } from 'react';
import { api } from './api';
import { closeSocket } from './socket';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import MaterialHub from './MaterialHub.jsx';
import Social from './Social.jsx';
import Analytics from './Analytics.jsx';

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [tab, setTab] = useState('library'); // library | social | analytics
  const [materialId, setMaterialId] = useState(null);
  const [me, setMe] = useState(null);

  const refreshMe = () => api.me().then(setMe).catch(() => {});
  useEffect(() => { if (user) refreshMe(); }, [user, tab, materialId]);
  useEffect(() => {
    const onProfileRefresh = () => refreshMe();
    window.addEventListener('gnosis:profile:refresh', onProfileRefresh);
    return () => window.removeEventListener('gnosis:profile:refresh', onProfileRefresh);
  }, []);

  const logout = () => { closeSocket(); localStorage.clear(); setUser(null); setMe(null); setTab('library'); setMaterialId(null); };
  if (!user) return <Login onAuth={setUser} />;

  const isTeacher = user.role === 'instructor' || user.role === 'admin';
  const nav = (t) => () => { setTab(t); setMaterialId(null); };
  const tabBtn = (t, label) => (
    <button onClick={nav(t)} className={`px-3 py-1 rounded-lg text-sm ${tab === t && !materialId ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <button className="text-xl font-bold text-indigo-600" onClick={nav('library')}>Gnosis</button>
          {tabBtn('library', 'Library')}
          {tabBtn('social', 'Social')}
          {isTeacher && tabBtn('analytics', 'Analytics')}
        </div>
        <div className="flex items-center gap-4 text-sm">
          {me && <span className="text-indigo-700 font-medium">Lv {me.level} · {me.xp} XP · 🔥 {me.streak}</span>}
          <span>{user.name}</span>
          <button onClick={logout} className="text-gray-500 hover:text-red-600">Logout</button>
        </div>
      </header>
      <main className="p-6">
        {materialId ? <MaterialHub id={materialId} user={user} onBack={() => setMaterialId(null)} />
          : tab === 'social' ? <Social />
          : tab === 'analytics' && isTeacher ? <Analytics />
          : <Dashboard me={me} onOpen={setMaterialId} />}
      </main>
    </div>
  );
}
