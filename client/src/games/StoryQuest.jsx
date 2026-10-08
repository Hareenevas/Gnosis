import { useState } from 'react';
import { api } from '../api';

export default function StoryQuest({ id, story }) {
  const [ch, setCh] = useState(0);
  const [stage, setStage] = useState('story'); // story | question | feedback | end
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [right, setRight] = useState([]);
  const [wrong, setWrong] = useState([]);

  const chapter = story.chapters[ch];
  const answer = (i) => {
    const ok = i === chapter.question.answerIndex;
    setPicked(i); setStage('feedback');
    if (ok) { setScore(s => s + 30); setRight(r => [...r, chapter.topic]); } else setWrong(w => [...w, chapter.topic]);
  };
  const advance = () => {
    if (ch + 1 >= story.chapters.length) {
      setStage('end');
      api.gameResult({ materialId: id, game: 'story', score: score, correctTopics: right, wrongTopics: wrong }).catch(() => {});
    } else { setCh(ch + 1); setStage('story'); setPicked(null); }
  };

  if (stage === 'end') return (
    <div className="bg-white p-6 rounded-xl shadow text-center space-y-2">
      <div className="text-3xl">🗺️</div>
      <p className="font-semibold">Quest complete! {right.length} / {story.chapters.length} chapters mastered · +{score} XP</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white p-5 rounded-xl shadow space-y-4">
      <div className="text-sm text-gray-500">{story.title} · Chapter {ch + 1} of {story.chapters.length}</div>
      <p className="leading-relaxed italic">{chapter.narrative}</p>
      {stage === 'story' && <button onClick={() => setStage('question')} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Face the challenge</button>}
      {stage !== 'story' && (
        <>
          <h3 className="font-semibold">{chapter.question.text}</h3>
          <div className="space-y-2">
            {chapter.question.options.map((o, i) => {
              let st = 'border hover:bg-gray-50';
              if (stage === 'feedback') st = i === chapter.question.answerIndex ? 'border-green-600 bg-green-50' : i === picked ? 'border-red-600 bg-red-50' : 'border';
              return <button key={i} disabled={stage === 'feedback'} onClick={() => answer(i)} className={`w-full text-left p-3 rounded-lg ${st}`}>{o}</button>;
            })}
          </div>
        </>
      )}
      {stage === 'feedback' && (
        <div className="p-3 rounded-lg bg-blue-50 space-y-2">
          <p>{picked === chapter.question.answerIndex ? 'The path opens!' : 'The way is blocked, but you learn from it.'} {chapter.question.explanation}</p>
          <button onClick={advance} className="px-4 py-2 rounded bg-indigo-600 text-white">{ch + 1 >= story.chapters.length ? 'Finish quest' : 'Next chapter'}</button>
        </div>
      )}
    </div>
  );
}
