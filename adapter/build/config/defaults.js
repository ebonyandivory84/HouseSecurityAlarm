"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ZONE_BY_CATEGORY = exports.DEFAULT_FLOORPLAN_IMAGES = exports.DEFAULT_FLOORPLAN_DESIGNER = exports.DEFAULT_ALARM_TIMING_CONFIG = exports.DEFAULT_ALARM_CENTER_MAPPING = exports.DEFAULT_PRESENCE_CONFIG = exports.DEFAULT_DAY_NIGHT_CONFIG = void 0;
exports.createDefaultDatapointConfig = createDefaultDatapointConfig;
exports.DEFAULT_DAY_NIGHT_CONFIG = {
    duskOffsetMin: 30,
    dawnOffsetMin: 30,
    useBrightnessOverride: false,
};
exports.DEFAULT_PRESENCE_CONFIG = {
    datapointIds: [],
    autoDisarmOnPresence: false,
};
exports.DEFAULT_ALARM_CENTER_MAPPING = {
    armedStateId: "",
    perimeterStateId: "",
    countdownStateId: "",
    sirenStateId: "",
    triggerStateId: "",
    displayStateId: "",
    buzzerStateId: "",
    ledRedStateId: "",
    ledYellowStateId: "",
    fingerprintStateId: "",
};
exports.DEFAULT_ALARM_TIMING_CONFIG = {
    exitDelaySec: 30,
    entryDelaySec: 30,
};
function createEmptyFloorplanFloor() {
    return {
        items: [],
        walls: [],
        outerWallIds: [],
        perimeter: null,
        nextId: 1,
        lastBeamItemId: null,
    };
}
function createDefaultFloorplanFloorView() {
    return {
        showBg: true,
        useInOverviewOnly: false,
        workspaceScale: 1,
        bgOffsetX: 0,
        bgOffsetY: 0,
    };
}
exports.DEFAULT_FLOORPLAN_DESIGNER = {
    version: 1,
    EG: createEmptyFloorplanFloor(),
    OG: createEmptyFloorplanFloor(),
    settings: {
        snap: true,
        grid: 4,
        floorView: {
            EG: createDefaultFloorplanFloorView(),
            OG: createDefaultFloorplanFloorView(),
        },
        showSensorsPreview: true,
    },
};
exports.DEFAULT_FLOORPLAN_IMAGES = {
    egImageDataUri: null,
    ogImageDataUri: null,
    published: false,
};
exports.DEFAULT_ZONE_BY_CATEGORY = {
    camera: "perimeter",
    motion: "innenraum",
    door: "aussenhaut",
    presence: null,
    brightness: null,
    custom: null,
};
function createDefaultDatapointConfig(id, category, label) {
    return {
        id,
        category,
        label,
        valueType: "boolean",
        zone: exports.DEFAULT_ZONE_BY_CATEGORY[category],
        enabled: true,
    };
}
