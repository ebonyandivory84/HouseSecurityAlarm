import express, { type Request, type Response, type NextFunction, type Router } from "express";
import http, { type Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import type { ApiDeps } from "./types";
import { registerRestRoutes } from "./restRoutes";
import { attachStatePushWs } from "./statePushWs";

export interface ApiServerHandle {
  dispose(): Promise<void>;
}

const WWW_ROOT = path.join(__dirname, "..", "..", "www");
const DEFAULT_PORT = 8110;

export async function startApiServer(deps: ApiDeps): Promise<ApiServerHandle> {
  const port = deps.adapter.config.port ?? DEFAULT_PORT;

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use((error: any, _req: Request, res: Response, next: NextFunction) => {
    if (error?.type === "entity.too.large") {
      res.status(413).json({ error: "payload too large" });
      return;
    }
    next(error);
  });

  const apiRouter: Router = express.Router();
  registerRestRoutes(apiRouter, deps);
  app.use("/housealarm/api", apiRouter);
  app.use("/housealarm/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "not found" });
  });

  if (deps.adapter.config.enableDevProxy && deps.adapter.config.devServerUrl) {
    app.use(
      "/",
      createProxyMiddleware({
        target: deps.adapter.config.devServerUrl,
        changeOrigin: true,
        ws: true,
      })
    );
  } else {
    app.use(express.static(WWW_ROOT));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(WWW_ROOT, "index.html"));
    });
  }

  const server: Server = http.createServer(app);
  const wsHandle = attachStatePushWs(server, deps);

  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
  });
  deps.adapter.log.info(`HouseSecurityAlarm API listening on port ${port}`);

  return {
    async dispose(): Promise<void> {
      await wsHandle.dispose();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
