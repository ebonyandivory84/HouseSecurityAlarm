import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { ScrollView, View } from "react-native";
import Svg, { Circle, G, Image as SvgImage, Line, Polyline, Rect } from "react-native-svg";
import type { FloorplanFloor, FloorplanFloorView, FloorplanItem, FloorplanItemType, FloorplanPoint, FloorplanWall } from "@/types/domain";
import { palette } from "@/theme/palette";
import {
  FloorplanItemIcon,
  cameraAnchorFromLocal,
  cameraAnchorToLocal,
  canonicalDesignerItemType,
  itemSupportsResize,
  resolveFloorplanItemSize,
} from "./floorplanItemIcons";

export type FloorplanTool = "select" | "place" | "wall" | "perimeter" | "outer";

export type FloorplanSelection = { kind: "item"; id: number } | { kind: "wall"; id: number } | null;

export interface FloorplanCanvasHandle {
  finishWall: () => void;
  cancelWall: () => void;
}

export interface FloorplanCanvasProps {
  floor: FloorplanFloor;
  floorView: FloorplanFloorView;
  backgroundImageUri: string | null;
  snap: boolean;
  grid: number;
  tool: FloorplanTool;
  placeItemType: FloorplanItemType | null;
  selection: FloorplanSelection;
  onSelectionChange: (selection: FloorplanSelection) => void;
  onFloorChange: (updater: (floor: FloorplanFloor) => FloorplanFloor) => void;
  onItemPlaced?: () => void;
  alarmActiveBindingIds?: ReadonlySet<string>;
}

const WORKSPACE_BASE_W = 1000;
const WORKSPACE_BASE_H = 700;
const WALL_OFFSET = 4;
const WALL_HIT_DISTANCE = 14;
const DOOR_GAP_PAD = 4;
const DOOR_SNAP_DISTANCE = 60;
const OUTER_TOGGLE_DISTANCE = 24;
const HANDLE_R = 9;
const MOVE_THRESHOLD = 3;
const WALL_CLOSE_DISTANCE = 16;
const MIN_ITEM_SIZE = 12;

type Corner = "nw" | "ne" | "sw" | "se";

const CORNER_LOCAL: Record<Corner, { sx: number; sy: number }> = {
  nw: { sx: -1, sy: -1 },
  ne: { sx: 1, sy: -1 },
  sw: { sx: -1, sy: 1 },
  se: { sx: 1, sy: 1 },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalizedWorkspaceScale(v: number | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return clamp(n, 0.5, 3);
}

export function workspaceFromScale(scaleRaw: number | undefined) {
  const scale = normalizedWorkspaceScale(scaleRaw);
  const w = Math.round(WORKSPACE_BASE_W * scale);
  const h = Math.round(WORKSPACE_BASE_H * scale);
  return {
    scale,
    w,
    h,
    bgX: Math.round((w - WORKSPACE_BASE_W) / 2),
    bgY: Math.round((h - WORKSPACE_BASE_H) / 2),
    bgW: WORKSPACE_BASE_W,
    bgH: WORKSPACE_BASE_H,
  };
}

function normalizeAngleDeg(v: number): number {
  let a = Number(v) || 0;
  while (a <= -180) a += 360;
  while (a > 180) a -= 360;
  return a;
}

function snapRightAngleDeg(v: number): number {
  return normalizeAngleDeg(Math.round((Number(v) || 0) / 90) * 90);
}

function snapValue(v: number, grid: number, snap: boolean): number {
  const g = Math.max(4, grid || 12);
  return snap ? Math.round(v / g) * g : v;
}

function snapPointEdgeBand(v: number, max: number, grid: number, snap: boolean): number {
  const band = Math.max(4, grid || 12) / 2;
  if (v <= band) return 0;
  if (v >= max - band) return max;
  return snapValue(v, grid, snap);
}

function rotatedPoint(center: FloorplanPoint, local: FloorplanPoint, rDeg: number): FloorplanPoint {
  const rad = (rDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: center.x + local.x * cos - local.y * sin, y: center.y + local.x * sin + local.y * cos };
}

function inverseRotatedLocal(center: FloorplanPoint, p: FloorplanPoint, rDeg: number): FloorplanPoint {
  const rad = (-rDeg * Math.PI) / 180;
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function angleFromCenter(center: FloorplanPoint, p: FloorplanPoint): number {
  return (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
}

interface SegProjection {
  d: number;
  t: number;
  x: number;
  y: number;
  len: number;
}

function projectPointToSegment(px: number, py: number, a: FloorplanPoint, b: FloorplanPoint): SegProjection {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let t = ((px - a.x) * dx + (py - a.y) * dy) / (len * len);
  t = clamp(t, 0, 1);
  const x = a.x + dx * t;
  const y = a.y + dy * t;
  const d = Math.hypot(px - x, py - y);
  return { d, t, x, y, len };
}

interface NearestWallResult {
  wallId: number;
  segIdx: number;
  a: FloorplanPoint;
  b: FloorplanPoint;
  t: number;
  x: number;
  y: number;
  d: number;
  len: number;
  angleDeg: number;
}

function nearestWallSegment(floor: FloorplanFloor, p: FloorplanPoint, maxDistance = Infinity): NearestWallResult | null {
  let best: NearestWallResult | null = null;
  for (const wall of floor.walls) {
    const pts = wall.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const proj = projectPointToSegment(p.x, p.y, a, b);
      if (proj.d > maxDistance) continue;
      if (!best || proj.d < best.d) {
        const angleDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        best = { wallId: wall.id, segIdx: i, a, b, t: proj.t, x: proj.x, y: proj.y, d: proj.d, len: proj.len, angleDeg };
      }
    }
  }
  return best;
}

function snapDoorToWall(item: FloorplanItem, floor: FloorplanFloor): FloorplanItem {
  const hit = nearestWallSegment(floor, { x: item.x, y: item.y }, DOOR_SNAP_DISTANCE);
  if (!hit) return item;
  return { ...item, x: hit.x, y: hit.y, r: snapRightAngleDeg(hit.angleDeg) };
}

function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      out.push([sorted[i][0], sorted[i][1]]);
    }
  }
  return out;
}

