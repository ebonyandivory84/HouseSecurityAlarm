"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSunTimes = getSunTimes;
const J1970 = 2440588;
const J2000 = 2451545;
const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;
function toJulian(date) {
    return date.getTime() / 86400000 - 0.5 + J1970;
}
function fromJulian(j) {
    return new Date((j + 0.5 - J1970) * 86400000);
}
function toDays(date) {
    return toJulian(date) - J2000;
}
function declination(l) {
    return Math.asin(Math.sin(l) * Math.sin(OBLIQUITY));
}
function solarMeanAnomaly(d) {
    return RAD * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(m) {
    const center = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
    const perihelion = RAD * 102.9372;
    return m + center + perihelion + Math.PI;
}
function julianCycle(d, lw) {
    return Math.round(d - 0.0009 - lw / (2 * Math.PI));
}
function approxTransit(ht, lw, n) {
    return 0.0009 + (ht + lw) / (2 * Math.PI) + n;
}
function solarTransitJ(ds, m, l) {
    return J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);
}
function hourAngle(h, phi, d) {
    return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
}
const SUNSET_ANGLE = -0.833 * RAD;
/** Standard NOAA-derived astronomical formulas (public domain method, no external dependency). */
function getSunTimes(date, latitude, longitude) {
    const lw = RAD * -longitude;
    const phi = RAD * latitude;
    const d = toDays(date);
    const n = julianCycle(d, lw);
    const ds = approxTransit(0, lw, n);
    const m = solarMeanAnomaly(ds);
    const l = eclipticLongitude(m);
    const dec = declination(l);
    const jNoon = solarTransitJ(ds, m, l);
    const w = hourAngle(SUNSET_ANGLE, phi, dec);
    const a = approxTransit(w, lw, n);
    const jSet = solarTransitJ(a, m, l);
    const jRise = jNoon - (jSet - jNoon);
    return { sunrise: fromJulian(jRise), sunset: fromJulian(jSet), solarNoon: fromJulian(jNoon) };
}
