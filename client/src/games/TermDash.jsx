import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const W = 720, H = 300, GROUND = 240, PX = 80, PW = 28, PH = 40;

export default function TermDash({ id, terms, distractors }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('ready'); // ready | play | over
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (phase !== 'play') return;
    const ctx = canvasRef.current.getContext('2d');
    const bad = (distractors?.length ? distractors : ['Foobar', 'Quantum Hash', 'Blorp Tree', 'Zeta Cache']);
    const s = { y: 0, vy: 0, items: [], speed: 5, t: 0, spawn: 200, score: 0, lives: 3, collected: [], missed: [] };
    let raf;

    const jump = () => { if (s.y === 0) s.vy = 15; };
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', onKey);
    const canvas = canvasRef.current;
    canvas.addEventListener('pointerdown', jump);

    const spawn = () => {
      const good = Math.random() < 0.55;
      const t = good ? terms[Math.floor(Math.random() * terms.length)] : null;
      const raw = good ? t.term : bad[Math.floor(Math.random() * bad.length)];
      const label = raw.length > 16 ? raw.slice(0, 15) + '…' : raw; // keep obstacles jumpable
      ctx.font = '14px monospace';
      s.items.push({ x: W, w: ctx.measureText(label).width + 20, label, good, topic: t?.topic, done: false });
    };

    const end = async () => {
      cancelAnimationFrame(raf);
      const score = Math.min(300, s.score);
      setSummary({ score, collected: s.collected.length, missed: s.missed.length });
      setPhase('over');
      api.gameResult({ materialId: id, game: 'termdash', score,
        correctTopics: s.collected, wrongTopics: s.missed }).catch(() => {});
    };

    const loop = () => {
      s.t++; s.speed = 5 + Math.min(4, s.t / 1800);
      s.vy -= 0.6; s.y = Math.max(0, s.y + s.vy); if (s.y === 0 && s.vy < 0) s.vy = 0;
      s.spawn -= s.speed; if (s.spawn <= 0) { spawn(); s.spawn = 300 + Math.random() * 160; }

      const pTop = GROUND - PH - s.y;
      for (const it of s.items) {
        it.x -= s.speed;
        if (it.done) continue;
        const overlap = it.x < PX + PW && it.x + it.w > PX;
        const onGround = pTop + PH > GROUND - 36 + 4; // body overlaps the item's height
        if (overlap && onGround) {
          it.done = true; it.hit = true;
          if (it.good) { s.score += 10; s.collected.push(it.topic); } else { s.lives--; }
        } else if (it.x + it.w < PX) {
          it.done = true;
          if (it.good) s.missed.push(it.topic); else s.score += 5;
        }
      }
      s.items = s.items.filter(it => it.x + it.w > -10);
      if (s.lives <= 0) return end();

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
      ctx.fillStyle = '#4f46e5'; ctx.fillRect(PX, pTop, PW, PH);
      ctx.fillStyle = '#fff'; ctx.fillRect(PX + 17, pTop + 8, 6, 6);
      for (const it of s.items) {
        ctx.fillStyle = it.done && it.hit ? '#cbd5e1' : '#334155';
        ctx.fillRect(it.x, GROUND - 36, it.w, 36);
        ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.fillText(it.label, it.x + 10, GROUND - 13);
      }
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 16px monospace';
      ctx.fillText(`Score ${s.score}`, 16, 28);
      ctx.fillText('♥'.repeat(s.lives), W - 70, 28);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); canvas.removeEventListener('pointerdown', jump); };
  }, [phase]);

  return (
    <div className="space-y-3">
      <div className="bg-white p-3 rounded-xl shadow text-sm">
        <b>How to play:</b> terms that are in <i>your notes</i> are good: run straight through them to collect them.
        Imposter terms are obstacles: jump over them (Space / ↑ / tap). Don't jump good terms, or you'll miss them.
        Three hits and the run ends. Speed increases over time.
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-xl border bg-white" />
      {phase !== 'play' && (
        <div className="text-center space-y-2">
          {phase === 'over' && summary && (
            <p>Run over! Score {summary.score} · collected {summary.collected} · missed {summary.missed}. XP added, weak topics updated.</p>
          )}
          <button onClick={() => setPhase('play')} className="px-5 py-2 rounded-lg bg-indigo-600 text-white">
            {phase === 'ready' ? 'Start running' : 'Run again'}
          </button>
        </div>
      )}
    </div>
  );
}
