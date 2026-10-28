const path = require('node:path');
const express = require('express');
const routes = require('./routes');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(routes);

app.listen(port, () => {
  console.log(`LobbyQuest berjalan di http://localhost:${port}`);
});
