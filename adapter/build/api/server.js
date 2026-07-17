"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApiServer = startApiServer;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const path_1 = __importDefault(require("path"));
const restRoutes_1 = require("./restRoutes");
const statePushWs_1 = require("./statePushWs");
const WWW_ROOT = path_1.default.join(__dirname, "..", "..", "www");
const DEFAULT_PORT = 8110;
async function startApiServer(deps) {
    const port = deps.adapter.config.port ?? DEFAULT_PORT;
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: "2mb" }));
    app.use((error, _req, res, next) => {
        if (error?.type === "entity.too.large") {
            res.status(413).json({ error: "payload too large" });
            return;
        }
        next(error);
    });
    const apiRouter = express_1.default.Router();
    (0, restRoutes_1.registerRestRoutes)(apiRouter, deps);
    app.use("/housealarm/api", apiRouter);
    app.use("/housealarm/api", (_req, res) => {
        res.status(404).json({ error: "not found" });
    });
    if (deps.adapter.config.enableDevProxy && deps.adapter.config.devServerUrl) {
        app.use("/", (0, http_proxy_middleware_1.createProxyMiddleware)({
            target: deps.adapter.config.devServerUrl,
            changeOrigin: true,
            ws: true,
        }));
    }
    else {
        app.use(express_1.default.static(WWW_ROOT));
        app.get("*", (_req, res) => {
            res.sendFile(path_1.default.join(WWW_ROOT, "index.html"));
        });
    }
    const server = http_1.default.createServer(app);
    const wsHandle = (0, statePushWs_1.attachStatePushWs)(server, deps);
    await new Promise((resolve) => {
        server.listen(port, () => resolve());
    });
    deps.adapter.log.info(`HouseSecurityAlarm API listening on port ${port}`);
    return {
        async dispose() {
            await wsHandle.dispose();
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        },
    };
}
