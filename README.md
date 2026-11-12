# Yiju Zhao · research engineer & builder

A bilingual portfolio with a source-backed Q&A interface and a readable public career profile. The main site remains static on GitHub Pages; optional Claude answers use an independent Cloudflare Worker.

```sh
npm run build
npm test
npm run dev
```

Open `http://127.0.0.1:4173`. English is the default at `index.html`; `zh.html` is the Chinese version. The core content is readable without JavaScript. JavaScript adds the assistant, theme control, active navigation and expanded project diagrams. Theme preference is the only browser-local state saved.

## Content and generated files

- `content.mjs`: the bilingual public career facts, project descriptions and status. Facts come from the primary CV/profile in career-ops; private application data and detailed unpublished research results stay out.
- `experience-ui.mjs`: interface text in both languages.
- `build.mjs` and `diagram-labels.mjs`: page composition and architecture diagrams. The renderer checks label widths and connector routing.
- `lib/public-profile.mjs`: the same facts as public records for retrieval and machine-readable output.
- `lib/discovery.mjs`: canonical metadata, ProfilePage/Person JSON-LD, recruiter brief, Markdown/JSON profiles, llms.txt, robots.txt, sitemap and `.nojekyll`.
- `styles.css`, `base.css`, `tokens.css`: the visual system, responsive layout and light/dark themes.

Run the build after changing content. It generates `index.html`, `zh.html`, `recruiters.html`, `profile.md`, `profile.json`, `llms.txt`, `robots.txt` and `sitemap.xml`. Keep generated files committed for GitHub Pages. `UPDATED` is the actual editorial update date, not the time of every build.

The social card is `assets/social.png`; its original typographic composition can be regenerated with `python3 scripts/render-social.py` (Pillow and a supported system font required).

## Portfolio assistant

The source lookup works without a key. Claude mode requires a deployed Worker and a secret configured outside Git. See [assistant setup](api/README.md). Never add an API key to frontend code or `chat-config.json`.

## Discovery

People and agents can read the [recruiter brief](recruiters.html), [Markdown profile](profile.md), [JSON profile](profile.json) and [llms.txt](llms.txt) directly, without opening a chat or executing JavaScript. All derive from the same public facts as the visible portfolio. Project links distinguish fork contributions, prototypes and ongoing research.

After publication, verify actual page responses, crawler access, sitemap visibility, canonical tags and structured data. Submit the sitemap through the owner's Google Search Console account when available. These files help access and verification; they do not guarantee indexing, ranking, citations or recruiting outcomes. See [official-source research](research/agent-discovery.md) and [portfolio references](research/portfolio-references.md).

## Verification limits

Automated checks cover the build, page/profile consistency and assistant service boundaries. Native Workers/provider behavior needs a real account. Browser visual and interaction QA must be completed in an authorized preview browser; structural tests do not establish the rendered layout.
