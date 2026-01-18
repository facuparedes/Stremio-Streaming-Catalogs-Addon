import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  handleConfiguredManifest,
  handleDefaultManifest,
} from "./server/routes/manifest.js";
import { handleCatalog } from "./server/routes/catalog.js";
import { validateToken } from "./server/middleware.js";
import Mixpanel from "mixpanel";

const app = new Hono();

app.use("*", cors());

// Helper to adapt Express-like handlers to Hono
const adapt = (handler, adminToken) => async (c) => {
  const req = {
    params: c.req.param(),
    ip: c.req.header("cf-connecting-ip") || "127.0.0.1",
    query: c.req.query(),
  };

  let responseData = null;
  let statusCode = 200;
  const headers = {};

  const res = {
    setHeader: (name, value) => {
      headers[name] = value;
    },
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    send: (data) => {
      responseData = data;
      return res;
    },
  };

  // Setup Mixpanel
  const mixpanelKey = c.env.MIXPANEL_KEY;
  const mixpanel = mixpanelKey ? Mixpanel.init(mixpanelKey) : null;

  // Validation if token is required
  if (adminToken) {
    let authorized = false;
    const next = () => {
      authorized = true;
    };
    validateToken(adminToken)(req, res, next);
    if (!authorized) {
      return c.json(responseData || { error: "Unauthorized" }, {
        status: statusCode,
      });
    }
  }

  await handler(req, res, mixpanel);

  return c.json(responseData, { status: statusCode, headers });
};

// Routes
app.get("/manifest.json", async (c) => {
  const adminToken = c.env.ADMIN_TOKEN || c.env.VITE_ADMIN_TOKEN;
  if (adminToken) {
    return c.json({ error: "Unauthorized: This addon requires a token" }, 401);
  }
  return adapt(handleDefaultManifest)(c);
});

app.get("/:configuration/manifest.json", (c) => {
  const adminToken = c.env.ADMIN_TOKEN || c.env.VITE_ADMIN_TOKEN;
  return adapt(handleConfiguredManifest, adminToken)(c);
});

app.get("/:configuration/catalog/:type/:id/:extra{.+$}?", (c) => {
  const adminToken = c.env.ADMIN_TOKEN || c.env.VITE_ADMIN_TOKEN;
  return adapt(async (req, res, mixpanel) => {
    await handleCatalog(req, res, {}, {}, mixpanel);
  }, adminToken)(c);
});

// Serve frontend if not handled by Assets binding
app.all("*", async (c) => {
  // Assets are usually handled by the 'assets' config in wrangler.toml
  // but we can have a fallback here if needed.
  return c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.notFound();
});

export default app;
