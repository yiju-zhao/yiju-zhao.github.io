# Portfolio assistant

The public site stays on GitHub Pages. This Worker holds the Anthropic key and answers questions from the published career facts in `../content.mjs`. It has no access to career-ops, local files, private job-search records, or agent tools.

Without a configured endpoint, the website offers deterministic source lookup and labels it as such. It does not claim that these excerpts are AI answers.

## Activate Claude answers

From the repository root, in your own terminal:

```sh
npx wrangler@4 login
npx wrangler@4 deploy --config api/wrangler.jsonc
npx wrangler@4 secret put ANTHROPIC_API_KEY --config api/wrangler.jsonc
```

The last command prompts for the key. Enter it there; do not add it to the repository, frontend, chat, or `chat-config.json`. Use your own Anthropic API account. Then use the Worker URL printed by the deploy command:

```sh
node scripts/configure-chat.mjs https://YOUR-WORKER.workers.dev
```

This verifies readiness and CORS, then sends one short, billable question to confirm a real cited Claude answer before writing the public endpoint. Commit and publish `chat-config.json` with the site. The interface switches to Claude mode after a successful health check. A custom site domain also needs to be added to `ALLOWED_ORIGINS` in `wrangler.jsonc`, then redeployed.

The setup requires Cloudflare account access and an Anthropic API key. Those are not provisioned by the source code. A live provider call and Cloudflare deployment must be verified after configuring the account.

## Behavior and cost controls

- Default model: `claude-haiku-5-5`. Model choice stays on the server.
- Fixed system instructions and cited text documents; visitor questions are untrusted input.
- Answers link only to records supplied by this application. Invented document indexes or quotes, uncited answers, truncated output, and provider failures fall back to the public excerpts.
- Maximum 1,200 input characters, 4 KiB request body, and 450 output tokens. No conversation history is sent.
- Cloudflare's per-location rate binding allows approximately 5 requests per IP per minute. CORS limits browser access to the portfolio; it is not authentication and cannot stop forged non-browser requests.
- A single transactional Durable Object reserves each provider call before it runs, with a default **200-call global cap per UTC day**. Failed calls consume a reservation too. Adjust `DAILY_REQUEST_LIMIT` for your traffic. This is a request cap, not a dollar-denominated spend cap.
- No chat logging, chat database or local browser chat storage is implemented. The rate limiter uses the connection IP. Anthropic and Cloudflare have their own data-handling policies. The interface tells visitors when their question will be sent to Anthropic.

On 2026-11-12, Anthropic lists Haiku 5.5 at $0.10 / million input tokens for short contexts (up to 100K) and $0.50 / million output tokens. As an illustration, 1,000 answers at 2,500 input and 350 output tokens each cost about $0.425 in model tokens, excluding cloud fees and taxes. Actual usage varies. [Official pricing](https://platform.claude.com/docs/en/about-claude/pricing).

## Verification

```sh
npm test
```

Tests exercise the request handler with mocked provider and binding boundaries, including citation validation, input limits, rate/budget rejection, failure fallbacks, concurrent budget reservations and endpoint activation. They do not replace live Cloudflare/provider verification.

Official references: [Messages citations](https://platform.claude.com/docs/en/build-with-claude/citations), [Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [Durable Object storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).
