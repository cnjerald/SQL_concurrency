// First, install the MySQL library
// npm install mysql

const mysql = require('mysql2');

// Create a connection
const node1Pool = mysql.createPool({
  host: '10.2.0.222/16',     // Database host
  user: 'root', // Database username
  password: '1234', // Database password
  port: 22222,
  database: 'steam_games',
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0,
  idleTimeout: 1000

});

const node2Pool = mysql.createPool({
  host: '10.2.0.223/16',     // Database host
  user: 'root', // Database username
  password: '1234', // Database password
  port: 22232,
  database: 'steam_games',
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0,
  idleTimeout: 1000
});

const node3Pool = mysql.createPool({
  host: '10.2.0.224/16',     // Database host
  user: 'root', // Database username
  password: '1234', // Database password
  port: 22242,
  database: 'steam_games',
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0,
  idleTimeout: 1000
});


// Export the connection and disconnection functions
module.exports = {
  node1Pool,
  node2Pool,
  node3Pool
};
