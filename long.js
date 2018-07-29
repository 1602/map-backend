const toRadians = a => a * Math.PI / 180;

const a = 6371000;

const simpleLongLength = lat => a * Math.cos(toRadians(lat)) * Math.PI / 180;
const squareSin = degree => Math.pow(Math.sin(toRadians(degree)), 2);
const squareA = Math.pow(6378137, 2);
const squareB = Math.pow(6356752.3142, 2);
const squareE = (squareA - squareB) / squareA;
const longLen = lat => a * Math.cos(toRadians(lat)) * Math.PI / (180 * Math.sqrt(1 - squareE * squareSin(lat)));
const latLen = lat => (111132.954 - 559.882 * Math.cos(2 * toRadians(lat)) + 1.175 * Math.cos(4 * toRadians(lat)));
const ratio = lat => {

    // return 1.607;
    const d1 = distance(lat, 0, lat + 0.001, 0, 'K');
    const d2 = distance(lat, 0, lat, 0.001,  'K');
    // console.log(d1, d2, d1 / d2);
    return d1 / d2;

    // const ltl = latLen(lat);
    // const lgl = longLen(lat);
    // const x = Math.round(ltl / lgl * 100000) / 100000;
    // return x;
};

module.exports = {
    simpleLongLength,
    longLen,
    latLen,
    ratio
};

function distance(lat1, lon1, lat2, lon2) {
    const radlat1 = Math.PI * lat1 / 180;
    const radlat2 = Math.PI * lat2 / 180;
    const theta = lon1 - lon2;
    const radtheta = Math.PI * theta / 180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    return dist * 1.609344;
}
