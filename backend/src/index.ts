import { handle } from "./app.ts";
import { mailerFromEnv } from "./mailer.ts";

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx, { mailer: mailerFromEnv(env), now: Date.now });
  },
} satisfies ExportedHandler<Env>;
