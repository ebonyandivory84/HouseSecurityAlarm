"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonArray = parseJsonArray;
exports.parseJsonObject = parseJsonObject;
function parseJsonArray(raw) {
    if (typeof raw !== "string") {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function parseJsonObject(raw, fallback) {
    if (typeof raw !== "string") {
        return fallback;
    }
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    }
    catch {
        return fallback;
    }
}
