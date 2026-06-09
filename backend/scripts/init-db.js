const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function init() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(config);

  const schema = fs.readFileSync(
    path.join(__dirname, '..', 'db', 'schema.sql'),
    'utf8'
  );
  const seed = fs.readFileSync(
    path.join(__dirname, '..', 'db', 'seed.sql'),
    'utf8'
  );

  console.log('Creating schema...');
  await conn.query(schema);

  console.log('Seeding data...');
  await conn.query(seed);

  await conn.end();
  console.log('Database initialized successfully!');
}

init().catch((err) => {
  console.error('Init failed:', err.message);
  process.exit(1);
});
