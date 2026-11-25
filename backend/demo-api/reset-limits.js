// Clears the rate-limit counters so a demo can start fresh. Local use only.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../database');
prisma.farmerRateLimit
  .deleteMany()
  .then((r) => console.log(`Rate limits reset (${r.count} counters cleared).`))
  .finally(() => prisma.$disconnect());
