import { serve } from "@hono/node-server";
import { env } from "./env.js";
import { createApp } from "./app.js";

const app = createApp(env);
serve({ fetch: app.fetch, port: env.PORT }, (i) => console.log(`listening on ${i.port}`));
