# Grundriss-Designer — Stand & Fortsetzungs-Referenz

> Diese Datei existiert, damit nach einem Context-`/clear` ohne erneutes Reverse-Engineering
> weitergearbeitet werden kann. Bei jedem abgeschlossenen Teilschritt aktualisieren.
> Plan-Datei (Ursprungsquelle): `~/.claude/plans/playful-tickling-squirrel.md`

## Auftrag

Der bisherige abstrakte Prozent-Rechteck-Floorplan-Editor (`FloorplanScreen.tsx`) wird durch
den echten SVG-Vektor-Grundrissdesigner aus dem AlarmSystem-Adapter ersetzt ("genau so"):
Wände zeichnen, Außenhaut/Perimeter markieren, ~21 Objekttypen platzieren, Sensor/Aktor-Bindung,
Snap-to-Grid, Zoom/Pan, Undo, EG/OG, optionales Hintergrundbild, Publish/Lock.

Zusätzlich: Migration des bereits im (deaktivierten) AlarmSystem-Adapter existierenden realen
Grundrisses (132 Objekte, 68 Wände, 11 Sensor-Bindungen) nach HouseSecurityAlarmAdapter.

Bewusste, eng begrenzte Ausnahme von der "Clean-Room-Neubau ohne Code-Import"-Regel
(Projekt-CLAUDE.md) — reine UI/Datenmodell-Replikation auf explizitem Nutzerwunsch.

## Quelle der Wahrheit (Referenz-Implementierung)

`AlarmSystem/admin/webui/app.js` (read-only, kein Import, nur Vorlage):
- Zeilen 1185-1264: `defaultLayout()`, `defaultDesignerFloor()`, `defaultDesignerView()`
- Zeilen 3440-3739: `defaultDesignerItemSpec` (3440), `canonicalDesignerItemType`,
  `cameraAnchorToLocal` (3479)/`cameraAnchorFromLocal` (3491), `normalizeDesignerItems`,
  `svgForDesignerItem` (3545-3739, vollständig inkl. `controls`-Handles-Block ab 3714)
- Zeilen 3730-3818: Wand-Finalisierung (`linkWallBetweenBeams`)
- Zeilen 4040-4149: Pointer/Tool-Handler (`select`/`wall`/`perimeter`/`outer`)
- Zeilen ~3010-3090: `bindSelectedEntityToSelectedDesignerItem`, `itemAlarmTypeForEntityKind`

## Datenmodell (final, siehe Plan-Datei für vollständigen TS-Code)

```
FloorplanItem   { id, type, x, y, r, w, h, mirrorX, coverageAnchor?, alarmBindingType?, alarmBindingKey?, alarmBindingId? }
FloorplanWall   { id, points[], autoBeamLink?, beamAId?, beamBId? }
FloorplanFloor  { items[], walls[], outerWallIds[], perimeter|null, nextId, lastBeamItemId }
FloorplanFloorView { showBg, useInOverviewOnly, workspaceScale, bgOffsetX, bgOffsetY }
FloorplanDesignerData { version, EG: FloorplanFloor, OG: FloorplanFloor, settings: { snap, grid, floorView: {EG,OG}, showSensorsPreview } }
FloorplanImagesConfig { egImageDataUri, ogImageDataUri, published }
```

21 Item-Typen + `beam`: door, window, garagedoor, garage, pavingDriveway, pavingTerrace,
cameraZone, pirZone, stairs, wc, washbasin, bathtub, shower, sink, kitchen, stove, cabinet,
sofa, tableRect, tableRound, chair.

Default-Größen: door 48×48, window 62×24, garagedoor 150×34, garage 150×70,
pavingDriveway 220×120, pavingTerrace 180×110, cameraZone 180×110, pirZone 140×90,
stairs 160×56, wc 42×34, washbasin 54×36, bathtub 130×54, shower 72×72, sink 88×42,
kitchen 160×60, stove 70×50, cabinet 80×40, sofa 110×56, tableRound 96×96, tableRect 130×78,
chair 28×28, beam 22×22.

