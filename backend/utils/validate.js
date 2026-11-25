const { HttpError } = require('../middleware/errorHandler');

const MAX_INT = 2147483647;
const ASSET_TYPES = ['tank', 'borewell', 'pump', 'pipeline'];
const ASSET_STATUSES = ['Operational', 'Maintenance', 'Inactive'];
const COMPLAINT_STATUSES = ['Pending', 'In Progress', 'Resolved'];
const ALERT_STATUSES = ['Open', 'Resolved'];

const bad = (message) => new HttpError(400, message);

function parseId(value, label = 'id') {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value) || Number(value) > MAX_INT) {
    throw bad(`${label} must be a positive integer`);
  }
  return Number(value);
}

function oneOf(value, allowed, label) {
  if (typeof value !== 'string') throw bad(`${label} must be one of: ${allowed.join(', ')}`);
  const match = allowed.find((option) => option.toLowerCase() === value.trim().toLowerCase());
  if (!match) throw bad(`${label} must be one of: ${allowed.join(', ')}`);
  return match;
}

function text(value, label, { min = 1, max = 120 } = {}) {
  if (typeof value !== 'string') throw bad(`${label} is required`);
  const clean = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (clean.length < min || clean.length > max) throw bad(`${label} must be ${min} to ${max} characters`);
  return clean;
}

function coordinate(value, limit, label) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || Math.abs(number) > limit) {
    throw bad(`${label} must be a number between -${limit} and ${limit}`);
  }
  return number;
}

function pagination(query, { defaultLimit = 20, maxLimit = 500 } = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw bad('page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw bad(`limit must be an integer between 1 and ${maxLimit}`);
  }
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = {
  ASSET_TYPES,
  ASSET_STATUSES,
  COMPLAINT_STATUSES,
  ALERT_STATUSES,
  parseId,
  oneOf,
  text,
  coordinate,
  pagination
};
