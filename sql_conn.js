// First, install the MySQL library
// npm install mysql

const mysql = require('mysql2');

// Create a connection
const node1 = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',     // Database host
  user: 'root', // Database username
  password: '1234', // Database password
  port: 22222,
});

const node2 = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',     // Database host
  user: 'root', // Database username
  password: '1234', // Database password
  port: 22232,
});

const node3 = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',     // Database host
  user: 'root', // Database username
  password: '1234', // Database password
  port: 22242,
});

// Connect to MySQL
function connectNode1() {
  return new Promise((resolve, reject) => {
    node1.connect((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Connected to MySQL Node1!');
        resolve();
      }
    });
  });
}

function connectNode2() {
  return new Promise((resolve, reject) => {
    node2.connect((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Connected to MySQL Node2!');
        resolve();
      }
    });
  });
}

function connectNode3() {
  return new Promise((resolve, reject) => {
    node3.connect((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Connected to MySQL Node3!');
        resolve();
      }
    });
  });
}

// Disconnect from MySQL
function disconnectNode1() {
  return new Promise((resolve, reject) => {
    node1.end((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Disconnected from MySQL Node1!');
        resolve();
      }
    });
  });
}

function disconnectNode2() {
  return new Promise((resolve, reject) => {
    node2.end((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Disconnected from MySQL Node2!');
        resolve();
      }
    });
  });
}

function disconnectNode3() {
  return new Promise((resolve, reject) => {
    node3.end((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Disconnected from MySQL Node3!');
        resolve();
      }
    });
  });
}

// Export the connection and disconnection functions
module.exports = {
  connectNode1,
  connectNode2,
  connectNode3,
  disconnectNode1,
  disconnectNode2,
  disconnectNode3
};
