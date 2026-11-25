const { PrismaClient } = require('@prisma/client');

// One PrismaClient for the whole app. It keeps a connection pool that every request shares.
// Set PRISMA_LOG_QUERIES=true to print every SQL query Prisma runs.
const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error']
});

module.exports = prisma;
