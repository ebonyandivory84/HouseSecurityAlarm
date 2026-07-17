# HouseSecurityAlarmAdapter — Projektanweisungen

Erbt Regeln aus `projects/coding/CLAUDE.md`.

## Projektkontext
- **Ziel**: Zonenbasiertes Alarmsystem (Perimeter/Außenhaut/Innenraum) als eigenständiger ioBroker-Adapter mit React Native Web-Dashboard — löst 23 einzelne ioBroker-JavaScripts aus `AlarmSystem/old scripts/` schrittweise ab
- **Typ**: ioBroker Adapter (`type: security`) + React Native Web Frontend, `daemon`, `compact: true`
- **Status**: M1–M8 abgeschlossen (Backend, Frontend, Legacy-Parität), Produktiv-Deploy ausstehend
- **GitHub**: https://github.com/ebonyandivory84/HouseSecurityAlarm
- **Auftraggeber**: Eigenprojekt

## Architekturentscheidung: Clean-Room-Neubau
Kein Code-Import aus `projects/coding/AlarmSystem` — nur dessen `docs/LEGACY_PARITY.md`-Format als strukturelle Vorlage übernommen. Grund: AlarmSystem kennt nur 2 Scharf-Stufen (perimeter/armed); dieser Adapter führt die neu geforderte 3-Zonen-Hierarchie ein (siehe unten). Details siehe [Implementierungsplan](/Users/sebastian/.claude/plans/cuddly-wondering-cascade.md) und `docs/LEGACY_PARITY.md`.

## Zonen-/Modus-Hierarchie (zentrale Geschäftsregel)
3 Zonen: **Perimeter** (Kameras), **Außenhaut** (Türsensoren), **Innenraum** (Motion/PIR).
4 Scharf-Zustände, strikt hierarchisch (FSM-Invariante, nicht unabhängig setzbar):
- `unscharf` — nichts aktiv
- `perimeter` — einziger eigenständig aktivierbarer Modus
- `aussenhaut` — impliziert automatisch Perimeter
- `vollschutz` — impliziert automatisch Außenhaut UND Perimeter

Implementiert in `adapter/src/core/zoneEngine.ts`.

## Adapter-Metadaten (io-package.json)
- **Name**: `housesecurityalarm`
- **Port**: `8110`
- **LocalLink**: `%protocol%://%ip%:%port%/`
- **Abhängigkeit**: `js-controller >= 5.0.19`
- **webDir**: `adapter/www`
- **Deploy-Abweichung**: plain CommonJS (`main.js`, kein `"type"`-Feld) statt der in `projects/coding/CLAUDE.md` dokumentierten `main.cjs`+`"type":"module"`-Vorgabe — folgt dem nachweislich funktionierenden `SmartHome Dashboard`-Muster, bewusste Abweichung.

## Repo-Struktur
```
HouseSecurityAlarmAdapter/
├── main.js                  ioBroker Adapter-Einstiegspunkt (dual-runtime Dispatcher)
├── io-package.json / package.json
├── adapter/src/
│   ├── config/               types.ts, schema.ts, defaults.ts
│   ├── core/                 zoneEngine, eventBus, ruleEvaluator, sensorAggregator
│   ├── domain/                telegram, alarmCenterBridge, dayNightScheduler, presenceTracker, cameraController
│   ├── api/                    restRoutes, statePushWs, server
│   └── objects/                objectTree
├── frontend/                 eigenständiges Expo-Projekt (React Native Web)
│   └── src/{screens,components,hooks,services,types}
├── adapter/www/               Production Web-Bundle (Expo-Web-Build, committed)
├── admin/jsonConfig.json      port, devServerUrl, enableDevProxy
├── docs/LEGACY_PARITY.md      Mapping aller 23 Altskripte auf neue Module
└── test/                      @iobroker/testing (package + integration)
```

## Datenpunkt-Registry (zentrales Muster)
Jeder überwachte Datenpunkt ist über `config.datapointRegistry` (JSON-State) konfigurierbar:
- Typ `boolean` oder `string` (mit konfigurierbarem `triggerString`)
- Optionaler `zone`-Zuordnung (`perimeter`/`aussenhaut`/`innenraum`)
- Kameras zusätzlich mit `cameraCapabilities` (Personen-/Tier-/Objekterkennung, LED, Sirene, Innenraum-Flag)

Frontend-Editor: `DatapointCategoryScreen` + `DatapointListEditor` je Kategorie (Kameras, Motion, Türsensoren).

## REST/WS-API
Basis: `/housealarm/api` — `readStates`, `writeState`, `listObjects`, `getAlarmCenterStatus`, `sendAlarmCenterCommand`, `testSendTelegram`, `getConfig`, `putConfig`.
WebSocket-Push: `/housealarm/api/ws` (`statePushWs.ts`) — discriminated union `stateBatch` (nur an abonnierte IDs) / `cameraSnapshot` / `ruleTrace` (Broadcast an alle).

## Sicherheit (verbindlich)
- Keine Telegram-Bot-Tokens, Chat-IDs oder Kamera-Zugangsdaten im Code — ausschließlich `adapter.sendTo('telegram.x', 'send', { text })` bzw. verschlüsselte Adapter-Config (`config.datapointRegistry[].cameraCapabilities`)
- `captureSnapshot()` liefert dem Frontend ausschließlich Base64-Data-URIs, nie die rohe Kamera-URL
- Grund: Altskript `AlarmSystem_-_PerimeterKeeper_VII.json` hatte Bot-Token, Chat-IDs und Kamera-Passwörter hart im Quellcode — siehe `docs/LEGACY_PARITY.md` Eintrag 23

## Frontend-Seiten (10)
Übersicht, Kameras, Motion, Türsensoren, Telegram, AlarmCenter, Zonen, Logik, Tag-Nacht-Logik, Anwesenheit — jeweils unter `frontend/src/screens/`.

## Legacy-Parität
`docs/LEGACY_PARITY.md` — alle 23 Skripte aus `AlarmSystem/old scripts/` einzeln auf neue Module gemappt (Status `Abgedeckt`/`Stabilisiert`/`Nicht übernommen`).

## Dev-Workflow
```bash
# Backend:
npm run build && iobroker restart housesecurityalarm    # via @iobroker/dev-server

# Frontend:
cd frontend && npm run web        # Expo Dev-Server
# → devServerUrl im ioBroker-Admin setzen, enableDevProxy aktivieren

# Production-Build:
cd frontend && npx expo export -p web
cp -R dist/. ../adapter/www/
```

## Verbundene Projekte
- **AlarmSystem** → Architektur-/Format-Referenz (kein Code-Import), löst dessen 23 Skripte ab

## Wichtige Entscheidungen (Changelog)
- `2026-07-16` — Clean-Room-Neubau statt Weiterentwicklung von AlarmSystem (AskUserQuestion)
- `2026-07-16` — Frontend-Stack: React Native Web + Expo, konsistent mit SmartHome Dashboard (AskUserQuestion)
- `2026-07-16` — Deploy-Muster: plain CommonJS (`main.js`) statt `projects/coding/CLAUDE.md`-Vorgabe, da nachweislich funktionierend bei SmartHome Dashboard
