// server.js
// where your node app starts

// init project
const express = require('express');
const bodyParser = require('body-parser');
const server = express();
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});
server.use(bodyParser.json());

server.use(express.static('public'));

const app = require('./app.js');


// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
/*
db.serialize(() => {
    // db.run('INSERT INTO Squares3 SELECT * FROM Squares2');
    if (!exists) {


        db.run('CREATE TABLE Squares (lat REAL, long REAL, visits INTEGER, PRIMARY KEY (lat, long))');
        db.run('CREATE TABLE Coordinates (lat REAL, long REAL, alt REAL, time INTEGER)');
        db.run('CREATE INDEX ixTime ON Coordinates (time)');


        console.log('New table Squares created!');

        // insert default Squares
        db.serialize(() => {
            // db.run('INSERT INTO Squares (dream) VALUES ("Find and count some sheep"), ("Climb a really tall mountain"), ("Wash the dishes")');
        });
    } else {
        console.log('Database "map" ready to go!');

        db.each('SELECT lat, long from Coordinates ORDER BY time DESC LIMIT 1', (err, row) => {
            if (row) {
                prevLat = row.lat;
                prevLong = row.long;
                console.log('record:', row);
            }
        });

        db.each('SELECT lat, long from Coordinates ORDER BY time DESC LIMIT 1', (err, row) => {
            console.log('last coordinate', row);
        });

        db.each('SELECT count(*) from Squares2 LIMIT 1', (err, row) => {
            console.log('number squares', row);
        });


        db.each('SELECT count(*) as pointsToday from Coordinates where time > ?', (new Date()).setHours(0,0,0,0), (err, row) => {
            if (row) {
                prevLat = row.lat;
                prevLong = row.long;
                console.log('record:', row);
            }
        });
    }
});
*/


server.post('/squares', async (req, res) => {
    if (req.body && req.body.length) {
        await app.logCoordinates(req.body);
    }
    res.send('OK');
});

server.get('/path', async (req, res) => {
    const coords = await app.coordinatesForDay(req.query.time ? parseInt(req.query.time, 10) : Date.now());
    res.send(JSON.stringify(coords));
});

server.get('/squares', async (req, res) => {
    const squares = await app.getSquaresFromRawData(parseFloat(req.query.zoom), req.query.lat, req.query.long);
    res.send(JSON.stringify(squares));
});


// listen for requests :)
const listener = server.listen(process.env.PORT, () => {
    console.log('Your app server is listening on port ' + listener.address().port);
});


