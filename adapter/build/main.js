"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAdapter = startAdapter;
const utils = __importStar(require("@iobroker/adapter-core"));
const objectTree_1 = require("./objects/objectTree");
const eventBus_1 = require("./core/eventBus");
const zoneEngine_1 = require("./core/zoneEngine");
const COMMAND_HANDLERS = {
    "commands.armPerimeter": "armPerimeter",
    "commands.armAussenhaut": "armAussenhaut",
    "commands.armVollschutz": "armVollschutz",
    "commands.disarm": "disarm",
};
class HouseSecurityAlarm extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "housesecurityalarm",
        });
        this.bus = new eventBus_1.EventBus();
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    async onReady() {
        await (0, objectTree_1.bootstrapObjectTree)(this);
        this.zoneEngine = new zoneEngine_1.ZoneEngine(this, this.bus);
        await this.zoneEngine.init();
        await this.subscribeStatesAsync("commands.*");
        await this.setStateAsync("info.connection", true, true);
    }
    async onStateChange(id, state) {
        if (!state || state.ack || state.val !== true) {
            return;
        }
        const suffix = Object.keys(COMMAND_HANDLERS).find((key) => id.endsWith(key));
        if (!suffix) {
            return;
        }
        await this.zoneEngine[COMMAND_HANDLERS[suffix]]();
        await this.setStateAsync(id, false, true);
    }
    onUnload(callback) {
        try {
            callback();
        }
        catch {
            callback();
        }
    }
}
function startAdapter(options = {}) {
    return new HouseSecurityAlarm(options);
}
if (require.main !== module) {
    module.exports = startAdapter;
}
else {
    startAdapter();
}
