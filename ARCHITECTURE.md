# ARCHITECTURE.md — HouseSecurityAlarmAdapter

Referenzdokument für Weiterarbeit ohne vollständiges Neu-Einlesen des Quellcodes. Stand: 2026-07-17, HEAD `a47f278` (adapter-repo), vollständig deckungsgleich mit `origin/main`. Live-Produktiv-Deploy: `system.adapter.housesecurityalarm.0`, Port 8110, Raspberry Pi (192.168.44.31), Status enabled.

Jede Aussage hier ist entweder direkt aus dem Quellcode verifiziert (Regelfall) oder explizit als Annahme/Lücke gekennzeichnet. Bei Widerspruch zum tatsächlichen Code gilt der Code — dieses Dokument bei Abweichung nachziehen.

---

## 1. Projektüberblick

- **Zweck**: Zonenbasiertes Alarmsystem (Perimeter/Außenhaut/Innenraum) als eigenständiger ioBroker-Adapter mit React-Native-Web-Frontend. Löst 23 einzelne ioBroker-JavaScripts aus `projects/coding/AlarmSystem/old scripts/` ab.
- **Architekturentscheidung**: Clean-Room-Neubau — kein Code-Import aus `AlarmSystem`, nur dessen `LEGACY_PARITY.md`-Format als Vorlage übernommen (Entscheidung per AskUserQuestion, nicht mehr zu revidieren). Grund: AlarmSystem kennt nur 2 Scharf-Stufen (`perimeter`/`armed`); dieser Adapter führt die neu geforderte 3-Zonen-Hierarchie ein.
- **Frontend-Stack-Entscheidung**: React Native Web + Expo, konsistent mit `SmartHome Dashboard` (ebenfalls per AskUserQuestion).
- **Status**: M1–M9 + Produktiv-Deploy abgeschlossen. Adapter läuft stabil.
- **GitHub**: https://github.com/ebonyandivory84/HouseSecurityAlarm (Remote `origin`, HEAD deckungsgleich mit lokalem `main`)
- **Ursprünglicher Implementierungsplan**: `/Users/sebastian/.claude/plans/cuddly-wondering-cascade.md` — als Design-Absicht relevant, aber an mehreren Stellen von der tatsächlichen Implementierung abgewichen (siehe Abschnitt 9 „Bekannte Lücken & Drifts").

---

## 2. Vollständiger Verzeichnisbaum mit Datei-Zweck

```
HouseSecurityAlarmAdapter/
├── main.js                          Dual-Runtime-Dispatcher (Adapter-Einstiegspunkt, s. Abschnitt 8)
├── package.json                     npm-Metadaten (s. Abschnitt 3)
├── io-package.json                  ioBroker-Adapter-Metadaten (s. Abschnitt 3)
├── admin/
│   └── jsonConfig.json              Admin-UI-Formular: port, devServerUrl, enableDevProxy (s. Abschnitt 3)
├── docs/
│   └── LEGACY_PARITY.md             23/23 Altskripte → neue Module gemappt (s. Abschnitt 10)
├── adapter/
│   ├── tsconfig.json
│   ├── build/                       kompiliertes JS (gitignored, via tsc erzeugt)
│   ├── www/                         Production-Web-Bundle (Expo-Web-Build, committed, von main.js/Express ausgeliefert)
│   └── src/
│       ├── main.ts                  utils.Adapter-Bootstrap, dual-mode export
│       ├── config/
│       │   ├── types.ts             zentrale Domain-Typen (s. Abschnitt 5)
│       │   └── defaults.ts          Default-Datenpunkt-Zuordnung
│       ├── core/
│       │   ├── zoneEngine.ts        FSM mit Hierarchie-Guards (Abschnitt 4)
│       │   ├── eventBus.ts          typisierter EventEmitter-Wrapper (DomainEventMap)
│       │   ├── ruleEvaluator.ts     wertet ConditionGroup-Bäume aus, scoped nach Zonen-Modus
│       │   ├── sensorAggregator.ts  subscribeForeignStatesAsync, normalisiert boolean|string+triggerString
│       │   ├── json.ts              JSON-State Helper (parse/stringify mit Fallback)
│       │   └── sunCalc.ts           Astro-Berechnung (NOAA-Formeln, keine externe Abhängigkeit)
│       ├── domain/
│       │   ├── telegram.ts          sendTo('telegram.x', 'send', {text}) — keine Tokens im Code
│       │   ├── alarmCenterBridge.ts bidirektionale Brücke Panel ↔ Adapter (AlarmCenterMapping)
│       │   ├── cameraController.ts  Snapshot-Pipeline, LED/Sirene je Kamera
│       │   ├── dayNightScheduler.ts 60s-Poll, Astro ± Offset-Fenster
│       │   └── presenceTracker.ts   presence.confirmed + autoDisarmOnPresence
│       ├── api/
│       │   ├── server.ts            Express-Bootstrap, montiert restRoutes + statePushWs
│       │   ├── restRoutes.ts        REST-Endpunkte (Abschnitt 6)
│       │   ├── statePushWs.ts       WebSocket-Push-Endpunkt (Abschnitt 6)
│       │   └── types.ts             ApiDeps-Interface, ServerMessage-Union
│       ├── objects/
│       │   └── objectTree.ts        idempotenter State-Bootstrap (setObjectNotExistsAsync)
│       └── types/
│           └── adapterConfig.d.ts   ioBroker-Adapter-Config-Typdeklaration
├── frontend/                        eigenständiges Expo-Projekt (React 19, RN 0.79, Expo 53, TS 5.8)
│   └── src/
│       ├── navigation/
│       │   └── DrawerNavigator.tsx  Sidebar, 10 Drawer-Einträge (Abschnitt 7.1)
│       ├── screens/                 9 Dateien für 10 Drawer-Einträge (Abschnitt 7.1)
│       │   ├── OverviewScreen.tsx
│       │   ├── ZonesScreen.tsx
│       │   ├── AlarmCenterScreen.tsx
│       │   ├── DayNightScreen.tsx
│       │   ├── PresenceScreen.tsx
│       │   ├── LogikScreen.tsx
│       │   ├── TelegramScreen.tsx
│       │   ├── DatapointCategoryScreen.tsx   generisch, 3× instanziiert (Kameras/Motion/Türsensoren)
│       │   └── PlaceholderScreen.tsx         TOTER CODE, nicht mehr referenziert (Abschnitt 9)
│       ├── components/
│       │   ├── ui/
│       │   │   └── GlassCard.tsx    Glassmorphism-Primitive, web-CSS-blur vs. native BlurView (Abschnitt 7.3)
│       │   ├── datapoints/
│       │   │   └── DatapointListEditor.tsx   CRUD-Editor je Datenpunkt-Kategorie (Abschnitt 7.3)
│       │   └── logic/
│       │       ├── ConditionGroupEditor.tsx  rekursiver Regel-Baum-Editor (Abschnitt 7.3)
│       │       ├── ConditionLeafRow.tsx      einzelne Bedingungszeile
│       │       ├── ActionListEditor.tsx      RuleAction-Liste je Regel
│       │       └── DatapointPickerModal.tsx  geteiltes Such-Modal (Datenpunkt-Auswahl)
│       ├── hooks/                   11 Hooks, zwei Familien: Config-CRUD vs. Live-Status (Abschnitt 7.2)
│       │   ├── useAlarmCenterMapping.ts
│       │   ├── useAllDatapoints.ts
│       │   ├── useDayNightConfig.ts
│       │   ├── useLogicRules.ts
│       │   ├── usePresenceConfig.ts
│       │   ├── useTelegramTemplates.ts
│       │   ├── useAlarmCenterStatus.ts
│       │   ├── useDatapointCategory.ts
│       │   ├── useDayNightStatus.ts
│       │   ├── usePresenceStatus.ts
│       │   └── useCameraSnapshots.ts
│       ├── services/
│       │   └── iobrokerClient.ts    REST-Client, Basis-Pfad /housealarm/api
│       ├── types/
│       │   ├── domain.ts            Frontend-Kopie der Backend-Domain-Typen (unabhängig gepflegt, Abschnitt 9)
│       │   ├── logic.ts             ConditionLeaf/ConditionGroup/RuleAction-Typen + Helper
│       │   ├── telegram.ts          TelegramTemplate-Typ
│       │   └── iobroker-shim.d.ts   minimaler lokaler ioBroker-Namespace-Shim
│       └── theme/
│           └── palette.ts           Farbpalette, spacing, radius
└── test/                            @iobroker/testing (package + integration)
```

---

## 3. Adapter-Metadaten (exakter Inhalt der Config-Dateien)

### `io-package.json` (83 Zeilen, vollständig gelesen)
- `common.name`: `"housesecurityalarm"`
- `common.version`: `"0.1.0"`
- `common.type`: `"security"`
- `common.mode`: `"daemon"`
- `common.main`: `"main.js"`
- `common.compact`: `true`
- `common.connectionType`: `"local"`
- `common.dataSource`: `"push"`
- `common.adminUI.config`: `"json"`
- `common.localLinks.WebUI.link`: `"%protocol%://%ip%:%port%/"`
- `common.dependencies`: `[{ "js-controller": ">=5.0.19" }]`
- `native`: `{ port: 8110, devServerUrl: "", enableDevProxy: false }`
- `instanceObjects`: enthält **nur** `info` (Channel) und `info.connection` (boolean, role `indicator.connected`) statisch. Der komplette restliche Objektbaum (`zones.*`, `commands.*`, `alarm.*`, `countdown.*`, `presence.*`, `daynight.*`, `alarmcenter.*`, `config.*`) wird **zur Laufzeit idempotent** von `objects/objectTree.ts` per `setObjectNotExistsAsync` angelegt — nicht hier deklariert. Wichtig bei Debugging: nach `iobroker upload` erscheinen die meisten States erst nach dem ersten Adapter-Start.

### `package.json` (root, vollständig gelesen)
```json
{
  "name": "iobroker.housesecurityalarm",
  "version": "0.1.0",
  "main": "main.js",
  "author": "ebonyandivory84",
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/ebonyandivory84/HouseSecurityAlarm.git" },
  "engines": { "node": ">=18" },
  "dependencies": {
    "@iobroker/adapter-core": "^3.2.3",
    "axios": "^1.9.0",
    "express": "^4.21.2",
    "http-proxy-middleware": "^3.0.3",
    "ws": "^8.18.3"
  },
  "devDependencies": {
    "@iobroker/testing": "^5.0.4",
    "@types/express": "^4.17.21",
    "@types/node": "^22.10.2",
    "@types/ws": "^8.5.13",
    "typescript": "^5.6.3"
  },
  "scripts": {
    "build": "tsc -p adapter/tsconfig.json",
    "watch": "tsc -w -p adapter/tsconfig.json",
    "start": "node main.js"
  }
}
```
Kein `"type"`-Feld → plain CommonJS. Bewusste Abweichung von `projects/coding/CLAUDE.md`s Vorgabe (`main.cjs` + `"type":"module"`), s. Abschnitt 8.

### `admin/jsonConfig.json` (vollständig gelesen)
Einfaches Panel mit 3 Feldern: `port` (number, default 8110), `devServerUrl` (text, leer = Production-Build), `enableDevProxy` (checkbox).

---

## 4. Zonen-/Modus-Hierarchie (zentrale Geschäftsregel)

3 Zonen: **Perimeter** (Kameras), **Außenhaut** (Türsensoren), **Innenraum** (Motion/PIR).

4 Scharf-Zustände, strikt hierarchisch, FSM-Invariante (nicht unabhängig setzbar):
- `unscharf` — nichts aktiv
- `perimeter` — einziger eigenständig aktivierbarer Modus
- `aussenhaut` — impliziert automatisch Perimeter
- `vollschutz` — impliziert automatisch Außenhaut UND Perimeter

**Backend**: `core/zoneEngine.ts` — Guards verhindern ungültige Übergänge, Methoden u.a. `armPerimeter()`, `armAussenhaut()`, `armVollschutz()`, `disarm()`.

**Frontend-Spiegelung**: `types/domain.ts`s `deriveZoneState()` berechnet aus dem einzelnen `status.mode`-String die drei booleschen Flags `perimeterActive`/`aussenhautActive`/`innenraumActive`, exakt die Backend-FSM-Hierarchie nachbildend. Aktiv genutzt in `ZonesScreen.tsx`.

**Presence-Interaktion**: `presenceTracker.ts` mit `autoDisarmOnPresence`-Flag stuft `vollschutz` bei bestätigter Anwesenheit auf `armAussenhaut()` herab — **nie** vollständiges Entschärfen automatisch.

---

## 5. ioBroker-Objektbaum & zentrale TypeScript-Typen

### Objektbaum (aus Plan + Code-Bestätigung, `housesecurityalarm.0.*`)
```
zones.mode                    string   unscharf|perimeter|aussenhaut|vollschutz
zones.perimeterActive         boolean  (derived: mode != unscharf)
zones.aussenhautActive        boolean  (derived: mode in [aussenhaut, vollschutz])
zones.innenraumActive         boolean  (derived: mode == vollschutz)
zones.triggeredZones          string   JSON array
commands.armPerimeter/armAussenhaut/armVollschutz/disarm   boolean (Button)
alarm.active / alarm.panicActive / alarm.triggerReason / .triggerZone / .triggerDatapoint / .triggerTs
countdown.remainingSec / countdown.active
presence.confirmed
daynight.isNight / daynight.mode           day|dusk|night
alarmcenter.online / alarmcenter.fingerprintLastMatch
config.datapointRegistry      string JSON  DatapointConfig[]
config.rules                  string JSON  LogicRule[]
config.telegramTemplates      string JSON  TelegramTemplate[]
config.dayNight                string JSON
config.presence                 string JSON
config.alarmCenterMapping        string JSON
```
Alles außer `info`/`info.connection` wird dynamisch von `objectTree.ts` erzeugt (s. Abschnitt 3).

**⚠️ Bestätigte Implementierungslücke**: Beim vollständigen Lesen des gesamten Backend-Quellcodes (`main.ts`, alle `domain/*.ts`, `core/*.ts`) wurde bestätigt, dass **keine Code-Stelle** `alarm.active`/`alarm.panicActive`/`.triggerReason`/`.triggerZone`/`.triggerDatapoint`/`.triggerTs` mit tatsächlichen Werten beschreibt, und **keine Stelle** die EventBus-Events `alarmTriggered`/`alarmCleared`/`countdownStarted`/`countdownTick`/`countdownStopped` emittiert. Die States existieren im Objektbaum, werden aber nie befüllt. Vor produktivem Einsatz des Alarm-Countdown-Features muss diese Lücke geschlossen werden — vermutlich in `zoneEngine.ts` oder `ruleEvaluator.ts`.

### Backend-Domain-Typen (`adapter/src/config/types.ts`)
```ts
interface DatapointConfig {
  id: string;
  category: 'camera'|'motion'|'door'|'presence'|'brightness'|'custom';
  label: string;
  valueType: 'boolean'|'string';
  triggerString?: string;
  zone?: 'perimeter'|'aussenhaut'|'innenraum'|null;
  cameraCapabilities?: {
    personDetectionId?: string;
    animalDetectionId?: string;
    objectDetectionId?: string;
    ledId?: string;
    sirenId?: string;
    isIndoor?: boolean;
  };
  enabled: boolean;
}

type ConditionLeaf  = { kind:'leaf'; datapointId:string; comparator?:'triggered'|'equals'|'above'|'below'; value?:unknown };
type ConditionGroup = { kind:'group'; op:'AND'|'OR'; children:(ConditionLeaf|ConditionGroup)[] };

type RuleAction =
  | { type:'setState'; stateId:string; value:unknown }
  | { type:'telegram'; templateId:string; withSnapshot?:string }
  | { type:'cameraLed'|'cameraSiren'; cameraId:string; value:boolean };

interface LogicRule {
  id:string; name:string; enabled:boolean;
  scopeModes:Array<'perimeter'|'aussenhaut'|'vollschutz'>;
  when:ConditionGroup; then:RuleAction[];
}

interface TelegramTemplate {
  triggerId:string; messageText:string; includeSnapshot:boolean;
  snapshotCameraId?:string; caption?:string;
}

interface AlarmCenterMapping {
  armedStateId:string; perimeterStateId:string; countdownStateId:string;
  sirenStateId:string; triggerStateId:string; displayStateId:string;
  buzzerStateId:string; ledRedStateId:string; ledYellowStateId:string;
  fingerprintStateId:string;
}
```

### DomainEventMap (`core/eventBus.ts`)
`modeChanged`, `alarmTriggered`, `alarmCleared`, `countdownStarted`, `countdownTick`, `countdownStopped`, `datapointChanged`, `ruleTrace`, `cameraSnapshot`. (Die alarm-/countdown-Events werden aktuell nie emittiert, s.o.)

### Frontend-Typen (`frontend/src/types/domain.ts`, `logic.ts`, `telegram.ts`)
Eigenständige, unabhängig gepflegte Kopie der Backend-Typen (kein gemeinsames Package). `DatapointConfig` im Frontend nutzt dieselben Felder wie oben (bestätigt über `DatapointListEditor.tsx`s `ZONE_OPTIONS` = `null|perimeter|aussenhaut|innenraum` und `CAPABILITY_FIELDS` = `personDetectionId|animalDetectionId|objectDetectionId|ledId|sirenId`). Zusätzliche Frontend-Helper: `createDefaultDatapointConfig()`, `createDefaultConditionLeaf()`, `createEmptyConditionGroup()`, `createDefaultAction()`, `coerceInputValue()`/`formatInputValue()`, `ACTION_TYPE_LABELS`, `COMPARATOR_LABELS`, `deriveZoneState()`.

**Wartungshinweis**: Da `frontend/src/types/*.ts` keine Referenz auf `adapter/src/config/types.ts` hat, müssen beide Seiten bei Schema-Änderungen manuell synchron gehalten werden.

---

## 6. REST + WebSocket API

Basis-Pfad: `/housealarm/api`

### REST-Endpunkte (`api/restRoutes.ts`)
- `readStates`, `writeState`, `listObjects`
- `getAlarmCenterStatus`, `sendAlarmCenterCommand`
- `testSendTelegram`
- `getConfig`, `putConfig` — generischer Handler `registerJsonConfigRoute<T>(router, path, stateId, deps, fallback, isArray)` DRYt GET/PUT für alle JSON-Blob-Configs (datapoints/:category, rules, telegram-templates, daynight, presence, alarmcenter-mapping)

Dependency-Injection: einheitliches `ApiDeps`-Interface `{ adapter, bus, zoneEngine, sensorAggregator, telegramNotifier }`, durchgereicht von `server.ts` → `restRoutes.ts`/`statePushWs.ts`.

### WebSocket (`api/statePushWs.ts`, Endpunkt `/housealarm/api/ws`)
Discriminated Union `ServerMessage`:
- `stateBatch` — nur an abonnierte IDs
- `cameraSnapshot` — Broadcast
- `ruleTrace` — Broadcast, **wird von keinem Frontend-Code konsumiert** (bestätigte Lücke, s. Abschnitt 9)

---

## 7. Frontend im Detail

### 7.1 Navigation vs. Screen-Dateien (wichtige Unterscheidung)
`DrawerNavigator.tsx` definiert **10 Drawer-Einträge**: Übersicht, Kameras, Motion, Türsensoren, Telegram, AlarmCenter, Zonen, Logik, Tag-Nacht-Logik, Anwesenheit.

Es gibt nur **9 Screen-Komponenten-Dateien**, weil `DatapointCategoryScreen.tsx` eine generische, parametrisierte Komponente ist (Props: `category`, `emptyHint`, `showCameraCapabilities`), die 3× instanziiert wird (Kameras/Motion/Türsensoren).

`PlaceholderScreen.tsx` ist **bestätigt toter Code**: hartcodierter Text „Diese Seite wird in M7 implementiert", seit alle 10 Drawer-Einträge auf echte Screens zeigen nicht mehr referenziert. Kann gefahrlos gelöscht werden.

### 7.2 Hooks (11, zwei Familien)
- **Config-CRUD**: `useAlarmCenterMapping`, `useAllDatapoints`, `useDayNightConfig`, `useLogicRules`, `usePresenceConfig`, `useTelegramTemplates`
- **Live-Status** (WS-primär, REST-Polling-Fallback): `useAlarmCenterStatus`, `useDatapointCategory`, `useDayNightStatus`, `usePresenceStatus`, `useCameraSnapshots`

Gemeinsame Konstanten: `POLL_INTERVAL_MS = 5000`, `WS_RECONNECT_BASE_DELAY_MS = 850`, `WS_RECONNECT_MAX_DELAY_MS = 8000`, `REFETCH_DEBOUNCE_MS = 150`. Reconnect-Formel: `Math.min(850 * 2**attempt, 8000)`.

### 7.3 Komponenten
- **`GlassCard.tsx`**: `Platform.OS === "web"` → `View` mit CSS `backdropFilter: blur(20px)` (als `ViewStyle` gecastet); native → `expo-blur`s `<BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />` hinter Content. Optionaler `accentColor`-Prop überschreibt `borderColor`. Zentraler Baustein, von jedem Screen und `DatapointListEditor` (pro Zeile) genutzt.
- **`DatapointListEditor.tsx`**: reiner Formular-CRUD-Editor pro Datenpunkt-Kategorie. Rows als `GlassCard` (accentColor=danger bei getriggertem Zustand), Switch für enabled, Label-/TriggerString-Input, Zone-Chips, optionaler Kamera-Capabilities-Block inkl. Snapshot-Vorschau. **Kein Drag-and-Drop.**
- **`ConditionGroupEditor.tsx`**: rekursiver Regel-Baum-Editor. `DEPTH_COLORS = [accent, warning, success]` zyklisch nach Verschachtelungstiefe. Reordering via `moveChild()` — simpler Array-Index-Swap über ▲/▼-Buttons, **kein Drag-and-Drop**.
- **`ActionListEditor.tsx`**: Liste von `RuleAction`s je Regel. `coerce(raw: string)`-Helper parst Freitext zu `true`/`false`/`Number`/String für `setState`-Werte. Reordering via `moveAction()` — ebenfalls simpler Array-Swap.
- **`ConditionLeafRow.tsx`**: einzelne Bedingungszeile, Comparator-Chips (`triggered`/`equals`/`above`/`below`), öffnet `DatapointPickerModal` zur Datenpunkt-Auswahl.
- **`DatapointPickerModal.tsx`**: geteiltes Such-Modal, genutzt sowohl von `ConditionLeafRow` (Datenpunkt-Auswahl) als auch `ActionListEditor` (Kamera-ID-Auswahl für `cameraLed`/`cameraSiren`).

### 7.4 Wiederkehrendes Pattern: Dirty-Tracking
`const dirty = JSON.stringify(draft) !== JSON.stringify(source)` — identisch in `AlarmCenterScreen`, `DayNightScreen`, `PresenceScreen`, `LogikScreen`, `TelegramScreen` **und** `DatapointListEditor.tsx`. Konsistente, projektweite Formular-Konvention — bei neuen Editoren beibehalten.

---

## 8. Deploy-Historie & Betriebs-Hinweise

### CommonJS-Abweichung (bewusst)
`projects/coding/CLAUDE.md` schreibt `"main": "main.cjs"` + `"type": "module"` vor. Dieser Adapter nutzt stattdessen **plain CommonJS** (`main.js`, kein `"type"`-Feld) — folgt dem nachweislich funktionierenden `SmartHome Dashboard`-Muster. Dokumentierte, bewusste Abweichung.

### `main.js` (10 Zeilen, Dual-Runtime-Dispatcher)
```js
"use strict";
const startAdapter = require("./adapter/build/main");
if (require.main !== module) {
  module.exports = startAdapter;
} else {
  startAdapter();
}
```

### Produktiv-Bugfix (2026-07-17, Commit `835e28d`)
**Root Cause**: `main.js` destrukturierte `{ startAdapter }` aus `adapter/build/main`, aber `adapter/build/main.js` exportiert `module.exports = startAdapter` als **bare Function**, nicht als `{startAdapter}`-Objekt. Ergebnis: `TypeError: startAdapter is not a function` beim Adapter-Start.
**Fix**: Destrukturierung entfernt → `const startAdapter = require("./adapter/build/main");` (siehe Code oben). Adapter läuft seither stabil.

### ioBroker-CLI-Deploy-Sequenz (aus `projects/coding/CLAUDE.md`)
```bash
ssh -i ~/.ssh/id_ed25519_iobroker sebastian@192.168.44.31 \
  "iobroker stop housesecurityalarm; \
   iobroker url https://github.com/ebonyandivory84/HouseSecurityAlarm; \
   iobroker start housesecurityalarm"
```
`iobroker url` gibt bei Updates **kosmetischen Exit-Code 25** zurück (Instanz existiert bereits — kein Fehler). Deshalb `;` statt `&&`, damit `iobroker start` trotzdem ausgeführt wird.

### Dev-Workflow
```bash
# Backend
npm run build && iobroker restart housesecurityalarm

# Frontend Dev-Server
cd frontend && npm run web
# → devServerUrl im ioBroker-Admin setzen, enableDevProxy aktivieren

# Production-Build
cd frontend && npx expo export -p web
cp -R dist/. ../adapter/www/
```

### Git-Sonderregel für dieses Repo
Zwei projektfremde PDF-Dateien liegen im Repo-Root und **müssen von Git ausgeschlossen bleiben**:
- `H2-3~6K-S2 single phase communication protocol -2022.12.02-EN.pdf`
- `saj-modbus-h2.pdf`

**Immer explizite Pfade bei `git add` verwenden, niemals `git add -A`** in diesem Repo (Abweichung von der workspace-weiten `git add -A`-Konvention).

---

## 9. Bekannte Lücken & Drifts (Plan vs. tatsächliche Implementierung)

Vollständig verifiziert durch Lesen des gesamten Backend- und Frontend-Quellcodes:

1. **Alarm-/Countdown-Events werden nie geschrieben** (s. Abschnitt 5) — `alarm.active` etc. und die zugehörigen EventBus-Events existieren nur als Schema, keine Code-Stelle befüllt sie.
2. **`ruleTrace`-WebSocket-Nachricht wird von keinem Frontend-Code konsumiert** — bestätigt über alle 9 Screens, alle 11 Hooks, alle 6 Komponenten. Der Backend-Typ existiert (`ServerMessage`-Union), aber es gibt keinen Consumer.
3. **Drag-and-Drop wurde nie implementiert** — der Plan sah `components/dnd/DraggableChip.tsx`/`DropZone.tsx` via `react-native-gesture-handler`+`react-native-reanimated` vor, mit Tap-Fallback als *sekundärem* Pfad für kleine Phones. Tatsächlich existiert **nur** der Tap-Pfad: `ConditionGroupEditor.moveChild()`, `ActionListEditor.moveAction()`, `ConditionLeafRow`s Move-Buttons — alle simple ▲/▼-Array-Swaps. Kein `react-native-gesture-handler`/`react-native-reanimated`-Import irgendwo im Frontend.
4. **Floorplan-Feature komplett nicht gebaut** — geplant war `config.floorplan` (JSON-State) + `components/floorplan/FloorPlanSvg.tsx` (react-native-svg). Null Referenzen in Navigation, Screens oder Komponenten.
5. **`PlaceholderScreen.tsx` ist toter Code** (s. 7.1).
6. **Frontend-Typen sind eine unabhängige Kopie** der Backend-Typen ohne geteiltes Package — Synchronisations-Aufwand bei Schema-Änderungen (s. Abschnitt 5).

Diese Lücken sind **keine Fehler in diesem Dokument**, sondern der bestätigte Ist-Zustand des Codes zum Stand 2026-07-17.

---

## 10. Sicherheit (verbindlich, nicht abschwächen)

- Keine Telegram-Bot-Tokens, Chat-IDs oder Kamera-Zugangsdaten im Code.
- `domain/telegram.ts` sendet ausschließlich über `adapter.sendTo("telegram.0", "send", { text })` — kein eigener Bot-Token im Code.
- `domain/cameraController.ts`s `captureSnapshot()` holt den rohen Kamera-Snapshot serverseitig und liefert dem Frontend ausschließlich eine `data:${contentType};base64,...`-Data-URI über den EventBus — die rohe Kamera-URL wird dem Client **nie** offengelegt.
- Snapshot-Pipeline: 30s Cooldown pro Kamera (`SNAPSHOT_COOLDOWN_MS`), 1 Retry (`SNAPSHOT_MAX_RETRIES`), Abruf via `axios` als `arraybuffer`, Validierung über `content-type` beginnend mit `image/`. Nie auf Disk persistiert.
- **Direkter Sicherheitsfix gegenüber Altskript** `AlarmSystem_-_PerimeterKeeper_VII.json`, das Telegram-Bot-Token, Chat-IDs und Kamera-Snapshot-Passwörter (Reolink `user=admin&password=...`) hart im Quellcode hatte (siehe `docs/LEGACY_PARITY.md` Eintrag 23).

---

## 11. Legacy-Parität

`docs/LEGACY_PARITY.md` (vollständig, 119 Zeilen) — alle 23 Altskripte aus `AlarmSystem/old scripts/` einzeln auf neue Module gemappt:
- **20 Skripte** `Abgedeckt`/`Stabilisiert` (funktional äquivalent oder robuster, Event-/FSM-getrieben statt Polling-basiert)
- **2 Skripte** bewusst `Nicht übernommen`: `AlarmCenter_-_PDLC_control` (Tuya-Privacy-Glas), `AlarmCenter_GarageDoorControl` (PIN-Pad-Torsteuerung) — keine Alarmfunktion im engeren Sinn, nicht Teil der 10 Adapter-Seiten
- Kategorien: `Abgedeckt` (direkt umgesetzt), `Stabilisiert` (gleiche Funktion, robuster — kein Polling/Race Conditions mehr), `Nicht übernommen`

Detaillierte 1:1-Zuordnung je Skript siehe Originaldatei.

---

## 12. Weiterarbeit — Empfohlene nächste Schritte

Priorisiert nach Aufwand/Nutzen, keine Reihenfolge-Pflicht:
1. Alarm-/Countdown-Event-Lücke schließen (Abschnitt 5/9 Punkt 1) — Voraussetzung für funktionierenden Sirenen-Countdown in Produktion.
2. `ruleTrace`-Konsumenten im Frontend bauen (z.B. Debug-Ansicht in `LogikScreen`) oder bewusst als „nicht benötigt" verwerfen und aus dem `ServerMessage`-Typ entfernen.
3. `PlaceholderScreen.tsx` löschen (toter Code).
4. Floorplan-Feature entweder umsetzen oder aus dem Plan-Dokument als „verworfen" markieren.
5. Frontend-/Backend-Typen synchronisieren (gemeinsames Package oder Codegen), um Drift zu vermeiden.

---

## 13. Quick-Reference für Änderungen

| Ich will ändern... | Datei(en) |
|---|---|
| Zonen-Hierarchie-Logik | `adapter/src/core/zoneEngine.ts` |
| Neue Regel-Bedingung/Aktion-Typen | `adapter/src/config/types.ts` + `frontend/src/types/logic.ts` (beide!) |
| REST-Endpunkt hinzufügen | `adapter/src/api/restRoutes.ts` |
| WebSocket-Nachrichtentyp | `adapter/src/api/types.ts` (`ServerMessage`) + `statePushWs.ts` |
| Neuen Datenpunkt-Typ/Kategorie | `adapter/src/config/types.ts` (`DatapointConfig`) + `frontend/src/types/domain.ts` |
| Neue Frontend-Seite | `frontend/src/screens/`, `frontend/src/navigation/DrawerNavigator.tsx` |
| Telegram-Nachrichtenformat | `adapter/src/domain/telegram.ts`, `config.telegramTemplates` |
| Kamera-Snapshot-Verhalten | `adapter/src/domain/cameraController.ts` (`SNAPSHOT_COOLDOWN_MS`, `SNAPSHOT_MAX_RETRIES`) |
| Tag/Nacht-Schwellenwerte | `adapter/src/domain/dayNightScheduler.ts`, `adapter/src/core/sunCalc.ts` |
| AlarmCenter-Panel-Mapping | `adapter/src/domain/alarmCenterBridge.ts`, `AlarmCenterMapping`-Typ |
| Deploy | `projects/coding/CLAUDE.md` Abschnitt „ioBroker-Adapter deployen" |
