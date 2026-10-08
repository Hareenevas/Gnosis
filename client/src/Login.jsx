import { useState } from 'react';
import { api } from './api';

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = mode === 'login' ? await api.login(form) : await api.register(form);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onAuth(res.user);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const input = 'w-full border rounded-lg px-3 py-2';
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow space-y-3">
        <h1 className="text-2xl font-bold text-indigo-600 text-center">Gnosis</h1>
        {mode === 'register' && <input className={input} placeholder="Name" value={form.name} onChange={set('name')} required />}
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className={input} type="password" placeholder="Password (6+ chars)" value={form.password} onChange={set('password')} required />
        {mode === 'register' && (
          <select className={input} value={form.role} onChange={set('role')}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
        </button>
        <p className="text-sm text-center text-gray-500">
          {mode === 'login' ? 'New here?' : 'Have an account?'}{' '}
          <button type="button" className="text-indigo-600" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  );
}
