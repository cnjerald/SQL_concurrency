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

// READ ME FIRST

/**
 * Reading How does it work?
 *  It creates a custom race, where it tries to establish connections accross multiple SQL servers
 *  The first server that does not return a -1 result wins the race.
 *  If it returns -1, then the appid is not found in that server
 *  The race winner sends data back to the website.
 */

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


// Adding CCU (MISLEADING AJAX NAME)

/**
 * Adding how does it work?
 *  It creates a custom race, where it tries to establish connections accross multiple SQL servers
 *  The first server that does not return a -1 result wins the race.
 *  The DATE of the query is then returned
 *  [THEY ARE RACING FOR THE DATE]
 *  ONCE THE DATE IS FOUND
 *  IF DATE NOT NULL (Meaning the appID matches one of the records.)
 *      Push logs into All servers initial values of node1, node2, node3 = -1 [This number is set to indicate that no changes is needed.]
 *  AFTER LOGS.
 *  CASE 1:
 *      Date Less than YEAR(2020)
 *      ADD THE CCU FOR APPID FOUND IN NODE1 and NODE2
 *      IF ADD SUCCESS
 *          Edit the logs on all servers, set values of node[N] to 1 [ This number indicates that there are no more changes needed.]
 *      ELSE IF ADD FAILS
 *          Edit the logs on all servers, set the values of node[N] to 0 [This number is set to indicate that there are changes needed.]
 *  CASE2 : 
 *      Date equal or above YEAR(2020)
 *      Same scenario different nodes.
 *  
 *      
 *  If it returns -1, then the appid is not found in that server
 *  The race winner sends data back to the website.
 */



router.post('/ajax_write_CCU', async (req, res) => {
    const appID = req.body.appID || 0;
    const delay = req.body.delay || 0;
    const newVal = req.body.newVal || 0;
    let iv = 0;

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
        if (getDate && getDate.length > 0 && getDate[0]['Release date']) {
            date = getDate[0]['Release date'];
            iv = getDate[0]['Peak CCU'];
        } else {
            console.error("Date debug:", getDate ? getDate[0] : "No data found");
            // Handle the case where no data is returned or 'Release date' is missing
        }
    } catch (error) {
        console.error('Custom race failed:', error);
        res.status(500).send('All nodes are down, please try again later.');
    }

    console.log("Date debug: " + date);
    let logIDs = [0,0,0]

    // Create a log in any of the available node1Pool, node2Pool, node3Pool
    try{
        const logs = await Promise.all([
            createCCULogs(node1Pool, 'Node1', appID, "AddCCU", iv, (parseInt(newVal) + iv)).catch((err) => {
                console.log("Node1 log creation failed: ", err);
                return { insertId: 0 }; // Return a default value if it fails
            }),
            createCCULogs(node2Pool, 'Node2', appID, "AddCCU", iv, (parseInt(newVal) + iv)).catch((err) => {
                console.log("Node2 log creation failed: ", err);
                return { insertId: 0 }; // Return a default value if it fails
            }),
            createCCULogs(node3Pool, 'Node3', appID, "AddCCU", iv, (parseInt(newVal) + iv)).catch((err) => {
                console.log("Node3 log creation failed: ", err);
                return { insertId: 0 }; // Return a default value if it fails
            })
        ]);

        console.log("All log records", logs);
        logs.forEach((log, index) => {
            logIDs[index] = log.insertId; 
        });
    } catch(error){
        console.log("Log creation failed: ", error);
        res.status(500).send('All nodes are down, please try again later.');
    }


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
            console.log("LOGID DEBUG", logIDs);
                if (nodeResult === -1) {
                    try{
                        const logs = Promise.all([
                            updateCCULogs(node1Pool,nodeName,logIDs[0],succes = false),
                            updateCCULogs(node2Pool,nodeName,logIDs[1],succes = false),
                            updateCCULogs(node3Pool,nodeName,logIDs[2],succes = false)
                        ]).catch((error)=>{
                            console.log("Log update failed: ", error);
                        })
                    } catch(error) {
                        console.log("Log update failed: ", error);
                        res.status(500).send('All nodes are down, please try again later.');
                    }

                    // Meaning node update for this has failed.

                } else {
                    console.log(`${nodeName} active. Making logs! Result:`, nodeResult);
                    try{
                        const logs = Promise.all([
                            updateCCULogs(node1Pool,nodeName,logIDs[0],succes = true),
                            updateCCULogs(node2Pool,nodeName,logIDs[1],succes = true),
                            updateCCULogs(node3Pool,nodeName,logIDs[2],succes = true)
                        ]).catch((error)=>{
                            console.log("Log update failed: ", error);
                        })
                    } catch(error){
                        console.log("Log update failed: ", error);
                        res.status(500).send('All nodes are down, please try again later.');
                    }

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

            result.forEach(node => {
                const nodeName = Object.keys(node)[0]; // Get the node name (e.g., Node1, Node2)
                const nodeResult = node[nodeName]; // Get the corresponding value
            console.log("LOGID DEBUG", logIDs);
                if (nodeResult === -1) {
                    try{
                        const logs = Promise.all([
                            updateCCULogs(node1Pool,nodeName,logIDs[0],succes = false),
                            updateCCULogs(node2Pool,nodeName,logIDs[1],succes = false),
                            updateCCULogs(node3Pool,nodeName,logIDs[2],succes = false)
                        ]).catch((error)=>{
                            console.log("Log update failed: ", error);
                        })
                    } catch(error) {
                        console.log("Log update failed: ", err);
                        res.status(500).send('All nodes are down, please try again later.');
                    }

                    // Meaning node update for this has failed.

                } else {
                    console.log(`${nodeName} active. Making logs! Result:`, nodeResult);
                    try{
                        const logs = Promise.all([
                            updateCCULogs(node1Pool,nodeName,logIDs[0],succes = true),
                            updateCCULogs(node2Pool,nodeName,logIDs[1],succes = true),
                            updateCCULogs(node3Pool,nodeName,logIDs[2],succes = true)
                        ]).catch((error)=>{
                            console.log("Log update failed: ", error);
                        })
                    } catch(error){
                        console.log("Log update failed: ", err);
                        res.status(500).send('All nodes are down, please try again later.');
                    }

                }
            });
        } catch(error){
            console.log("Race failed: ", error);
            res.status(500).send('All nodes are down, please try again later.');
        }

    } else{

        try{
            const result = await Promise.all([
                addCCU(node1Pool,appID, delay, newVal, 'Node1'),
                addCCU(node1Pool,appID, delay, newVal, 'Node2'),
                addCCU(node3Pool,appID, delay, newVal, 'Node3'),
            ])

            result.forEach(node => {
                const nodeName = Object.keys(node)[0]; // Get the node name (e.g., Node1, Node2)
                const nodeResult = node[nodeName]; // Get the corresponding value
                if (nodeResult === -1) {
                    try{
                        const logs = Promise.all([
                            updateCCULogs(node1Pool,nodeName,logIDs[0],succes = false),
                            updateCCULogs(node2Pool,nodeName,logIDs[1],succes = false),
                            updateCCULogs(node3Pool,nodeName,logIDs[2],succes = false)
                        ]).catch((error)=>{
                            console.log("Log update failed: ", error);
                        })
                    } catch(error){
                        console.log("Log update failed: ", error);
                    }
                }
            
            })


        } catch(error) {
            console.log("Log update failed: ", error);
            res.status(500).send('All nodes are down, please try again later.');
        }

        console.log('not found.')
    }
});

