# Legacy Parity Matrix (23/23)

Statusziel: Alle 23 ursprünglichen ioBroker-JavaScript-Skripte aus `AlarmSystem/old scripts/` sind im neuen Adapter (`housesecurityalarm`) funktional abgebildet.

Kategorien:
- `Abgedeckt`: direkt im Adapter umgesetzt
- `Stabilisiert`: gleiche Funktion, aber robuster umgesetzt (weniger Race/Polling)
- `Nicht übernommen`: bewusst außerhalb Scope (keine Alarmfunktion im engeren Sinn)

Hinweis: Der neue Adapter ist ein Clean-Room-Neubau (eigene Architektur, eigene Modulnamen) — keine Code-Übernahme aus `AlarmSystem`, nur dieses Dokumentformat wurde als Vorlage übernommen.

## AlarmCenter

1. `AlarmCenter.json` (Channel-Struktur)
- Status: `Abgedeckt`
- Mapping: reines Organisations-Objekt ohne Funktionslogik; entspricht dem `alarmcenter.*`-Zweig im Objektbaum (`adapter/src/objects/objectTree.ts`).

2. `AlarmCenter_-_BuzzerWarning_when_leaving_house_and_a_door_is_open`
- Status: `Stabilisiert`
- Mapping: `core/ruleEvaluator.ts` (ConditionGroup: Zieltür öffnet AND weitere Tür/Fenster offen) → `RuleAction{type:'setState'}` auf Buzzer-Datenpunkt via `domain/alarmCenterBridge.ts`. Die 400ms-Race im Altskript entfällt durch synchrone Regelauswertung in `main.ts` (`runRules()`).

3. `AlarmCenter_-_DoorbellFingerprint_match_deactivates_alarm_IV`
- Status: `Abgedeckt`
- Mapping: `domain/alarmCenterBridge.ts` (`isFingerprintState`/`handleFingerprintMatch`, aufgerufen aus `main.ts` `onStateChange`) → `zoneEngine.disarm()`. Bekannten-Liste über `config.alarmCenterMapping`/Datenpunkt-Registry statt hartcodiertem Namens-Array.

4. `AlarmCenter_-_PDLC_control`
- Status: `Nicht übernommen`
- Mapping: keine Entsprechung — PIN-Pad-Sequenzsteuerung für Tuya-Privacy-Glas ist keine Alarmfunktion und nicht Teil der 10 Adapter-Seiten; bleibt vorerst im Altsystem.

5. `AlarmCenter_ActivateAlarmCountdown_(PerimeterProtection)`
- Status: `Abgedeckt`
- Mapping: `core/zoneEngine.ts` (Übergang in Modus `perimeter`) + `core/ruleEvaluator.ts` mit `scopeModes:['perimeter']`; Türsensor-Bedingungen als `config.rules`.

6. `AlarmCenter_ActivateAlarmCountdown_(SystemArmed)`
- Status: `Abgedeckt`
- Mapping: wie 5, aber `scopeModes:['vollschutz']`; Motion-Datenpunkte zusätzlich über `core/sensorAggregator.ts` (Zone `innenraum`).

7. `AlarmCenter_ActivateSiren_II`
- Status: `Stabilisiert`
- Mapping: zentrale Countdown-/Sirenen-Logik jetzt in `core/zoneEngine.ts` (`countdown.active`/`countdown.remainingSec` → `alarm.active`) statt Skript-lokaler `setInterval`-Beep-Schleife; Abbruch bei Entschärfen während Countdown ist strukturell durch FSM-Guards garantiert statt über gespiegelte `prevAlarmSystemArmed`/`prevPerimeterProtection`-Variablen.

8. `AlarmCenter_AlarmMessage_Telegram`
- Status: `Abgedeckt`
- Mapping: `domain/telegram.ts` (`notifyByTemplateId`) getriggert per `RuleAction{type:'telegram'}` aus `core/ruleEvaluator.ts` bei `alarm.active`; kein rekursives 60s-`setTimeout`-Polling mehr, sondern einmaliger Event-getriebener Versand.

