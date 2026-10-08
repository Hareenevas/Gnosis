import { useState } from 'react';
import QuizPage from './QuizPage.jsx';
import Study from './Study.jsx';
import Chat from './Chat.jsx';
import SkillTree from './SkillTree.jsx';
import Games from './games/Games.jsx';

const TABS = [['practice', 'Practice'], ['study', 'Study'], ['chat', 'Tutor'], ['tree', 'Skill tree'], ['games', 'Games']];

export default function MaterialHub({ id, user, onBack }) {
  const [tab, setTab] = useState('practice');
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="text-sm text-gray-500 mr-2">← Library</button>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg text-sm ${tab === k ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{label}</button>
        ))}
      </div>
      {tab === 'practice' && <QuizPage materialId={id} />}
      {tab === 'study' && <Study id={id} />}
      {tab === 'chat' && <Chat id={id} />}
      {tab === 'tree' && <SkillTree materialId={id} />}
      {tab === 'games' && <Games id={id} user={user} />}
    </div>
  );
}
