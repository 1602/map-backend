const toRadians = a => a * Math.PI / 180;

const a = 6371000;

const simpleLongLength = lat => a * Math.cos(toRadians(lat)) * Math.PI / 180;
const squareSin = degree => Math.pow(Math.sin(toRadians(degree)), 2);
const squareA = Math.pow(6378137, 2);
const squareB = Math.pow(6356752.3142, 2);
const squareE = (squareA - squareB) / squareA;
const longLen = lat => a * Math.cos(toRadians(lat)) * Math.PI / (180 * Math.sqrt(1 - squareE * squareSin(lat)));
const latLen = lat => 111132.954 - 559.882 * Math.cos(2 * toRadians(lat)) + 1.175 * Math.cos(4 * toRadians(lat));
const ratio = (lat, long) => longLen(long) / latLen(lat);

module.exports = {
    simpleLongLength,
    longLen,
    latLen,
    ratio
};
