'use strict';

const db = require('./db.js').init();
const { ratio } = require('./long.js');


module.exports = {
    logCoordinates,
    coordinatesForDay,
    getSquares,
    deleteSquare,
    deleteCoordinate
};


async function logCoordinates(coordinates) {
    const highAccuracyCoordinates = coordinates.filter(point => point.acc < 50);
    let [prevLat, prevLong] = skewAndRound(await getLastLocation() || highAccuracyCoordinates[0]);

    for (let i = 0; i < highAccuracyCoordinates.length; i += 1) {
        await logCoordinate(highAccuracyCoordinates[i]);
    }

    async function logCoordinate(point) {
        const [lat, long] = skewAndRound(point);

        if (prevLat !== lat || prevLong !== long) {
            await db.run(`
                INSERT OR REPLACE INTO Squares (lat, long, visits)
                VALUES (
                    ?,
                    ?,
                    1 + COALESCE((SELECT visits FROM Squares WHERE lat = ? and long = ?), 0)
                )`, lat, long, lat, long);
        }

        await db.run(`
            INSERT INTO Coordinates (lat, long, alt, time)
            VALUES (?, ?, ?, ?)
            `, point.lat, point.long, point.alt, point.time);

        prevLat = lat;
        prevLong = long;
    }
}


async function getLastLocation() {
    const rows = await db.all('SELECT lat, long, time from Coordinates ORDER BY time DESC LIMIT 1');
    return rows[0];
}


function skewAndRound(point) {
    if (!point) {
        return [0, 0];
    }

    const n = 2000;
    const { lat, long } = point;

    return [Math.floor(ratio(lat) * lat * n) / n, Math.floor(long * n) / n];
}


/*
function skew(point) {
    if (!point) {
        return { lat: 0, long: 0 };
    }

    const { lat, long } = point;

    return { lat: ratio(lat) * lat, long };
}
*/


async function coordinatesForDay(timestamp) {
    const d1 = (new Date(timestamp)).setHours(0, 0, 0, 0);
    const d2 = d1 + 86400000;

    const rows = await db.all(`
        SELECT lat, long, time
        FROM Coordinates
        WHERE time BETWEEN ? and ?`, d1, d2);

    return rows.map(row => {
        const [lat, long] = skewAndRound(row);
        return {
            lat,
            long,
            time: row.time
        };
    });
}


async function getSquares(zoom, lat, long) {
    const delta = 0.007 * zoom;

    let prevLat, prevLong;
    const lastLocation = await getLastLocation();

    if (lat) {
        [prevLat, prevLong] = skewAndRound({ lat: parseFloat(lat), long: parseFloat(long) });
    } else {
        [prevLat, prevLong] = skewAndRound(lastLocation);
    }

    const rows = await db.all(`
        SELECT * FROM Squares
        WHERE (lat BETWEEN ? AND ?) AND (long BETWEEN ? AND ?)`,
    prevLat - delta * 2,
    prevLat + delta * 2,
    prevLong - delta,
    prevLong + delta
    );

    const squares = {};
    rows.forEach(row => calcSquareCoordinate(row, 200));

    return {
        squares:
            Object
                .keys(squares)
                .map(key =>
                    key.split(',').map(n => parseInt(n, 10)).concat(
                        squares[key].map(arr => arr.reduce((a, n) => (a << 3) + n, 0))
                    )
                ),
        lastLocation,
        ratio: ratio(lastLocation.lat),
    };

    function calcSquareCoordinate({ lat, long, visits }, squareSize) {
        const a0 = Math.floor(lat * squareSize);
        const b0 = Math.floor(long * squareSize);
        const a = Math.floor(lat * squareSize * 10);
        const b = Math.floor(long * squareSize * 10);
        const offsetA = a - a0 * 10;
        const offsetB = b - b0 * 10;
        const squareId = a0 + ',' + b0;

        if (!(squares[squareId])) {
            squares[squareId] = (new Array(10)).fill(0).map(() => [0,0,0,0,0,0,0,0,0,0]);
        }

        squares[squareId][offsetB][offsetA] = visits;
    }
}


function deleteSquare(lat, long) {
    return db.run('DELETE FROM Squares2 WHERE lat = ? AND long = ?', lat, long);
}


function deleteCoordinate(lat, long) {
    return db.run('DELETE FROM Coordinates WHERE lat = ? AND long = ?', lat, long);
}


