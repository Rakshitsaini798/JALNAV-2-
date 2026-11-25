// Shows the User table: emails, roles and the bcrypt password hashes stored in the database.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../database');
prisma.user
  .findMany({ select: { id: true, email: true, role: true, village: true, passwordHash: true }, orderBy: { id: 'asc' } })
  .then((users) => console.table(users))
  .finally(() => prisma.$disconnect());