// This is a helper function.

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

// This is a helper function.

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

// This is a helper function.

function createCCULogs(pool, nodeName, appid, method, iv, fv) {
    let date = new Date();
    date = getNowDateSQL(); // Ensure this returns a valid SQL date format
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error(`${nodeName} is unavailable.`);
          return reject(`${nodeName} is unavailable.`);
        }
  
        console.log(`Attempting to create a log on ${nodeName}`);
  
        connection.beginTransaction((err) => {
          if (err) {
            console.error(`Failed to start transaction on ${nodeName}`);
            connection.release();
            return reject(`Unable to start transaction on ${nodeName}`);
          }
  
          const query = 'INSERT INTO cculogs (Query,appid, Node1, Node2, Node3, IV, FV, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
          connection.query(query, [method, parseInt(appid), -1, -1, -1, parseInt(iv), parseInt(fv), date], (err, results) => {
            if (err) {
              console.error('Error inserting data:', err);
              return connection.rollback(() => {
                connection.release();
                reject('Transaction rolled back due to error.');
              });
            }
  
            connection.commit((err) => {
              if (err) {
                console.error('Transaction commit failed:', err);
                return connection.rollback(() => {
                  connection.release();
                  reject('Transaction rolled back due to commit error.');
                });
              }
  
              console.log('Data inserted successfully:', results);
              connection.release();
              resolve(results);
            });
          });
        });
      });
    });
  }

