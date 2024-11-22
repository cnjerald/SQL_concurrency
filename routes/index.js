const express = require('express');
const router = express.Router();
const { node1Pool, node2Pool, node3Pool } = require('../sql_conn.js');
const mysql = require('mysql2');

router.get('/', (req, res) => {
    res.render('main', {
        title: 'Test',
        layout: 'index',
    });
});

router.post('/ajax_read', async (req, res) => {
    const appID = req.body.appID;
    const delay = req.body.delay || 0;

    console.log(`Received appID: ${appID}`);
    console.log(`Delay: ${delay}ms`);

    try {
        // Query all nodes concurrently
        const result = await Promise.race([
            queryNode(node1Pool, appID, delay, 'Node1'),
            queryNode(node2Pool, appID, delay, 'Node2'),
            queryNode(node3Pool, appID, delay, 'Node3'),
        ]);

        if (result === -1) {
            return res.status(404).send('AppID not found on any node.');
        }

        res.json(result);
    } catch (error) {
        console.error('All nodes failed:', error);
        res.status(500).send('All nodes are down, please try again later.');
    }
});

function queryNode(pool, appID, delay, nodeName) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error(`${nodeName} is unavailable.`);
                return reject(`${nodeName} is unavailable.`);
            }

            console.log(`Attempting query on ${nodeName}`);
            connection.beginTransaction((err) => {
                if (err) {
                    console.error(`Failed to start transaction on ${nodeName}`);
                    connection.release();
                    return reject(`Unable to start transaction on ${nodeName}`);
                }

                // Perform the query with a delay
                setTimeout(() => {
                    connection.query('SELECT * FROM steam_games WHERE AppID = ?', [appID], (err, results) => {
                        if (err) {
                            console.error(`Query error on ${nodeName}:`, err);
                            return connection.rollback(() => {
                                connection.release();
                                reject(`Query error on ${nodeName}`);
                            });
                        }

                        connection.commit((err) => {
                            if (err) {
                                console.error(`Transaction commit failed on ${nodeName}:`, err);
                                return connection.rollback(() => {
                                    connection.release();
                                    reject(`Transaction commit failed on ${nodeName}`);
                                });
                            }

                            connection.release();
                            if (results.length === 0) {
                                console.log(`AppID not found on ${nodeName}`);
                                resolve(-1); // Indicate AppID not found
                            } else {
                                console.log(`AppID found on ${nodeName}`);
                                resolve(results); // Return the results
                            }
                        });
                    });
                }, delay);
            });
        });
    });
}

module.exports = router;