function complementIntervals(merged: [number, number][], len: number): [number, number][] {
  const out: [number, number][] = [];
  let cursor = 0;
  for (const [from, to] of merged) {
    if (from > cursor) out.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor < len) out.push([cursor, len]);
  return out;
}

function segmentPointAtDist(a: FloorplanPoint, b: FloorplanPoint, dist: number, len: number): FloorplanPoint {
  const t = len ? dist / len : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function doorGapsByWallSegment(floor: FloorplanFloor): Map<string, [number, number][]> {
  const raw = new Map<string, [number, number][]>();
  for (const item of floor.items) {
    const type = canonicalDesignerItemType(item.type);
    if (type !== "door" && type !== "garagedoor") continue;
    const hit = nearestWallSegment(floor, { x: item.x, y: item.y }, DOOR_SNAP_DISTANCE);
    if (!hit) continue;
    const halfW = Math.max(item.w, item.h) / 2;
    const distAlong = hit.t * hit.len;
    const key = `${hit.wallId}:${hit.segIdx}`;
    const list = raw.get(key) ?? [];
    list.push([Math.max(0, distAlong - halfW - DOOR_GAP_PAD), Math.min(hit.len, distAlong + halfW + DOOR_GAP_PAD)]);
    raw.set(key, list);
  }
  const merged = new Map<string, [number, number][]>();
  for (const [key, list] of raw) merged.set(key, mergeIntervals(list));
  return merged;
}

function renderWallSegments(floor: FloorplanFloor, outerWallIds: Set<number>): React.ReactNode[] {
  const gapsByKey = doorGapsByWallSegment(floor);
  const nodes: React.ReactNode[] = [];
  for (const wall of floor.walls) {
    const isOuter = outerWallIds.has(wall.id);
    const stroke = isOuter ? palette.zoneAussenhaut : "#4a5872";
    const pts = wall.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const key = `${wall.id}:${i}`;
      const gaps = gapsByKey.get(key) ?? [];
      const keep = complementIntervals(gaps, len);
      keep.forEach(([from, to], segI) => {
        const p0 = segmentPointAtDist(a, b, from, len);
        const p1 = segmentPointAtDist(a, b, to, len);
        nodes.push(
          <Line
            key={`${key}-${segI}-a`}
            x1={p0.x + nx * WALL_OFFSET}
            y1={p0.y + ny * WALL_OFFSET}
            x2={p1.x + nx * WALL_OFFSET}
            y2={p1.y + ny * WALL_OFFSET}
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
        nodes.push(
          <Line
            key={`${key}-${segI}-b`}
            x1={p0.x - nx * WALL_OFFSET}
            y1={p0.y - ny * WALL_OFFSET}
            x2={p1.x - nx * WALL_OFFSET}
            y2={p1.y - ny * WALL_OFFSET}
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      });
    }
  }
  return nodes;
}

function buildGridLines(ws: { w: number; h: number }, grid: number): React.ReactNode[] {
  const g = Math.max(4, grid || 12);
  if (ws.w / g > 150 || ws.h / g > 150) return [];
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= ws.w; x += g) {
    lines.push(<Line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={ws.h} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />);
  }
  for (let y = 0; y <= ws.h; y += g) {
    lines.push(<Line key={`gy-${y}`} x1={0} y1={y} x2={ws.w} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />);
  }
  return lines;
}

function createFloorplanItem(nextId: number, type: FloorplanItemType, x: number, y: number): FloorplanItem {
  const canon = canonicalDesignerItemType(type);
  const size = resolveFloorplanItemSize({ type: canon, w: 0, h: 0 });
  const item: FloorplanItem = { id: nextId, type: canon, x, y, r: 0, w: size.w, h: size.h, mirrorX: false };
  if (canon === "cameraZone" || canon === "pirZone") {
    item.coverageAnchor = { edge: "top", t: 0.5 };
  }
  return item;
}

function syncAutoBeamWalls(floor: FloorplanFloor): FloorplanFloor {
  const byId = new Map(floor.items.map((it) => [it.id, it]));
  let changed = false;
  const walls = floor.walls.map((wall) => {
    if (!wall.autoBeamLink || wall.beamAId == null || wall.beamBId == null) return wall;
    const a = byId.get(wall.beamAId);
    const b = byId.get(wall.beamBId);
    if (!a || !b) return wall;
    const p0 = wall.points[0];
    const p1 = wall.points[1];
    if (p0?.x === a.x && p0?.y === a.y && p1?.x === b.x && p1?.y === b.y) return wall;
    changed = true;
    return { ...wall, points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }] };
  });
  return changed ? { ...floor, walls } : floor;
}