function updateCCULogs(pool, nodeName, logsID, success) {
    const updateValue = success ? 1 : 0; // Set to 1 for success, 0 for failure
    
    return new Promise((resolve,reject)=>{
        pool.getConnection((err,connection)=>{
            if(err){
                console.error(`${nodeName} is unavailable.`);
                return reject(`Node connection unavailable. is unavailable.`);
            }
            console.log(`Attempting to update log on column ${nodeName}`);
            connection.beginTransaction((err)=>{
                if (err) {
                    console.error(`Failed to start transaction on ${nodeName}`);
                    connection.release();
                    return reject(`Unable to start transaction on ${nodeName}`);
                }
                const query = `
                UPDATE cculogs
                SET ${nodeName} = ?
                WHERE logsID = ?
                `;

                connection.query(query, [updateValue, logsID], (err, results) => {
                    if (err) {
                        console.error('Error inserting data:', err);
                        return connection.rollback(() => {
                          connection.release();
                          reject('Transaction rolled back due to error.');
                        });
                      }
            
                      connection.commit((err) => {
                        if (err) {
                          console.error('Transaction commit failed:', err);
                          return connection.rollback(() => {
                            connection.release();
                            reject('Transaction rolled back due to commit error.');
                          });
                        }
            
                        console.log('Log modified successfully:', results);
                        connection.release();
                        resolve(results);
                })
            })
            })
        })
    })
}
 
  
function getNowDateSQL(){
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


// This helper function gets the logs and returns it
function getUpdateStatus(pool) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {

                return resolve(-1);
            }

            console.log(`Attempting to get logs from log`);
            connection.beginTransaction((err) => {
                if (err) {
                    console.error(`Failed to start transaction `);
                    connection.release();
                    return resolve(-1);
                }

                const query = `SELECT *
                                FROM cculogs
                                WHERE Node1 = 0 AND
                                Node2 = 1
                                ORDER BY DATE`;
                
                connection.query(query, (err, results) => {
                    if (err) {
                        console.error(`Failed to execute query on `);
                        connection.rollback(() => connection.release());
                        return reject(`Query failed `);
                    }

                    connection.commit((err) => {
                        connection.release();
                        if (err) {
                            console.error(`Failed to commit transaction on `);
                            return reject(`Transaction commit failed`);
                        }

                        console.log(`Update log found successfuly`);
                        resolve(results);
                    });
                });
            });
        });
    });
}


/**
 * How does recovery work?
 * Try to get the logs from node1, node2, and node3
 * Merge the logs into one (KEY = Initval = Initval, FinalVal = FinalVal) (To avoid duplication of addition.)
 * Get connections from all nodes.
 * Update CCU value for node1 (This server will be deployed in node1)
 * Update logs across all nodes
 * COMMIT changes
 * 
 */

async function startRecoveryLoop() {
    while (true) {
        console.log("Recovering logs!");
        try {
            const results = await Promise.all([
                getUpdateStatus(node1Pool),
                getUpdateStatus(node2Pool),
                getUpdateStatus(node3Pool)
            ]);
            const allResults = results.flat();

            // Merge results where IV and FV are equal
            const mergedResults = allResults.reduce((acc, log) => {
                const key = `${log.IV}-${log.FV}`; // Unique key based on IV and FV
                if (!acc[key]) {
                    acc[key] = { ...log, count: 1 }; // Initialize log with count
                } else {
                    acc[key].count += 1; // Increment count for duplicate logs
                }
                return acc;
            }, {});

            const mergedArray = Object.values(mergedResults);
            console.log("Merged Results:", mergedArray);

            for (const entry of mergedArray) {
                const { IV, FV, appid } = entry;
                const difference = FV - IV;

                try {
                    // Ensure connections are retrieved correctly with async/await
                    const connection1 = await node1Pool.promise().getConnection();
                    const connection2 = await node2Pool.promise().getConnection();
                    const connection3 = await node3Pool.promise().getConnection();

                    try {
                        await connection1.beginTransaction();
                        const backlogQuery = `
                            UPDATE steam_games
                            SET \`Peak CCU\` = \`Peak CCU\` + ?
                            WHERE AppID = ?`;
                        await connection1.query(backlogQuery, [difference, appid]);

                        const updateCCULOGSQuery = `
                            UPDATE cculogs
                            SET Node1 = 1
                            WHERE Node1 = 0 AND Node2 = 1`;
                        console.log("Publishing changes from logs")
                        await connection1.query(updateCCULOGSQuery);
                        await connection2.query(updateCCULOGSQuery);
                        await connection3.query(updateCCULOGSQuery);
                        console.log("Committing...")
                        await connection1.commit();
                        await connection2.commit();
                        await connection3.commit();
                        console.log("Log Recovery success!");
                    } catch (error) {
                        await connection1.rollback();
                        await connection2.rollback();
                        await connection3.rollback();
                        console.error("Transaction failed:", error);
                    } finally {
                        connection1.release();
                        connection2.release();
                        connection3.release();
                    }
                } catch (error) {
                    console.error("Failed to get a database connection:", error);
                }
            }
        } catch (error) {
            console.error("Error during recovery:", error);
        }

        // Wait 30 seconds before the next iteration
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

startRecoveryLoop()



module.exports = router;
