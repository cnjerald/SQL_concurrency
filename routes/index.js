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
    const appID = req.body.appID || 0;
    const delay = req.body.delay || 0;

    console.log(`Received appID: ${appID}`);
    console.log(`Delay: ${delay}ms`);

    // Helper function to create a race that ignores invalid results
    async function customRace(promises) {
        const wrappedPromises = promises.map(promise =>
            promise.catch(err => {
                console.error("Promise rejected:", err);
                return -1; // Return -1 for rejected promises
            })
        );

        for (const wrappedPromise of wrappedPromises) {
            const result = await wrappedPromise;
            if (result !== -1) {
                return result; // Return the first valid result
            }
        }
        return -1; // Return -1 if all promises are invalid
    }

    try {
        // Create a custom race with queryNode promises
        const result = await customRace([
            queryNode(node1Pool, appID, delay, 'Node1'),
            queryNode(node2Pool, appID, delay, 'Node2'),
            queryNode(node3Pool, appID, delay, 'Node3'),
        ]);

        console.log('Race result:', result);

        if (result === -1) {
            return res.status(404).send('AppID not found on any node.');
        }

        // Send the successful result wrapped in an array
        res.send({ data: result });
    } catch (error) {
        console.error('Custom race failed:', error);
        res.status(500).send('All nodes are down, please try again later.');
    }
});


router.post('/ajax_write_CCU', async (req, res) => {
    const appID = req.body.appID || 0;
    const delay = req.body.delay || 0;
    const newVal = req.body.newVal || 0;

    // Check the date of this appID from all nodes through a race.
    // Determine which nodes are active 
    let date = new Date();

    async function customRace(promises) {
        const wrappedPromises = promises.map(promise =>
            promise.catch(err => {
                console.error("Promise rejected:", err);
                return -1; // Return -1 for rejected promises
            })
        );

        for (const wrappedPromise of wrappedPromises) {
            const result = await wrappedPromise;
            if (result !== -1) {
                return result; // Return the first valid result
            }
        }
        return -1; // Return -1 if all promises are invalid
    }

    try {
        // Create a custom race with queryNode promises
        const getDate = await customRace([
            queryNode(node1Pool, appID, delay, 'Node1'),
            queryNode(node2Pool, appID, delay, 'Node2'),
            queryNode(node3Pool, appID, delay, 'Node3'),
        ]);

        console.log('Date Race result:', getDate);

        if (getDate === -1) {
            date = null;
        }

        // Send the successful result wrapped in an array
        date = getDate[0]['Release date'];
    } catch (error) {
        console.error('Custom race failed:', error);
        res.status(500).send('All nodes are down, please try again later.');
    }

    console.log("Date debug: " + date);

    if (date && date.getFullYear() < 2020) {
        // Node 1 node 2

        try {
            const result = await Promise.all([
                addCCU(node1Pool,appID, delay, newVal, 'Node1'),
                addCCU(node2Pool,appID, delay, newVal, 'Node2'),
            ])
            if(result === -1){
                return res.status(404).send('DEBUG: Both nodes are closed scenario.');
            }

            result.forEach(node => {
                const nodeName = Object.keys(node)[0]; // Get the node name (e.g., Node1, Node2)
                const nodeResult = node[nodeName]; // Get the corresponding value
            
                if (nodeResult === -1) {
                    console.log(`${nodeName} inactive, need to create logs.`);
                    // Additional code for logging or other actions
                } else {
                    console.log(`${nodeName} active. Result:`, nodeResult);
                    // Process the active node's result if needed
                }
            });
        } catch(error){
            console.log("Race failed: ", error);
            res.status(500).send('All nodes are down, please try again later.');
        }
        
    } else if ( date && date.getFullYear() >= 2020){

        try {
            const result = await Promise.all([
                addCCU(node1Pool,appID, delay, newVal, 'Node1'),
                addCCU(node3Pool,appID, delay, newVal, 'Node3'),
            ])
            if(result === -1){
                return res.status(404).send('DEBUG: Both nodes are closed scenario.');
            }

            result.forEach(node => {
                const nodeName = Object.keys(node)[0]; // Get the node name (e.g., Node1, Node2)
                const nodeResult = node[nodeName]; // Get the corresponding value
            
                if (nodeResult === -1) {
                    console.log(`${nodeName} inactive, need to create logs.`);
                    // Additional code for logging or other actions
                } else {
                    console.log(`${nodeName} active. Result:`, nodeResult);
                    // Process the active node's result if needed
                }
            });
        } catch(error){
            console.log("Race failed: ", error);
            res.status(500).send('All nodes are down, please try again later.');
        }

    } else{
        // Date not found
        // Case3 make log since data can be on node1 and 2, but node1 and 2 are unavailable. so the query is stored in node3.
        // Also handle situations if node1 and 3 are unavaiable.
        console.log('not found.')
    }
    // This is to prevent 
    res.send({data : 400}); 
    
    // If year(Release Date) < 2020
    // Check if node1 is up set to isUp1
    // Check if node2 is up set to isUp2
    // Edit node1, and node2 only
    // Else
    // Edit node1 and node3 only 
});

function addCCU(pool,appID, delay, newVal, nodeName) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error(`${nodeName} is unavailable.`);
                return resolve({ [nodeName]: -1 });
            }

            
                connection.beginTransaction((transactionErr) => {

                    if (transactionErr) {
                        console.error(`Failed to start transaction on ${nodeName}`);
                        connection.release();
                        return reject(`Unable to start transaction on ${nodeName}`);
                    }

                    connection.query(
                        // Uncomment this to set.
                        //'UPDATE steam_games SET `Peak CCU` = ? WHERE AppID = ?',
                        //[newVal, appID],
                        // Current is add. Ill make a separate func soon.
                        'UPDATE steam_games SET `Peak CCU` = `Peak CCU` + ? WHERE AppID = ?'
                        ,[newVal, appID],


                        (queryErr, results) => {
                            if (queryErr) {
                                console.error(`Query error on ${nodeName}:`, queryErr);
                                return connection.rollback(() => {
                                    connection.release();
                                    reject(`Query error on ${nodeName}`);
                                });
                            }

                            setTimeout(() => {
                                connection.commit((commitErr) => {
                                    if (commitErr) {
                                        console.error(`Transaction commit failed on ${nodeName}:`, commitErr);
                                        return connection.rollback(() => {
                                            connection.release();
                                            reject(`Transaction commit failed on ${nodeName}`);
                                        });
                                    }
    
                                    connection.release();
                                    if (results.affectedRows === 0) {
                                        console.log(`AppID not found on ${nodeName}`);
                                        resolve({ [nodeName]: -1 });
                                    } else {
                                        console.log(`AppID updated on ${nodeName}`);
                                        resolve({ [nodeName]: results });
                                    }
                                });
                            }, delay);
                        }
                    );

                });
        });
    });
}

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
                    connection.query('SELECT * FROM steam_games WHERE AppID = ?', [`${appID}`], (err, results) => {
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
