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

//fs.createReadStream('./.data/sqlite.db').pipe(fs.createWriteStream('./public/backup.db'));


// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function(){
  // db.run('INSERT INTO Squares SELECT * FROM Squares2');
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

    db.each('SELECT lat, long from Coordinates ORDER BY time DESC LIMIT 1', function(err, row) {
      console.log('last coordinate', row);
    });
    
    db.each('SELECT count(*) from Squares LIMIT 1', function(err, row) {
      console.log('number squares', row);
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
const n = 2000;


app.post('/squares', function(req, res) {
  console.log(req.body);
  
  
  if (req.body.forEach) {
    req.body.forEach((chunk) => {
      if (chunk.acc > 50) {
        console.log('Ignore location. Low accuracy');
        return;
      }
      
      const r = ratio(chunk.lat, chunk.long);

      const lat = Math.floor(r * chunk.lat * n) / n;
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

function zoom(factor) {
  return function(record) {
    return record;
    return {
      ...record,
      lat: Math.floor(record.lat * (n / factor)) / (n / factor),
      long: Math.floor(record.long * (n / factor)) / (n / factor)
    };
  };
}

app.get('/path', (req, res) => {
  const d1 = (new Date(req.query.time ? parseInt(req.query.time, 10) : Date.now())).setHours(0,0,0,0);
  const d2 = d1 + 86400000;
  db.all('SELECT lat, long, time from Coordinates where time between ? and ? ORDER BY time ASC', d1, d2, function(err, rows) {
    res.send(JSON.stringify(rows.map((row) => {
      const r = ratio(row.lat, row.long);
      return {
        lat: row.lat * r,
        long: row.long,
        time: row.time
      };

    })));
  });
});

app.get('/squares', function(request, response) {
  const delta = 0.006 * parseFloat(request.query.zoom);
  db.each('SELECT lat, long from Coordinates ORDER BY time DESC LIMIT 1', function(err, row) {
    if ( row ) {
      const r = ratio(row.lat);

      prevLat = request.query.lat ? parseFloat(request.query.lat) : (row.lat * r);
      prevLong = request.query.long ? parseFloat(request.query.long) : row.long;
      lastLocation = { lat: r * row.lat, long: row.long, visits: 1 };

      db.all('SELECT * from Squares WHERE (lat BETWEEN ? AND ?) AND (long BETWEEN ? AND ?)', prevLat - delta * 2, prevLat + delta * 2, prevLong - delta, prevLong + delta, function(err, rows) {
        //rows = [];

        rows.unshift(lastLocation);
        response.send(JSON.stringify(rows.map(zoom(parseFloat(request.query.zoom / 4)))));
      });
    }
  });
  
});

const { ratio } = require('./long.js');

async function migrate() {
  //return;
  //db.run('DELETE FROM Squares2');
  const d1 = (new Date(Date.now())).setHours(0,0,0,0);
  const d2 = d1 + 86400000;
  const requests = [];
  db.all('SELECT lat, long from Coordinates where time between ? and ? ORDER BY time ASC', d1, d2, function(err, rows) {
      rows.forEach(chunk => {
        const r = ratio(chunk.lat);
        const lat = Math.floor(r * chunk.lat * n) / n;
        const long = Math.floor(chunk.long * n) / n;

        if (prevLat !== lat || prevLong !== long) {
          console.log('visited', lat, long, chunk);
          requests.push(['INSERT OR REPLACE INTO Squares (lat, long, visits) VALUES (?, ?, 1 + COALESCE((SELECT visits FROM Squares WHERE lat = ? and long = ?), 0))', lat, long, lat, long]);

        }
        prevLat = lat;
        prevLong = long;
      });
      sequence(requests);
      
    });
  
  
}

async function migrate2() {
  const requests = [];
  db.all('SELECT lat, long, visits from Squares', function(err, rows) {
      rows.forEach(chunk => {
        const r = ratio(chunk.lat);
        const lat = Math.floor(r * chunk.lat * n) / n;
        const long = Math.floor(chunk.long * n) / n;

        if (prevLat !== lat || prevLong !== long) {
          console.log('visited', lat, long, chunk);
          requests.push(['INSERT OR REPLACE INTO Squares (lat, long, visits) VALUES (?, ?, COALESCE((SELECT visits FROM Squares WHERE lat = ? and long = ?), ?))', lat, long, lat, long, chunk.visits]);

        }
        prevLat = lat;
        prevLong = long;
      });
      sequence(requests);
      
    });
  
  
}

// migrate()

async function deleteSquare(lat, long) {
  await run(['DELETE FROM Squares2 WHERE lat = ? AND long = ?', lat, long]);
}

async function deleteCoordinate(lat, long) {
  await run(['DELETE FROM Coordinates WHERE lat = ? AND long = ?', lat, long]);
}


// deleteSquare(82.4365, 0.5955)
// deleteSquare(82.4365, 0.61)



function run(params) {
  return new Promise(resolve => {
    db.run.apply(db, params.concat([(err) => {console.log(err); resolve(); }]));
  });
}

async function sequence(requests) {
  for (var i = 0; i < requests.length; i += 1) {
     await run(requests[i]);
  }
}

// migrate();

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


function approx(n) {
    return Math.round(n * 100000) / 100000;
}