function cornerWorldPos(orig: { x: number; y: number; w: number; h: number; r: number }, corner: Corner): FloorplanPoint {
  const local = CORNER_LOCAL[corner];
  return rotatedPoint({ x: orig.x, y: orig.y }, { x: (local.sx * orig.w) / 2, y: (local.sy * orig.h) / 2 }, orig.r);
}

function computeResizePreview(
  orig: { x: number; y: number; w: number; h: number; r: number; type: FloorplanItemType },
  corner: Corner,
  currentHandlePos: FloorplanPoint,
  snap: boolean,
  grid: number
): { x: number; y: number; w: number; h: number } {
  const rad = (orig.r * Math.PI) / 180;
  const ux = { x: Math.cos(rad), y: Math.sin(rad) };
  const uy = { x: -Math.sin(rad), y: Math.cos(rad) };
  const { sx, sy } = CORNER_LOCAL[corner];
  const oppositeLocal = { x: (-sx * orig.w) / 2, y: (-sy * orig.h) / 2 };
  const oppositeWorld = {
    x: orig.x + oppositeLocal.x * ux.x + oppositeLocal.y * uy.x,
    y: orig.y + oppositeLocal.x * ux.y + oppositeLocal.y * uy.y,
  };
  const vec = { x: currentHandlePos.x - oppositeWorld.x, y: currentHandlePos.y - oppositeWorld.y };
  const projX = vec.x * ux.x + vec.y * ux.y;
  const projY = vec.x * uy.x + vec.y * uy.y;
  let newW = Math.max(MIN_ITEM_SIZE, snapValue(Math.abs(projX), grid, snap));
  let newH = Math.max(MIN_ITEM_SIZE, snapValue(Math.abs(projY), grid, snap));
  if (orig.type === "tableRound" || orig.type === "door") {
    const side = Math.max(newW, newH);
    newW = side;
    newH = side;
  }
  const newCenter = {
    x: oppositeWorld.x + sx * (newW / 2) * ux.x + sy * (newH / 2) * uy.x,
    y: oppositeWorld.y + sx * (newW / 2) * ux.y + sy * (newH / 2) * uy.y,
  };
  return { x: newCenter.x, y: newCenter.y, w: newW, h: newH };
}

type DragState =
  | { kind: "item-move"; itemId: number; startPage: FloorplanPoint; preview: FloorplanItem }
  | {
      kind: "item-resize";
      itemId: number;
      corner: Corner;
      startPage: FloorplanPoint;
      orig: { x: number; y: number; w: number; h: number; r: number; type: FloorplanItemType };
      preview: FloorplanItem;
    }
  | { kind: "item-rotate"; itemId: number; center: FloorplanPoint; startPage: FloorplanPoint; handlePos: FloorplanPoint; origR: number; preview: FloorplanItem }
  | {
      kind: "item-anchor";
      itemId: number;
      center: FloorplanPoint;
      startPage: FloorplanPoint;
      handlePos: FloorplanPoint;
      w: number;
      h: number;
      r: number;
      preview: FloorplanItem;
    }
  | { kind: "wall-point"; wallId: number; pointIdx: number; startPage: FloorplanPoint; orig: FloorplanPoint; previewPoints: FloorplanPoint[] }
  | { kind: "wall-move"; wallId: number; startPage: FloorplanPoint; origPoints: FloorplanPoint[]; previewPoints: FloorplanPoint[] }
  | null;

