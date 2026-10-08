require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/me', require('./routes/me'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/study', require('./routes/study'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/skilltree', require('./routes/skilltree'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/games', require('./routes/games'));
app.use('/api/social', require('./routes/social'));
app.use('/api/analytics', require('./routes/analytics'));
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Please upload a PDF or text file under 150 MB.' });
  }

  const status = err.status || (err.name === 'CastError' ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Server error' : err.message });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN } });
require('./services/rooms')(io);

connectDB().then(() =>
  server.listen(process.env.PORT || 5000, () => console.log('Gnosis API + sockets running'))
);
