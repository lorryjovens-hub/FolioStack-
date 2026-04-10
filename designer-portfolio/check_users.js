import { initDB, all } from './server/db.js';

await initDB();

try {
  const users = await all('SELECT id, username, email, password_hash FROM users LIMIT 5');
  console.log('Users in database:');
  users.forEach(u => console.log(`  - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}`));
} catch (e) {
  console.log('Error:', e.message);
}

process.exit(0);