9. `AlarmCenter_AlarmTrigger`
- Status: `Abgedeckt`
- Mapping: `alarm.triggerReason`/`.triggerZone`/`.triggerDatapoint`/`.triggerTs` im Objektbaum, befüllt durch `core/sensorAggregator.ts` beim ersten auslösenden Datenpunkt; feste Sensor-Namens-Zuordnung ersetzt durch `config.datapointRegistry`-Label.

10. `AlarmCenter_Display`
- Status: `Stabilisiert`
- Mapping: `domain/alarmCenterBridge.ts` (`displayStateId`) + `domain/dayNightScheduler.ts` für Datum/Zeit-Fallback; Warteschlangen-Logik über offene Türen ist `sensorAggregator`-Event-getrieben statt Skript-lokaler Queue mit Polling-Anteil.

11. `AlarmCenter_GarageDoorControl`
- Status: `Nicht übernommen`
- Mapping: keine Entsprechung — PIN-Pad-Torsteuerung ist keine Alarmfunktion im engeren Sinn und nicht Teil der 10 Adapter-Seiten; bleibt vorerst im Altsystem.

12. `AlarmCenter_LED_s`
- Status: `Stabilisiert`
- Mapping: `core/sensorAggregator.ts` (`subscribeForeignStatesAsync`-Listener statt 1s-Polling-Schleife) + `domain/alarmCenterBridge.ts` (`ledRedStateId`/`ledYellowStateId`).

13. `AlarmCenter_PerimeterProtection_at_bedtime_II`
- Status: `Abgedeckt`
- Mapping: `domain/dayNightScheduler.ts` (Astro + Helligkeitsschwelle) kombiniert mit `domain/presenceTracker.ts` (Anwesenheit) → `zoneEngine.armPerimeter()` + `domain/telegram.ts`-Benachrichtigung; Zeitplan über `config.dayNight` statt Cron-String im Skript.

14. `AlarmCenter_StandBy_(if_no_motion)`
- Status: `Stabilisiert`
- Mapping: `core/sensorAggregator.ts` Motion-Debounce; redundanter Sicherheitsnetz-Poll-Check entfällt, da Event-Reihenfolge durch zentralen `core/eventBus.ts` konsistent garantiert ist.

15. `AlarmCenter_Status`
- Status: `Abgedeckt`
- Mapping: reiner UI-Rendering-Bedarf — im Frontend (`screens/Overview`, `screens/AlarmCenter`) direkt aus Live-States via WebSocket abgeleitet statt serverseitig vorformatiertem Status-Text-State.

16. `AlarmCenter_armWhenNobody_sAtHome`
- Status: `Abgedeckt`
- Mapping: `domain/presenceTracker.ts` (`presence.confirmed`) → verzögertes `zoneEngine.armVollschutz()` + `domain/telegram.ts`-Ankündigung.

17. `AlarmCenter_beepsWhenDoorOpens`
- Status: `Stabilisiert`
- Mapping: `core/ruleEvaluator.ts` (`RuleAction{type:'setState'}` auf Buzzer-Datenpunkt); struktureller Bug des Altskripts (Reset-Timeout feuert durch Klammerfehler außerhalb des eigentlichen Gates) entfällt durch klare, zustandslose Regelauswertung.

18. `AlarmCenter_check_doors_before_arming`
- Status: `Stabilisiert`
- Mapping: `core/sensorAggregator.ts` (Event-getrieben) + Indikator-States über `domain/alarmCenterBridge.ts`; die 3s-Polling-Schleife des Altskripts entfällt vollständig.

19. `AlarmCenter_confirm_perimeter_protection`
- Status: `Abgedeckt`
- Mapping: `domain/alarmCenterBridge.ts` (Buzzer-/Display-Bestätigung) getriggert durch das `zoneEngine`-Moduswechsel-Event statt einer State-Change-Listener-Kette mit mehreren Timeouts.

