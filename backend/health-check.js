// Simple health check script for the backend
try {
  // Check if we can connect to the database
  const { Client } = require('pg');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5433/cost_of_carry_db'
  });
  
  client.connect()
    .then(() => {
      console.log('Health check: Database connection OK');
      client.end();
      process.exit(0);
    })
    .catch(err => {
      console.error('Health check: Database connection FAILED', err.message);
      process.exit(1);
    });
} catch (err) {
  console.error('Health check: FAILED', err.message);
  process.exit(1);
}