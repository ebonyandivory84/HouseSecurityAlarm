const J1970 = 2440588;
const J2000 = 2451545;
const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

function toJulian(date: Date): number {
  return date.getTime() / 86400000 - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * 86400000);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

function declination(l: number): number {
  return Math.asin(Math.sin(l) * Math.sin(OBLIQUITY));
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(m: number): number {
  const center = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const perihelion = RAD * 102.9372;
  return m + center + perihelion + Math.PI;
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - 0.0009 - lw / (2 * Math.PI));
}

function approxTransit(ht: number, lw: number, n: number): number {
  return 0.0009 + (ht + lw) / (2 * Math.PI) + n;
}

function solarTransitJ(ds: number, m: number, l: number): number {
  return J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);
}

function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
}

const SUNSET_ANGLE = -0.833 * RAD;

/** Standard NOAA-derived astronomical formulas (public domain method, no external dependency). */
export function getSunTimes(date: Date, latitude: number, longitude: number): SunTimes {
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
