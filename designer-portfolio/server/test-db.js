import { initDB, run, get, all, closeDB, getType } from './db.js';

async function testDB() {
  try {
    console.log('Initializing database...');
    await initDB();

    console.log('Database type:', getType());

    console.log('Testing health check...');
    console.log('getType() result:', getType());

    console.log('Closing database...');
    await closeDB();

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testDB();