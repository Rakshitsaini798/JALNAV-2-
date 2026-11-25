const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // behind one reverse proxy in production, so req.ip is the real client IP

// 1. Security headers on every response
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'", "'sha256-QiXxzvwrkEh9rnL7zY3x4E2Xj9k7DibOXO4b+EqyjxE='"],
        'img-src': ["'self'", 'data:', 'https://*.tile.openstreetmap.org']
      }
    }
  })
);

// 2. CORS: only our own frontends may call the API from a browser
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin request or a tool like curl.
      callback(null, !origin || config.corsOrigins.includes(origin));
    },
    credentials: true
  })
);

// 3. Parse JSON bodies (max 10 KB) and cookies
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// 4. Frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 5. API routes: /api/v1 is the versioned API; /api stays as an alias so older clients keep working
app.use(['/api/v1', '/api'], apiRoutes);
app.use('/api', notFound);

// 6. Single-page app fallback
app.get('*', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'), (err) => {
    if (err) next();
  });
});

// 7. Central error handler: must be last so it catches errors from everything above
app.use(errorHandler);

module.exports = app;
