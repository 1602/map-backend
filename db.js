'use strict';

const { createReadStream, createWriteStream } = require('fs');
const { Database } = require('sqlite3').verbose();

module.exports = { init };

function init(dbFile = './.data/sqlite.db') {
    // const exists = existsSync(dbFile);
    const db = new Database(dbFile);

    return apiWrapper(db);
}

function apiWrapper(db) {

    return {
        run() { return promisify(db, 'run', arguments); },
        all() { return promisify(db, 'all', arguments); },
        serialize: cb => db.serialize(cb),
        backup: () => createReadStream('./.data/sqlite.db').pipe(createWriteStream('./public/backup.db'))
    };
}

function promisify(db, method, args) {
    const params = [].slice.call(args);
    return new Promise((resolve, reject) => {
        params.push((err, res) => err ? reject(err) : resolve(res));
        db[method].apply(db, params);
    });
}
