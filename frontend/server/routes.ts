import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { createProxyMiddleware } from "http-proxy-middleware";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Configurable Microservice URLs for multi-repo environments
  const FLOORPLAN_URL = process.env.FLOORPLAN_SERVICE_URL || 'http://localhost:8000';
  const COST_URL = process.env.COST_SERVICE_URL || 'http://localhost:8001';
  const REPORT_URL = process.env.REPORT_SERVICE_URL || 'http://localhost:8002';
  const ADVISOR_URL = process.env.ADVISOR_SERVICE_URL || 'http://localhost:8003';

  function makeProxy(target: string, paths: string[]) {
    return createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter: paths,
      on: {
        proxyReq: (proxyReq: any, req: any) => {
          // Forward the authenticated user ID to the microservices
          if (req.user && req.user.id) {
            proxyReq.setHeader('x-user-id', req.user.id.toString());
          }

          // Fix: express.json() consumes the body before the proxy can forward it.
          // Re-stream the parsed body so the backend receives the data.
          // Only do this for JSON requests — multipart/form-data must stream through untouched.
          const contentType = req.headers?.['content-type'] || '';
          if (req.body && Object.keys(req.body).length > 0 && contentType.includes('application/json')) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData).toString());
            proxyReq.write(bodyData);
          }
        }
      }
    });
  }

  // 1. Floor Plan Generator
  app.use(makeProxy(FLOORPLAN_URL, ['/api/tools/generate-floorplan']));

  // 2. Cost Analyzer
  app.use(makeProxy(COST_URL, ['/api/tools/predict-cost']));

  // 3. Report Analysis
  app.use(makeProxy(REPORT_URL, ['/api/tools/analyze-floorplan', '/api/tools/generate-report-pdf']));

  // 4. Floor Plan Advisor
  app.use(makeProxy(ADVISOR_URL, ['/api/tools/architecture-advisor', '/api/chat']));

  return httpServer;
}

