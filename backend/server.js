require('dotenv').config(); // load .env before anything reads process.env
const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`JalNavigator running on http://localhost:${config.port}`);
});
