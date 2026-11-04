import { handle } from "./app.ts";
import { emailServiceMailer } from "./mailer.ts";

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx, { mailer: emailServiceMailer(env.EMAIL, env.MAIL_FROM), now: Date.now });
  },
} satisfies ExportedHandler<Env>;
