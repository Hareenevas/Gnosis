# Gnosis: AI Adaptive Learning Platform

Upload notes -> AI builds quizzes, flashcards, summaries, mind maps, a story quest and a term list ->
adaptive practice updates a skill tree -> games, friends, squads, live duels, instructor analytics.

## Run it
Prereqs: Node 18+, MongoDB (local or Atlas), an Anthropic API key.

    cd server
    cp .env.example .env     # set MONGO_URI, JWT_SECRET, ANTHROPIC_API_KEY
    npm install && npm run dev        # API + sockets on :5000

    cd client
    cp .env.example .env
    npm install && npm run dev        # app on http://localhost:5173

Try it: register -> upload a PDF -> open it -> Practice / Study / Tutor / Skill tree / Games.
To see instructor analytics, register a second account with the "Instructor" role.
To test duels, open a second browser profile, register another student and join the room code.

## Modules -> where they live
| Module | Server | Client |
|---|---|---|
| Auth (Student/Instructor/Admin, JWT) | routes/auth.js, middleware/auth.js | Login.jsx |
| Content upload + topics | routes/materials.js | Dashboard.jsx |
| AI content (summary, flashcards, mind map) | routes/study.js, services/llm.js | Study.jsx |
| Adaptive assessment | routes/quiz.js, services/adaptive.js | QuizPage.jsx |
| Skill tree | routes/skilltree.js | SkillTree.jsx |
| AI tutor chatbot (RAG-lite) | routes/chat.js | Chat.jsx |
| Gamification (XP, streak, badges) | services/badges.js, routes/games.js | header + Dashboard |
| Friends, squads, compare, leaderboard | routes/social.js | Social.jsx |
| Term Dash / Boss Battle / Story Quest | routes/games.js | games/*.jsx |
| Voice circuit game | (client-side speech) | games/VoiceGame.jsx |
| 1v1 Duel + Co-op (Socket.io) | services/rooms.js | games/Multiplayer.jsx |
| Instructor analytics | routes/analytics.js | Analytics.jsx |

## Deploy
Client: Vercel/Netlify (set VITE_API_URL and VITE_SOCKET_URL). Server: Render/Railway (set the .env vars,
CLIENT_ORIGIN = your client URL). Database: MongoDB Atlas.

## Known limits (good "future work" slides)
- Voice scoring uses the browser Web Speech API + string similarity. Azure Pronunciation Assessment is not wired in.
- Multiplayer rooms live in server memory: one server instance only (use Redis adapter to scale).
- Add rate limiting on the AI endpoints before a public launch.
- Instructor analytics covers all students on the platform (no class/enrolment model yet).