20. `AlarmCenter_reset_human_detection`
- Status: `Abgedeckt`
- Mapping: `domain/cameraController.ts` (Detection-Normalisierung inkl. Cooldown-Reset) ersetzt das 5.5s-`setTimeout`-Reset-Pattern durch einen definierten Cooldown pro Kamera-Datenpunkt in `config.datapointRegistry`.

## AlarmSystem

21. `AlarmSystem_-_Camera_&_AlarmCenter_Connection`
- Status: `Abgedeckt`
- Mapping: `zones.perimeterActive`/`.aussenhautActive`/`.innenraumActive` als abgeleitete States in `core/zoneEngine.ts` lösen das Null-vs-false-Startup-Problem strukturell (nie `null`-initialisiert); `domain/cameraController.ts` übernimmt die CCTV-Alarm-Kopplung inkl. Tag/Nacht-Flashlight-Trigger via `domain/dayNightScheduler.ts` statt eigener Astro-Berechnung im Skript.

22. `AlarmSystem_-_PANIC_II`
- Status: `Abgedeckt`
- Mapping: `core/zoneEngine.ts` führt `alarm.panicActive` als expliziten FSM-Zustand statt Skript-lokalem State-Listener; `domain/cameraController.ts` steuert Kamera-Alarm-Flags und Reolink-Sirenen zentral über dieselbe Kamera-Registry wie alle anderen Domain-Module (keine duplizierte Datenpunkt-Liste).

23. `AlarmSystem_-_PerimeterKeeper_VII`
- Status: `Stabilisiert`
- Mapping: `domain/cameraController.ts` (Snapshot-Loop pro Kamera, Cooldown, Retry) + `domain/dayNightScheduler.ts` (Astro-Nachtmodus) + `domain/telegram.ts` (Foto-Versand).
- **Sicherheitsfix ggü. Altskript**: `AlarmSystem_-_PerimeterKeeper_VII.json` hat Telegram-Bot-Token, Chat-IDs und Kamera-Snapshot-Passwörter (Reolink `user=admin&password=...`) hart im Quellcode stehen. Im neuen Adapter werden Telegram-Nachrichten ausschließlich über `adapter.sendTo('telegram.x', 'send', { text })` ohne eigenen Bot-Token gesendet, und Kamera-Snapshot-URLs/Zugangsdaten liegen ausschließlich in der verschlüsselten Adapter-Config (`config.datapointRegistry[].cameraCapabilities`) — nie im Code. `captureSnapshot()` liefert dem Frontend ausschließlich Base64-Data-URIs; die rohe Kamera-URL wird dem Client nie offengelegt.

---

## Sichtbare WENN/DANN-Logik im Adapter
- `housesecurityalarm.0.config.rules` (JSON, `LogicRule[]`)
- Frontend-Editor: `screens/Logic` (ConditionGroupEditor)

## Hinweise
- Mehrere Alt-Skripte enthielten bewusst unstabile Patterns (Polling-Schleifen, mehrfache Listener auf denselben State, Race Conditions bei Countdown-Abbruch). Im neuen Adapter wurden diese gleich funktional, aber Event-/FSM-getrieben und ohne Polling umgesetzt.
- `AlarmSystem_-_PerimeterKeeper_VII.json` enthielt hartcodierte Zugangsdaten (Telegram-Token, Chat-IDs, Kamera-Passwörter) — im neuen Adapter vollständig aus der verschlüsselten Adapter-Config bzw. `sendTo('telegram.x', ...)` bezogen, nie im Code oder Frontend sichtbar.
- Zwei Skripte (`AlarmCenter_-_PDLC_control`, `AlarmCenter_GarageDoorControl`) sind PIN-Pad-Steuerungen für Glas/Garage ohne Alarmfunktion im engeren Sinn und bewusst nicht Teil dieses Adapters.