Bindungs-Typkonstraint: `pir`→nur `pirZone`, `camera`→nur `cameraZone`,
`contact`→nur `door`/`window`/`garagedoor`/`garage`.

## Reale Migrationsdaten (bereits extrahiert)

- Quelle: `system.adapter.alarmsystem.0.native.*` auf dem Pi (192.168.44.31), Instanz disabled,
  Config aber intakt.
- Lokal gesichert: `.migration-data/alarmsystem_native.json` im Projektroot (gitignored, NICHT committen).
  Falls Datei fehlt, per
  `ssh -i ~/.ssh/id_ed25519_iobroker sebastian@192.168.44.31 "iobroker object get system.adapter.alarmsystem.0"`
  neu ziehen.
- `native.floorplanDesignerJson`: EG 60 Items/30 Wände/21 outerWallIds/perimeter{x:55,y:56,w:1296,h:927}/nextId:106;
  OG 72 Items/38 Wände/21 outerWallIds/gleiches perimeter/nextId:165.
- `native.floorplanEgImage` = `"./assets/EG.jpg"`, `native.floorplanOgImage` = `"./assets/OG.jpg"`
  → Dateien liegen unter `AlarmSystem/admin/webui/assets/EG.jpg` / `OG.jpg`, müssen als
  Base64-Data-URI migriert werden.
- `native.floorplanDesignerPublished` = `true`.
- 11 Sensor/Kamera-Bindungen (`alarmBindingType`/`Key`/`Id`) — alle auf EG.
- `native.floorLayoutsJson` (separates Legacy-Format `defaultLayout()`) — NICHT Teil dieser
  Migration (geringere Priorität, nicht der primäre Designer).

## Fortschritts-Checkliste

### Backend
- [x] `adapter/src/config/types.ts` — neues Datenmodell, alte `FloorplanRoom`/`FloorplanConfig` entfernt
- [x] `adapter/src/config/defaults.ts` — `DEFAULT_FLOORPLAN_DESIGNER`, `DEFAULT_FLOORPLAN_IMAGES`
- [x] `adapter/src/objects/objectTree.ts` — `config.floorplanDesigner` + `config.floorplanImages` States
- [x] `adapter/src/api/restRoutes.ts` — `/floorplan/designer` + `/floorplan/images` Routen
- [x] `npm run build` grün

### Frontend
- [x] Dependencies: `react-native-svg`, `expo-image-picker`
- [x] `frontend/src/types/domain.ts` — Datenmodell gespiegelt
- [x] `frontend/src/screens/floorplan/floorplanItemIcons.tsx`
- [x] `frontend/src/hooks/useFloorplanDesigner.ts`
- [x] `frontend/src/screens/floorplan/FloorplanCanvas.tsx`
- [x] `frontend/src/screens/floorplan/FloorplanToolbar.tsx`
- [x] `frontend/src/screens/floorplan/FloorplanBindingPanel.tsx`
- [x] `frontend/src/screens/floorplan/FloorplanSettingsPanel.tsx`
- [x] `frontend/src/screens/FloorplanScreen.tsx` neu zusammengesetzt
- [x] `npx tsc --noEmit` grün

### Migration
- [ ] `floorplanDesignerJson` → `config.floorplanDesigner` auf Produktivinstanz geschrieben
- [ ] EG.jpg/OG.jpg → Base64 → `config.floorplanImages` geschrieben
- [ ] 11 gebundene Items → fehlende `DatapointConfig`-Einträge angelegt
- [ ] `GET /floorplan/designer` liefert migrierte Daten auf Produktivinstanz

### Verifikation
- [ ] Dev-Server manueller Test (Wand zeichnen, Item platzieren, Sensor binden, Undo, EG/OG, Hintergrundbild, Publish)
- [ ] Realer Grundriss lädt/rendert korrekt inkl. Live-Highlight
- [ ] Production-Build deployed, Rauchtest gegen Port 8110
