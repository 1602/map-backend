// server.js
// where your node app starts

// init project
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', '*');
      next();
    });
app.use(bodyParser.json());

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// init sqlite db
var fs = require('fs');
var dbFile = './.data/sqlite.db';
// fs.unlinkSync(dbFile);
var exists = fs.existsSync(dbFile);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function(){
  
  if (!exists) {
    db.run('CREATE TABLE Squares (lat REAL, long REAL, visits INTEGER, PRIMARY KEY (lat, long))');
    db.run('CREATE TABLE Coordinates (lat REAL, long REAL, alt REAL, time INTEGER)');
    db.run('CREATE INDEX ixTime ON Coordinates (time)');
    


    console.log('New table Squares created!');
    
    // insert default Squares
    db.serialize(function() {
      // db.run('INSERT INTO Squares (dream) VALUES ("Find and count some sheep"), ("Climb a really tall mountain"), ("Wash the dishes")');
    });
  }
  else {
    console.log('Database "map" ready to go!');
    
    db.each('SELECT lat, long from Coordinates ORDER BY time DESC LIMIT 1', function(err, row) {
      if (row) {
        prevLat = row.lat;
        prevLong = row.long;
        console.log('record:', row);
      }
    });
    
    db.each('SELECT count(*) as pointsToday from Coordinates where time > ?', (new Date()).setHours(0,0,0,0), function(err, row) {
      if (row) {
        prevLat = row.lat;
        prevLong = row.long;
        console.log('record:', row);
      }
    });
  }
});

let prevLat = null, prevLong = null, lastLocation;

app.post('/squares', function(req, res) {
  console.log(req.body);
  const n = 2000;
  
  
  if (req.body.forEach) {
    req.body.forEach((chunk) => {
      if (chunk.acc > 50) {
        console.log('Ignore location. Low accuracy');
        return;
      }
      const lat = Math.floor(chunk.lat * n) / n;
      const long = Math.floor(chunk.long * n) / n;
  
      if (prevLat !== lat || prevLong !== long) {
        console.log('visited', lat, long, chunk);
        db.run('INSERT OR REPLACE INTO Squares (lat, long, visits) VALUES (?, ?, 1 + COALESCE((SELECT visits FROM Squares WHERE lat = ? and long = ?), 0))', lat, long, lat, long);
      }
      db.run('INSERT INTO Coordinates (lat, long, alt, time) VALUES (?, ?, ?, ?)', chunk.lat, chunk.long, chunk.alt, chunk.time);
      prevLat = lat;
      prevLong = long;
      lastLocation = { lat: chunk.lat, long: chunk.long, visits: 1 };
    });
  }
  res.send('OK');
});


app.get('/squares', function(request, response) {
  const delta = 0.003 * parseFloat(request.query.zoom);
  db.each('SELECT lat, long from Coordinates ORDER BY time DESC LIMIT 1', function(err, row) {
    if ( row ) {
      prevLat = parseFloat(request.query.lat || row.lat);
      prevLong = parseFloat(request.query.long || row.long);
      lastLocation = { lat: row.lat, long: row.long, visits: 1 };

      db.all('SELECT * from Squares WHERE (lat BETWEEN ? AND ?) AND (long BETWEEN ? AND ?)', prevLat - delta, prevLat + delta, prevLong - delta, prevLong + delta, function(err, rows) {

        if (lastLocation) {
          rows.unshift(lastLocation);
          
        }
        response.send(JSON.stringify(rows));
      });
    }
  });
  
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


function approx(n) {
    return Math.round(n * 100000) / 100000;
}