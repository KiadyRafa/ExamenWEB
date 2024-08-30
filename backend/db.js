const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'patrimoine_db',
    password: 'Kiady1508',
    port: 5432,
});

module.exports = pool;
