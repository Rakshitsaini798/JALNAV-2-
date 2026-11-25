class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const BODY_ERRORS = {
  'entity.parse.failed': 'The request body is not valid JSON.',
  'entity.too.large': 'The request body is too large.'
};

function notFound(req, res, next) {
  next(new HttpError(404, `No endpoint ${req.method} ${req.originalUrl}`));
}

// Every error in the API ends up here, so every error response has the same shape: { "error": "..." }
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = 'Something went wrong. Please try again later.';

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
  } else if (err && err.type && BODY_ERRORS[err.type]) {
    status = err.status || 400;
    message = BODY_ERRORS[err.type];
  } else if (err && err.code === 'P2025') {
    status = 404;
    message = 'The requested record was not found.';
  } else if (err && err.code === 'P2002') {
    status = 409;
    message = 'A record with this value already exists.';
  }

  if (status >= 500) {
    // Full details go to the server log only, never to the client.
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }
  res.status(status).json({ error: message });
}

module.exports = { HttpError, notFound, errorHandler };
