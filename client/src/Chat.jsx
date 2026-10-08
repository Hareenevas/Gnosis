import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export default function Chat({ id }) {
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: 'Hi! Ask me anything about your uploaded notes.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history = msgs.slice(1);
    setMsgs([...msgs, { role: 'user', content: text }]); setInput(''); setBusy(true);
    try {
      const { reply } = await api.chat(id, text, history);
      setMsgs(m => [...m, { role: 'assistant', content: reply }]);
    } catch (err) { setMsgs(m => [...m, { role: 'assistant', content: 'Error: ' + err.message }]); }
    setBusy(false);
  };

  return (
    <div className="bg-white rounded-xl shadow flex flex-col h-[28rem]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl whitespace-pre-line ${m.role === 'user' ? 'ml-auto bg-indigo-600 text-white' : 'bg-gray-100'}`}>{m.content}</div>
        ))}
        {busy && <div className="text-sm text-gray-400">Thinking…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-3 border-t">
        <input className="flex-1 border rounded-lg px-3 py-2" placeholder="Ask about your notes…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button disabled={busy} className="px-4 rounded-lg bg-indigo-600 text-white disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
