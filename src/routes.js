const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { title: 'LobbyQuest' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
