"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ZONE_BY_CATEGORY = void 0;
exports.createDefaultDatapointConfig = createDefaultDatapointConfig;
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
