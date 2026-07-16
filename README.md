# ioBroker.housesecurityalarm

Zonenbasiertes Alarmsystem (Perimeter / Außenhaut / Innenraum) als ioBroker-Adapter mit React Native Web Dashboard und AlarmCenter-Hardware-Anbindung.

Clean-Room-Neubau, löst schrittweise die 23 Legacy-Skripte aus `AlarmSystem/old scripts/` ab (siehe `docs/LEGACY_PARITY.md`).

## Build

```bash
npm install
npm run build        # TypeScript-Backend: adapter/src → adapter/build
```

## Lokale Installation

```bash
iobroker url https://github.com/ebonyandivory84/HouseSecurityAlarm
iobroker add housesecurityalarm 0
iobroker start housesecurityalarm
```

## Changelog

### 0.1.0 (initial scaffold)
* Adapter-Grundgerüst
