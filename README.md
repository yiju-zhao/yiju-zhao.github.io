# yiju-zhao.github.io

Personal portfolio, generated as a static page for GitHub Pages. No dependencies or client-side JavaScript.

```sh
node build.mjs
```

The build generates `index.html` (English, default) and `zh.html` (Chinese), with ordinary links to switch languages. No browser language detection or client-side script is needed.

Edit project structure in `build.mjs`, bilingual copy and the public career summary in `content.mjs`, and English diagram labels in `diagram-labels.mjs`. `styles.css`, `base.css`, and `tokens.css` control the layout and appearance.

The page has a short career background, three selected works, four research/product interests, three experiments, a public repository index, and expandable project records. Career facts come from the primary CV and profile in career-ops. The public summary omits private application data and detailed unpublished research results. Architecture diagrams use the existing renderer and validate labels and connector routing during the build.

See [portfolio references](research/portfolio-references.md) for the first-party examples and editorial decisions behind this version.
