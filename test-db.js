// test-db.js
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Database connected successfully!');
    
    const res = await client.query('SELECT NOW(), VERSION()');
    console.log('Current time:', res.rows[0].now);
    console.log('PostgreSQL version:', res.rows[0].version.split(' ')[0]);
    
    await client.end();
    console.log('✅ Connection closed successfully!');
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
  }
}

testConnection();