const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');

  if (typeof data.xp === 'number' || typeof data.streak === 'number') {
    const current = JSON.parse(localStorage.getItem('user') || 'null');
    if (current) {
      const next = {
        ...current,
        xp: typeof data.xp === 'number' ? data.xp : current.xp,
        streak: typeof data.streak === 'number' ? data.streak : current.streak
      };
      localStorage.setItem('user', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('gnosis:profile:refresh'));
    }
  }

  return data;
}
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) });

export const api = {
  // auth + profile
  register: (b) => post('/auth/register', b),
  login: (b) => post('/auth/login', b),
  me: () => request('/me'),
  // materials
  upload: (file, title) => {
    const fd = new FormData(); fd.append('file', file); if (title) fd.append('title', title);
    return request('/materials', { method: 'POST', body: fd });
  },
  generateQuiz: (id) => post(`/materials/${id}/generate-quiz`),
  materials: () => request('/materials'),
  // study content
  study: (id) => request(`/study/${id}`),
  genContent: (id) => post(`/study/${id}/content`),
  genTerms: (id) => post(`/study/${id}/terms`),
  genStory: (id) => post(`/study/${id}/story`),
  // quiz + skill tree + chat
  nextQuestion: (id) => request(`/quiz/next/${id}`),
  answer: (b) => post('/quiz/answer', b),
  skillTree: (id) => request(`/skilltree/${id}`),
  chat: (id, message, history) => post(`/chat/${id}`, { message, history }),
  // games
  gameResult: (b) => post('/games/result', b),
  // social
  friends: () => request('/social/friends'),
  friendRequest: (email) => post('/social/friends/request', { email }),
  acceptFriend: (id) => post(`/social/friends/${id}/accept`),
  compare: (friendId) => request(`/social/compare/${friendId}`),
  squads: () => request('/social/squads'),
  createSquad: (name) => post('/social/squads', { name }),
  joinSquad: (code) => post('/social/squads/join', { code }),
  leaderboard: () => request('/social/leaderboard'),
  // instructor
  analytics: () => request('/analytics/overview')
};