export const FloorplanCanvas = forwardRef<FloorplanCanvasHandle, FloorplanCanvasProps>(function FloorplanCanvas(
  { floor, floorView, backgroundImageUri, snap, grid, tool, placeItemType, selection, onSelectionChange, onFloorChange, onItemPlaced, alarmActiveBindingIds },
  ref
) {
  const ws = useMemo(() => workspaceFromScale(floorView.workspaceScale), [floorView.workspaceScale]);
  const [drawingWallPoints, setDrawingWallPoints] = useState<FloorplanPoint[] | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [perimeterPreview, setPerimeterPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const dragMovedRef = useRef(false);
  const rootStartRef = useRef<FloorplanPoint>({ x: 0, y: 0 });
  const rootMovedRef = useRef(false);

  const mutateFloor = useCallback(
    (fn: (floor: FloorplanFloor) => FloorplanFloor) => {
      onFloorChange((f) => syncAutoBeamWalls(fn(f)));
    },
    [onFloorChange]
  );

  useImperativeHandle(
    ref,
    () => ({
      finishWall: () => {
        setDrawingWallPoints((pts) => {
          if (pts && pts.length >= 2) {
            mutateFloor((f) => ({ ...f, walls: [...f.walls, { id: f.nextId, points: pts }], nextId: f.nextId + 1 }));
          }
          return null;
        });
      },
      cancelWall: () => setDrawingWallPoints(null),
    }),
    [mutateFloor]
  );

  const handleRootGrant = useCallback(
    (evt: GestureResponderEvent) => {
      const p = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
      rootStartRef.current = p;
      rootMovedRef.current = false;
      if (tool === "perimeter") setPerimeterPreview({ x: p.x, y: p.y, w: 0, h: 0 });
    },
    [tool]
  );

  const handleRootMove = useCallback(
    (evt: GestureResponderEvent) => {
      const p = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
      const start = rootStartRef.current;
      if (Math.hypot(p.x - start.x, p.y - start.y) > MOVE_THRESHOLD) rootMovedRef.current = true;
      if (tool === "perimeter") {
        setPerimeterPreview({
          x: Math.min(start.x, p.x),
          y: Math.min(start.y, p.y),
          w: Math.abs(p.x - start.x),
          h: Math.abs(p.y - start.y),
        });
      }
    },
    [tool]
  );

  const handleRootRelease = useCallback(
    (evt: GestureResponderEvent) => {
      const p = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
      const wasTap = !rootMovedRef.current;

      if (tool === "perimeter") {
        setPerimeterPreview((preview) => {
          if (preview && preview.w > 8 && preview.h > 8) {
            const rect = {
              x: snapValue(preview.x, grid, snap),
              y: snapValue(preview.y, grid, snap),
              w: snapValue(preview.w, grid, snap),
              h: snapValue(preview.h, grid, snap),
            };
            mutateFloor((f) => ({ ...f, perimeter: rect }));
          }
          return null;
        });
        return;
      }

      if (!wasTap) return;

      const point: FloorplanPoint = {
        x: snapPointEdgeBand(p.x, ws.w, grid, snap),
        y: snapPointEdgeBand(p.y, ws.h, grid, snap),
      };

      if (tool === "select") {
        onSelectionChange(null);
        return;
      }

      if (tool === "place") {
        if (!placeItemType) return;
        mutateFloor((f) => {
          const id = f.nextId;
          let item = createFloorplanItem(id, placeItemType, point.x, point.y);
          let nextFloor: FloorplanFloor = { ...f, items: [...f.items, item], nextId: id + 1 };
          const canon = canonicalDesignerItemType(placeItemType);
          if (canon === "door" || canon === "garagedoor") {
            item = snapDoorToWall(item, nextFloor);
            nextFloor = { ...nextFloor, items: nextFloor.items.map((it) => (it.id === item.id ? item : it)) };
          }
          if (canon === "beam") {
            if (f.lastBeamItemId != null) {
              const beamA = f.items.find((it) => it.id === f.lastBeamItemId);
              if (beamA) {
                const wallId = nextFloor.nextId;
                nextFloor = {
                  ...nextFloor,
                  walls: [
                    ...nextFloor.walls,
                    {
                      id: wallId,
                      points: [{ x: beamA.x, y: beamA.y }, { x: item.x, y: item.y }],
                      autoBeamLink: true,
                      beamAId: beamA.id,
                      beamBId: item.id,
                    },
                  ],
                  nextId: wallId + 1,
                };
              }
            }
            nextFloor = { ...nextFloor, lastBeamItemId: item.id };
          }
          return nextFloor;
        });
        onItemPlaced?.();
        return;
      }

      if (tool === "wall") {
        setDrawingWallPoints((pts) => {
          if (pts && pts.length >= 3) {
            const first = pts[0];
            if (Math.hypot(point.x - first.x, point.y - first.y) < WALL_CLOSE_DISTANCE) {
              mutateFloor((f) => ({ ...f, walls: [...f.walls, { id: f.nextId, points: pts }], nextId: f.nextId + 1 }));
              return null;
            }
          }
          return [...(pts ?? []), point];
        });
        return;
      }

      if (tool === "outer") {
        const hit = nearestWallSegment(floor, point, OUTER_TOGGLE_DISTANCE);
        if (!hit) return;
        mutateFloor((f) => {
          const has = f.outerWallIds.includes(hit.wallId);
          return { ...f, outerWallIds: has ? f.outerWallIds.filter((id) => id !== hit.wallId) : [...f.outerWallIds, hit.wallId] };
        });
      }
    },
    [tool, placeItemType, grid, snap, ws, floor, mutateFloor, onSelectionChange, onItemPlaced]
  );

  const handleDragMove = useCallback(
    (evt: GestureResponderEvent) => {
      setDrag((d) => {
        if (!d) return d;
        const page = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        const dx = page.x - d.startPage.x;
        const dy = page.y - d.startPage.y;
        if (Math.hypot(dx, dy) > MOVE_THRESHOLD) dragMovedRef.current = true;

        if (d.kind === "item-move") {
          const item = floor.items.find((it) => it.id === d.itemId);
          if (!item) return d;
          const nx = snapValue(item.x + dx, grid, snap);
          const ny = snapValue(item.y + dy, grid, snap);
          let preview: FloorplanItem = { ...item, x: nx, y: ny };
          const canon = canonicalDesignerItemType(item.type);
          if (canon === "door" || canon === "garagedoor") preview = snapDoorToWall(preview, floor);
          return { ...d, preview };
        }

        if (d.kind === "item-resize") {
          const item = floor.items.find((it) => it.id === d.itemId);
          if (!item) return d;
          const handlePos = cornerWorldPos(d.orig, d.corner);
          const currentHandlePos = { x: handlePos.x + dx, y: handlePos.y + dy };
          const patch = computeResizePreview(d.orig, d.corner, currentHandlePos, snap, grid);
          return { ...d, preview: { ...item, ...patch, r: d.orig.r } };
        }

        if (d.kind === "item-rotate") {
          const item = floor.items.find((it) => it.id === d.itemId);
          if (!item) return d;
          const currentHandlePos = { x: d.handlePos.x + dx, y: d.handlePos.y + dy };
          const origAngle = angleFromCenter(d.center, d.handlePos);
          const currentAngle = angleFromCenter(d.center, currentHandlePos);
          const newR = snapRightAngleDeg(d.origR + (currentAngle - origAngle));
          return { ...d, preview: { ...item, r: newR } };
        }

        if (d.kind === "item-anchor") {
          const item = floor.items.find((it) => it.id === d.itemId);
          if (!item) return d;
          const currentHandlePos = { x: d.handlePos.x + dx, y: d.handlePos.y + dy };
          const local = inverseRotatedLocal(d.center, currentHandlePos, d.r);
          const anchor = cameraAnchorFromLocal(d.w, d.h, local.x, local.y);
          return { ...d, preview: { ...item, coverageAnchor: anchor } };
        }

        if (d.kind === "wall-point") {
          const wall = floor.walls.find((w) => w.id === d.wallId);
          if (!wall) return d;
          let current = { x: clamp(snapValue(d.orig.x + dx, grid, snap), 0, ws.w), y: clamp(snapValue(d.orig.y + dy, grid, snap), 0, ws.h) };
          if (wall.points.length === 2) {
            const anchor = wall.points[1 - d.pointIdx];
            current =
              Math.abs(current.x - anchor.x) >= Math.abs(current.y - anchor.y)
                ? { x: current.x, y: anchor.y }
                : { x: anchor.x, y: current.y };
          }
          const previewPoints = wall.points.map((pt, i) => (i === d.pointIdx ? current : pt));
          return { ...d, previewPoints };
        }

        if (d.kind === "wall-move") {
          const previewPoints = d.origPoints.map((pt) => ({
            x: clamp(snapValue(pt.x + dx, grid, snap), 0, ws.w),
            y: clamp(snapValue(pt.y + dy, grid, snap), 0, ws.h),
          }));
          return { ...d, previewPoints };
        }

        return d;
      });
    },
    [floor, grid, snap, ws]
  );

  const handleDragRelease = useCallback(() => {
    setDrag((d) => {
      if (!d) return null;
      if (dragMovedRef.current) {
        if (d.kind === "item-move" || d.kind === "item-resize" || d.kind === "item-rotate" || d.kind === "item-anchor") {
          mutateFloor((f) => ({ ...f, items: f.items.map((it) => (it.id === d.itemId ? d.preview : it)) }));
        } else if (d.kind === "wall-point" || d.kind === "wall-move") {
          mutateFloor((f) => ({ ...f, walls: f.walls.map((w) => (w.id === d.wallId ? { ...w, points: d.previewPoints } : w)) }));
        }
      }
      return null;
    });
  }, [mutateFloor]);

  const beginItemMove = useCallback(
    (id: number, evt: GestureResponderEvent) => {
      const item = floor.items.find((it) => it.id === id);
      if (!item) return;
      onSelectionChange({ kind: "item", id });
      if (tool !== "select") return;
      dragMovedRef.current = false;
      setDrag({ kind: "item-move", itemId: id, startPage: { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY }, preview: item });
    },
    [floor.items, tool, onSelectionChange]
  );

  const beginItemResize = useCallback(
    (id: number, corner: Corner, evt: GestureResponderEvent) => {
      const item = floor.items.find((it) => it.id === id);
      if (!item || tool !== "select") return;
      dragMovedRef.current = false;
      const orig = { x: item.x, y: item.y, w: item.w, h: item.h, r: item.r, type: canonicalDesignerItemType(item.type) };
      setDrag({ kind: "item-resize", itemId: id, corner, startPage: { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY }, orig, preview: item });
    },
    [floor.items, tool]
  );

  const beginItemRotate = useCallback(
    (id: number, evt: GestureResponderEvent) => {
      const item = floor.items.find((it) => it.id === id);
      if (!item || tool !== "select") return;
      dragMovedRef.current = false;
      const { h } = resolveFloorplanItemSize(item);
      const center = { x: item.x, y: item.y };
      const handlePos = rotatedPoint(center, { x: 0, y: -h / 2 - 30 }, item.r);
      setDrag({
        kind: "item-rotate",
        itemId: id,
        center,
        startPage: { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY },
        handlePos,
        origR: item.r,
        preview: item,
      });
    },
    [floor.items, tool]
  );

  const beginItemAnchor = useCallback(
    (id: number, evt: GestureResponderEvent) => {
      const item = floor.items.find((it) => it.id === id);
      if (!item || tool !== "select") return;
      dragMovedRef.current = false;
      const { w, h } = resolveFloorplanItemSize(item);
      const center = { x: item.x, y: item.y };
      const local = cameraAnchorToLocal(item, w, h);
      const handlePos = rotatedPoint(center, { x: local.x, y: local.y }, item.r);
      setDrag({
        kind: "item-anchor",
        itemId: id,
        center,
        startPage: { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY },
        handlePos,
        w,
        h,
        r: item.r,
        preview: item,
      });
    },
    [floor.items, tool]
  );

  const toggleItemMirror = useCallback(
    (id: number) => {
      mutateFloor((f) => ({ ...f, items: f.items.map((it) => (it.id === id ? { ...it, mirrorX: !it.mirrorX } : it)) }));
    },
    [mutateFloor]
  );

  const beginWallPointDrag = useCallback(
    (wallId: number, pointIdx: number, evt: GestureResponderEvent) => {
      const wall = floor.walls.find((w) => w.id === wallId);
      if (!wall) return;
      onSelectionChange({ kind: "wall", id: wallId });
      dragMovedRef.current = false;
      setDrag({
        kind: "wall-point",
        wallId,
        pointIdx,
        startPage: { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY },
        orig: wall.points[pointIdx],
        previewPoints: wall.points,
      });
    },
    [floor.walls, onSelectionChange]
  );

  const beginWallBodyDrag = useCallback(
    (wallId: number, evt: GestureResponderEvent) => {
      const wall = floor.walls.find((w) => w.id === wallId);
      onSelectionChange({ kind: "wall", id: wallId });
      if (!wall || tool !== "select") return;
      dragMovedRef.current = false;
      setDrag({
        kind: "wall-move",
        wallId,
        startPage: { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY },
        origPoints: wall.points,
        previewPoints: wall.points,
      });
    },
    [floor.walls, tool, onSelectionChange]
  );

  const effectiveFloor = useMemo(() => {
    if (!drag) return floor;
    if (drag.kind === "item-move" || drag.kind === "item-resize" || drag.kind === "item-rotate" || drag.kind === "item-anchor") {
      return { ...floor, items: floor.items.map((it) => (it.id === drag.itemId ? drag.preview : it)) };
    }
    if (drag.kind === "wall-point" || drag.kind === "wall-move") {
      return { ...floor, walls: floor.walls.map((w) => (w.id === drag.wallId ? { ...w, points: drag.previewPoints } : w)) };
    }
    return floor;
  }, [floor, drag]);

  const outerWallIdSet = useMemo(() => new Set(effectiveFloor.outerWallIds), [effectiveFloor.outerWallIds]);
  const wallSegmentNodes = useMemo(() => renderWallSegments(effectiveFloor, outerWallIdSet), [effectiveFloor, outerWallIdSet]);
  const gridLines = useMemo(() => (snap ? buildGridLines(ws, grid) : []), [snap, ws, grid]);

  const wallsNeedingHandles: FloorplanWall[] = useMemo(() => {
    if (tool === "wall") return effectiveFloor.walls;
    if (selection?.kind === "wall") return effectiveFloor.walls.filter((w) => w.id === selection.id);
    return [];
  }, [tool, selection, effectiveFloor.walls]);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <ScrollView showsVerticalScrollIndicator>
          <View style={{ width: ws.w, height: ws.h }}>
            <Svg width={ws.w} height={ws.h} viewBox={`0 0 ${ws.w} ${ws.h}`}>
              {backgroundImageUri && floorView.showBg && (
                <SvgImage
                  href={{ uri: backgroundImageUri }}
                  x={ws.bgX + floorView.bgOffsetX}
                  y={ws.bgY + floorView.bgOffsetY}
                  width={ws.bgW}
                  height={ws.bgH}
                  preserveAspectRatio="xMidYMid slice"
                  opacity={1}
                />
              )}
              {gridLines}
              <Rect
                x={0}
                y={0}
                width={ws.w}
                height={ws.h}
                fill="transparent"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleRootGrant}
                onResponderMove={handleRootMove}
                onResponderRelease={handleRootRelease}
                onResponderTerminate={handleRootRelease}
              />
              <G>{wallSegmentNodes}</G>

              {tool === "select" &&
                effectiveFloor.walls.map((wall) => (
                  <G key={`hit-${wall.id}`}>
                    {wall.points.slice(0, -1).map((pt, i) => {
                      const nxt = wall.points[i + 1];
                      return (
                        <Line
                          key={i}
                          x1={pt.x}
                          y1={pt.y}
                          x2={nxt.x}
                          y2={nxt.y}
                          stroke="rgba(0,0,0,0.001)"
                          strokeWidth={WALL_HIT_DISTANCE}
                          onStartShouldSetResponder={() => true}
                          onResponderGrant={(e) => beginWallBodyDrag(wall.id, e)}
                          onResponderMove={handleDragMove}
                          onResponderRelease={handleDragRelease}
                          onResponderTerminate={handleDragRelease}
                        />
                      );
                    })}
                  </G>
                ))}

              {drawingWallPoints && drawingWallPoints.length > 0 && (
                <>
                  <Polyline
                    points={drawingWallPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                    stroke={palette.accent}
                    strokeDasharray="4,4"
                    strokeWidth={2}
                    fill="none"
                  />
                  <Circle cx={drawingWallPoints[0].x} cy={drawingWallPoints[0].y} r={5} fill={palette.accent} />
                </>
              )}

              {effectiveFloor.perimeter && (
                <Rect
                  x={effectiveFloor.perimeter.x}
                  y={effectiveFloor.perimeter.y}
                  width={effectiveFloor.perimeter.w}
                  height={effectiveFloor.perimeter.h}
                  fill="none"
                  stroke={palette.zonePerimeter}
                  strokeDasharray="6,4"
                  strokeWidth={2}
                />
              )}
              {perimeterPreview && (
                <Rect
                  x={perimeterPreview.x}
                  y={perimeterPreview.y}
                  width={perimeterPreview.w}
                  height={perimeterPreview.h}
                  fill="rgba(77,163,255,0.08)"
                  stroke={palette.zonePerimeter}
                  strokeDasharray="4,3"
                  strokeWidth={1.5}
                />
              )}

              {effectiveFloor.items.map((item) => {
                const { w, h } = resolveFloorplanItemSize(item);
                const hw = w / 2;
                const hh = h / 2;
                const selected = selection?.kind === "item" && selection.id === item.id;
                const alarmActive = item.alarmBindingId ? Boolean(alarmActiveBindingIds?.has(item.alarmBindingId)) : false;
                const canon = canonicalDesignerItemType(item.type);
                const showResize = itemSupportsResize(canon);
                const showAnchor = canon === "cameraZone" || canon === "pirZone";
                const showMirror = canon === "door";
                const anchorLocal = showAnchor ? cameraAnchorToLocal(item, w, h) : null;

                return (
                  <G key={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.r})`}>
                    <FloorplanItemIcon item={item} alarmActive={alarmActive} />
                    <Rect
                      x={-hw}
                      y={-hh}
                      width={w}
                      height={h}
                      fill="rgba(0,0,0,0.001)"
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={(e) => beginItemMove(item.id, e)}
                      onResponderMove={handleDragMove}
                      onResponderRelease={handleDragRelease}
                      onResponderTerminate={handleDragRelease}
                    />
                    {selected && tool === "select" && (
                      <>
                        <Rect
                          x={-hw - 4}
                          y={-hh - 4}
                          width={w + 8}
                          height={h + 8}
                          fill="none"
                          stroke={palette.accent}
                          strokeDasharray="4,3"
                          strokeWidth={1.5}
                        />
                        {showResize &&
                          (["nw", "ne", "sw", "se"] as Corner[]).map((c) => {
                            const local = CORNER_LOCAL[c];
                            return (
                              <Circle
                                key={c}
                                cx={(local.sx * w) / 2}
                                cy={(local.sy * h) / 2}
                                r={HANDLE_R}
                                fill={palette.accent}
                                stroke="#fff"
                                strokeWidth={1}
                                onStartShouldSetResponder={() => true}
                                onResponderGrant={(e) => beginItemResize(item.id, c, e)}
                                onResponderMove={handleDragMove}
                                onResponderRelease={handleDragRelease}
                                onResponderTerminate={handleDragRelease}
                              />
                            );
                          })}
                        <Line x1={0} y1={-hh} x2={0} y2={-hh - 30} stroke={palette.accent} strokeWidth={1.5} />
                        <Circle
                          cx={0}
                          cy={-hh - 30}
                          r={HANDLE_R}
                          fill={palette.success}
                          stroke="#fff"
                          strokeWidth={1}
                          onStartShouldSetResponder={() => true}
                          onResponderGrant={(e) => beginItemRotate(item.id, e)}
                          onResponderMove={handleDragMove}
                          onResponderRelease={handleDragRelease}
                          onResponderTerminate={handleDragRelease}
                        />
                        {showAnchor && anchorLocal && (
                          <Circle
                            cx={anchorLocal.x}
                            cy={anchorLocal.y}
                            r={HANDLE_R}
                            fill={palette.warning}
                            stroke="#fff"
                            strokeWidth={1}
                            onStartShouldSetResponder={() => true}
                            onResponderGrant={(e) => beginItemAnchor(item.id, e)}
                            onResponderMove={handleDragMove}
                            onResponderRelease={handleDragRelease}
                            onResponderTerminate={handleDragRelease}
                          />
                        )}
                        {showMirror && (
                          <Circle
                            cx={hw + 16}
                            cy={0}
                            r={HANDLE_R}
                            fill={palette.textSecondary}
                            stroke="#fff"
                            strokeWidth={1}
                            onStartShouldSetResponder={() => true}
                            onResponderGrant={() => toggleItemMirror(item.id)}
                          />
                        )}
                      </>
                    )}
                  </G>
                );
              })}

              {wallsNeedingHandles.map((wall) => (
                <G key={`h-${wall.id}`}>
                  {wall.points.map((pt, i) => (
                    <Circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={HANDLE_R * 0.8}
                      fill={palette.accent}
                      stroke="#fff"
                      strokeWidth={1}
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={(e) => beginWallPointDrag(wall.id, i, e)}
                      onResponderMove={handleDragMove}
                      onResponderRelease={handleDragRelease}
                      onResponderTerminate={handleDragRelease}
                    />
                  ))}
                </G>
              ))}
            </Svg>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
});
