import { initDatabase, dbAll } from '../database/db.js';

async function checkBlocks() {
  await initDatabase();
  const rows = await dbAll('SELECT * FROM blocks');
  console.log('Blocks count in DB:', rows.length);
  console.log('Sample blocks:', JSON.stringify(rows.slice(0, 5), null, 2));
}

checkBlocks();
