import { initDB, all } from './server/db.js';

await initDB();

// Check works table schema using PostgreSQL system catalog
try {
  const worksSchema = await all(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'works'
    ORDER BY ordinal_position
  `);
  console.log('Works table schema:');
  worksSchema.forEach(col => console.log('  -', col.column_name, col.data_type, col.is_nullable));
} catch (e) {
  console.log('Error getting works schema:', e.message);
}

// Check users table
try {
  const usersSchema = await all(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);
  console.log('\nUsers table schema:');
  usersSchema.forEach(col => console.log('  -', col.column_name, col.data_type, col.is_nullable));
} catch (e) {
  console.log('Error getting users schema:', e.message);
}

// Check if we can query works
try {
  const works = await all('SELECT COUNT(*) as count FROM works');
  console.log('\nWorks count:', works[0].count);
} catch (e) {
  console.log('Error querying works:', e.message);
}

process.exit(0);