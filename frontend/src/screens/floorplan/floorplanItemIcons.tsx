import React from "react";
import {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import type { FloorplanCoverageAnchor, FloorplanItem, FloorplanItemType } from "../../types/domain";
import { FLOORPLAN_ITEM_DEFAULT_SIZE } from "../../types/domain";

// Wortgetreuer Port von svgForDesignerItem() + Helpern aus AlarmSystem/admin/webui/app.js:3440-3739

const S = {
  stroke: "#3c4a60",
  strokeSoft: "#8fa0b8",
  fill: "#eef2f8",
  fillSoft: "#dbe4f0",
  alarm: "#e5484d",
};

export function canonicalDesignerItemType(typeRaw: string): FloorplanItemType {
  if (typeRaw === "pavingStoneDriveway") return "pavingDriveway";
  if (typeRaw === "flasterTerrace") return "pavingTerrace";
  return typeRaw as FloorplanItemType;
}

export function itemSupportsResize(type: FloorplanItemType): boolean {
  return type !== "beam";
}

export function resolveFloorplanItemSize(item: Pick<FloorplanItem, "type" | "w" | "h">): { w: number; h: number } {
  const type = canonicalDesignerItemType(item.type);
  const spec = FLOORPLAN_ITEM_DEFAULT_SIZE[type] ?? { w: 72, h: 46 };
  return {
    w: Math.max(8, Number(item.w || spec.w)),
    h: Math.max(8, Number(item.h || spec.h)),
  };
}

export function cameraAnchorToLocal(
  item: Pick<FloorplanItem, "coverageAnchor">,
  w: number,
  h: number
): { x: number; y: number; edge: FloorplanCoverageAnchor["edge"]; t: number } {
  const hw = w / 2;
  const hh = h / 2;
  const ca = item.coverageAnchor || { edge: "top", t: 0.5 };
  const edge = ca.edge || "top";
  const t = Math.max(0, Math.min(1, Number(ca.t ?? 0.5)));
  if (edge === "bottom") return { x: -hw + w * t, y: hh, edge, t };
  if (edge === "left") return { x: -hw, y: -hh + h * t, edge, t };
  if (edge === "right") return { x: hw, y: -hh + h * t, edge, t };
  return { x: -hw + w * t, y: -hh, edge: "top", t };
}

export function cameraAnchorFromLocal(w: number, h: number, lx: number, ly: number): FloorplanCoverageAnchor {
  const hw = w / 2;
  const hh = h / 2;
  const x = Math.max(-hw, Math.min(hw, lx));
  const y = Math.max(-hh, Math.min(hh, ly));
  const dTop = Math.abs(y + hh);
  const dBottom = Math.abs(y - hh);
  const dLeft = Math.abs(x + hw);
  const dRight = Math.abs(x - hw);
  const min = Math.min(dTop, dBottom, dLeft, dRight);
  if (min === dLeft) return { edge: "left", t: Math.max(0, Math.min(1, (y + hh) / h)) };
  if (min === dRight) return { edge: "right", t: Math.max(0, Math.min(1, (y + hh) / h)) };
  if (min === dBottom) return { edge: "bottom", t: Math.max(0, Math.min(1, (x + hw) / w)) };
  return { edge: "top", t: Math.max(0, Math.min(1, (x + hw) / w)) };
}

export interface FloorplanItemIconProps {
  item: FloorplanItem;
  overview?: boolean;
  alarmActive?: boolean;
}

export function FloorplanItemIcon({ item, overview = false, alarmActive = false }: FloorplanItemIconProps): React.ReactElement {
  const type = canonicalDesignerItemType(item.type);
  const { w, h } = resolveFloorplanItemSize(item);
  const hw = w / 2;
  const hh = h / 2;
  const mirrorX = !!item.mirrorX;

  const body = renderItemBody(type, item, w, h, hw, hh, alarmActive, overview);

  return mirrorX ? (
    <G scaleX={-1} scaleY={1}>
      {body}
    </G>
  ) : (
    <G>{body}</G>
  );
}

function renderItemBody(
  type: FloorplanItemType,
  item: FloorplanItem,
  w: number,
  h: number,
  hw: number,
  hh: number,
  alarmActive: boolean,
  overview: boolean
): React.ReactNode {
  if (type === "door") {
    const side = Math.max(12, Math.min(w, h));
    const hs = side / 2;
    const hx = -hs;
    const hy = hs;
    return (
      <>
        <Line x1={hx} y1={hy} x2={hx + side} y2={hy} stroke={S.strokeSoft} strokeWidth={1} />
        <Path
          d={`M ${hx + side} ${hy} A ${side} ${side} 0 0 0 ${hx} ${hy - side}`}
          stroke={S.strokeSoft}
          strokeWidth={1}
          fill="none"
        />
        {alarmActive && (
          <>
            <Line x1={hx} y1={hy} x2={hx + side} y2={hy} stroke={S.alarm} strokeWidth={2} />
            <Line x1={hx} y1={hy} x2={hx} y2={hy - side} stroke={S.alarm} strokeWidth={2} />
            <Path
              d={`M ${hx + side} ${hy} A ${side} ${side} 0 0 0 ${hx} ${hy - side}`}
              stroke={S.alarm}
              strokeWidth={2}
              fill="none"
            />
          </>
        )}
      </>
    );
  }

  if (type === "window") {
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={3} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Line x1={0} y1={-hh} x2={0} y2={hh} stroke={S.strokeSoft} strokeWidth={1} />
      </>
    );
  }

  if (type === "garagedoor") {
    const lines: React.ReactNode[] = [];
    for (let x = -hw + 12; x < hw; x += 12) {
      lines.push(<Line key={`gd-${x}`} x1={x} y1={-hh} x2={x} y2={hh} stroke={S.strokeSoft} strokeWidth={1} />);
    }
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        {lines}
      </>
    );
  }

  if (type === "pavingDriveway" || type === "pavingTerrace") {
    const hLines: React.ReactNode[] = [];
    for (let y = -hh + 10; y < hh; y += 10) {
      hLines.push(<Line key={`pv-h-${y}`} x1={-hw} y1={y} x2={hw} y2={y} stroke={S.strokeSoft} strokeWidth={1} strokeOpacity={0.6} />);
    }
    const vLines: React.ReactNode[] = [];
    for (let x = -hw + 14; x < hw; x += 14) {
      vLines.push(<Line key={`pv-v-${x}`} x1={x} y1={-hh} x2={x} y2={hh} stroke={S.strokeSoft} strokeWidth={1} strokeOpacity={0.6} />);
    }
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        {hLines}
        {vLines}
      </>
    );
  }

  if (type === "cameraZone") {
    const a = cameraAnchorToLocal(item, w, h);
    const ax = a.x;
    const ay = a.y;
    const edge = a.edge;
    const t = a.t;
    const edgeTol = 0.0001;
    const isCorner = t <= edgeTol || t >= 1 - edgeTol;
    let dx = 0;
    let dy = 1;
    if (isCorner) {
      dx = -ax;
      dy = -ay;
    } else if (edge === "top") {
      dx = 0;
      dy = 1;
    } else if (edge === "bottom") {
      dx = 0;
      dy = -1;
    } else if (edge === "left") {
      dx = 1;
      dy = 0;
    } else if (edge === "right") {
      dx = -1;
      dy = 0;
    }
    const dirLen = Math.hypot(dx, dy) || 1;
    const dirAng = Math.atan2(dy / dirLen, dx / dirLen);
    const spread = Math.PI * 0.34;
    const maxR = Math.hypot(w, h) * 0.85;
    const rings = 7;
    const clipId = `cam-clip-${Number(item.id) || 0}`;
    const arcs: React.ReactNode[] = [];
    for (let i = 1; i <= rings; i++) {
      const r = (maxR * i) / (rings + 1);
      const a0 = dirAng - spread;
      const a1 = dirAng + spread;
      const x0 = ax + Math.cos(a0) * r;
      const y0 = ay + Math.sin(a0) * r;
      const x1 = ax + Math.cos(a1) * r;
      const y1 = ay + Math.sin(a1) * r;
      arcs.push(
        <Path
          key={`arc-${i}`}
          d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
          stroke={S.alarm}
          strokeWidth={2}
          fill="none"
          strokeOpacity={0.55}
        />
      );
    }
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={4} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={-hw} y={-hh} width={w} height={h} rx={4} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>{arcs}</G>
        <Circle cx={ax} cy={ay} r={4} fill={S.alarm} />
      </>
    );
  }

  if (type === "pirZone") {
    if (alarmActive && overview) {
      const gradId = `pir-vig-${Number(item.id) || 0}`;
      return (
        <>
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="50%" r="72%">
              <Stop offset="0%" stopColor="rgba(255,0,0,0.82)" />
              <Stop offset="48%" stopColor="rgba(255,0,0,0.56)" />
              <Stop offset="78%" stopColor="rgba(255,0,0,0.20)" />
              <Stop offset="100%" stopColor="rgba(255,0,0,0.0)" />
            </RadialGradient>
          </Defs>
          <Rect
            x={-hw}
            y={-hh}
            width={w}
            height={h}
            rx={Math.max(8, Math.min(w, h) * 0.22)}
            fill={`url(#${gradId})`}
          />
        </>
      );
    }
    return <Rect x={-hw} y={-hh} width={w} height={h} rx={4} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />;
  }

  if (type === "cabinet") {
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Line x1={-hw} y1={-hh} x2={hw} y2={hh} stroke={S.strokeSoft} strokeWidth={1} />
        <Line x1={hw} y1={-hh} x2={-hw} y2={hh} stroke={S.strokeSoft} strokeWidth={1} />
      </>
    );
  }

  if (type === "kitchen") {
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Rect
          x={-hw + 6}
          y={-hh + 6}
          width={Math.max(8, w - 12)}
          height={Math.max(8, h - 12)}
          rx={2}
          fill={S.fillSoft}
        />
      </>
    );
  }

  if (type === "stove") {
    const ox = w * 0.22;
    const oy = h * 0.22;
    const rr = Math.max(3, Math.min(w, h) * 0.12);
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={3} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Circle cx={-ox} cy={-oy} r={rr} stroke={S.strokeSoft} strokeWidth={1} fill="none" />
        <Circle cx={ox} cy={-oy} r={rr} stroke={S.strokeSoft} strokeWidth={1} fill="none" />
        <Circle cx={-ox} cy={oy} r={rr} stroke={S.strokeSoft} strokeWidth={1} fill="none" />
        <Circle cx={ox} cy={oy} r={rr} stroke={S.strokeSoft} strokeWidth={1} fill="none" />
      </>
    );
  }

  if (type === "sofa") {
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={8} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Rect
          x={-hw + 8}
          y={-hh + 8}
          width={Math.max(8, w - 16)}
          height={Math.max(8, h - 16)}
          rx={6}
          fill={S.fillSoft}
        />
      </>
    );
  }

  if (type === "stairs") {
    const steps = Math.max(3, Math.round(w / 18));
    const lines: React.ReactNode[] = [];
    for (let i = 1; i < steps; i++) {
      const x = -hw + (i * w) / steps;
      lines.push(<Line key={`st-${i}`} x1={x} y1={-hh} x2={x} y2={hh} stroke={S.strokeSoft} strokeWidth={1} />);
    }
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        {lines}
      </>
    );
  }

  if (type === "tableRect") {
    const c = Math.max(1, Math.floor(w / 44));
    const side = Math.max(1, Math.floor(h / 44));
    const topBottom: React.ReactNode[] = [];
    for (let i = 0; i < c; i++) {
      const x = -hw + ((i + 0.5) * w) / c;
      topBottom.push(
        <Rect key={`tr-t-${i}`} x={x - 8} y={-hh - 14} width={16} height={10} rx={2} fill={S.fillSoft} />
      );
      topBottom.push(
        <Rect key={`tr-b-${i}`} x={x - 8} y={hh + 4} width={16} height={10} rx={2} fill={S.fillSoft} />
      );
    }
    const leftRight: React.ReactNode[] = [];
    for (let i = 0; i < side; i++) {
      const y = -hh + ((i + 0.5) * h) / side;
      leftRight.push(
        <Rect key={`tr-l-${i}`} x={-hw - 14} y={y - 5} width={10} height={16} rx={2} fill={S.fillSoft} />
      );
      leftRight.push(
        <Rect key={`tr-r-${i}`} x={hw + 4} y={y - 5} width={10} height={16} rx={2} fill={S.fillSoft} />
      );
    }
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={6} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        {topBottom}
        {leftRight}
      </>
    );
  }

  if (type === "tableRound") {
    const rr = Math.min(hw, hh) - 2;
    const chairs = Math.max(4, Math.round((2 * Math.PI * rr) / 36));
    const chairNodes: React.ReactNode[] = [];
    for (let i = 0; i < chairs; i++) {
      const a = (i / chairs) * Math.PI * 2;
      const cx = Math.cos(a) * (rr + 14);
      const cy = Math.sin(a) * (rr + 14);
      chairNodes.push(
        <Rect
          key={`tc-${i}`}
          x={cx - 6}
          y={cy - 4}
          width={12}
          height={8}
          rx={2}
          fill={S.fillSoft}
          transform={`rotate(${(a * 180) / Math.PI} ${cx} ${cy})`}
        />
      );
    }
    return (
      <>
        <Circle cx={0} cy={0} r={rr} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        {chairNodes}
      </>
    );
  }

  if (type === "wc") {
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={8} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Ellipse cx={0} cy={2} rx={Math.max(5, hw - 8)} ry={Math.max(4, hh - 10)} fill={S.fillSoft} />
      </>
    );
  }

  if (type === "washbasin") {
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={10} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Ellipse cx={0} cy={4} rx={Math.max(6, hw - 10)} ry={Math.max(4, hh - 10)} fill={S.fillSoft} />
        <Line x1={-6} y1={-hh - 6} x2={6} y2={-hh - 6} stroke={S.strokeSoft} strokeWidth={1} />
        <Line x1={0} y1={-hh - 6} x2={0} y2={-hh + 2} stroke={S.strokeSoft} strokeWidth={1} />
      </>
    );
  }

  if (type === "bathtub") {
    return (
      <>
        <Rect
          x={-hw}
          y={-hh}
          width={w}
          height={h}
          rx={Math.max(10, Math.min(hw, hh) * 0.6)}
          fill={S.fill}
          stroke={S.stroke}
          strokeWidth={1.4}
        />
        <Rect
          x={-hw + 8}
          y={-hh + 8}
          width={Math.max(8, w - 16)}
          height={Math.max(8, h - 16)}
          rx={Math.max(8, Math.min(hw, hh) * 0.45)}
          fill={S.fillSoft}
        />
        <Circle cx={hw - 14} cy={0} r={3} stroke={S.strokeSoft} strokeWidth={1} fill="none" />
      </>
    );
  }

  if (type === "shower") {
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={4} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Line x1={-hw} y1={-hh} x2={hw} y2={hh} stroke={S.strokeSoft} strokeWidth={1} strokeOpacity={0.6} />
        <Line x1={hw} y1={-hh} x2={-hw} y2={hh} stroke={S.strokeSoft} strokeWidth={1} strokeOpacity={0.6} />
        <Circle cx={0} cy={0} r={Math.max(4, Math.min(hw, hh) * 0.16)} stroke={S.strokeSoft} strokeWidth={1} fill="none" />
      </>
    );
  }

  if (type === "sink") {
    const basinW = Math.max(10, (w - 18) / 2);
    const basinH = Math.max(8, h - 16);
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={6} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        <Rect x={-hw + 6} y={-hh + 8} width={basinW} height={basinH} rx={4} fill={S.fillSoft} />
        <Rect x={hw - 6 - basinW} y={-hh + 8} width={basinW} height={basinH} rx={4} fill={S.fillSoft} />
        <Line x1={-6} y1={-hh + 4} x2={6} y2={-hh + 4} stroke={S.strokeSoft} strokeWidth={1} />
        <Line x1={0} y1={-hh + 4} x2={0} y2={-hh + 10} stroke={S.strokeSoft} strokeWidth={1} />
      </>
    );
  }

  if (type === "garage") {
    const lines: React.ReactNode[] = [];
    for (let y = -hh + 10; y < hh; y += 10) {
      lines.push(<Line key={`ga-${y}`} x1={-hw} y1={y} x2={hw} y2={y} stroke={S.strokeSoft} strokeWidth={1} />);
    }
    return (
      <>
        <Rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
        {lines}
      </>
    );
  }

  if (type === "beam") {
    return <Rect x={-hw} y={-hh} width={w} height={h} rx={2.2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />;
  }

  if (type === "chair") {
    return <Rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />;
  }

  return (
    <>
      <Rect x={-hw} y={-hh} width={w} height={h} rx={4} fill={S.fill} stroke={S.stroke} strokeWidth={1.4} />
      <SvgText x={0} y={4} textAnchor="middle" fontSize={10} fill={S.stroke}>
        {String(type).slice(0, 3).toUpperCase()}
      </SvgText>
    </>
  );
}
