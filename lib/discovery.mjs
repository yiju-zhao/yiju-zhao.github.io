import { writeFileSync } from 'node:fs';
import { identity, copy } from '../content.mjs';
import { SITE, UPDATED, publicProfile, projectSources } from './public-profile.mjs';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function schema(lang = 'en') {
  const c = copy[lang], url = `${SITE}/${lang === 'en' ? '' : 'zh.html'}`, personId = `${SITE}/#person`;
  return {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'ProfilePage', '@id': `${url}#profilepage`, url, inLanguage: lang === 'en' ? 'en' : 'zh-CN', name: c.title, dateModified: UPDATED, mainEntity: { '@id': personId } },
      { '@type': 'Person', '@id': personId, name: identity.name, alternateName: identity.professionalName, url: `${SITE}/`,
        description: `${c.intro} ${c.context}`, jobTitle: 'Research Engineer',
        email: `mailto:${identity.email}`, sameAs: [identity.linkedin, 'https://github.com/yiju-zhao'],
        homeLocation: { '@type': 'Place', name: 'Toronto, Canada' },
        worksFor: { '@type': 'Organization', name: 'Huawei' },
        hasCredential: { '@type': 'EducationalOccupationalCredential', name: 'PhD in Electrical & Computer Engineering', credentialCategory: 'Doctoral degree', recognizedBy: { '@type': 'CollegeOrUniversity', name: 'University of Waterloo' } },
        alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'University of Waterloo' }, { '@type': 'CollegeOrUniversity', name: 'Shanghai Jiao Tong University' }],
        knowsAbout: ['LLM post-training', 'Agentic reinforcement learning', 'SFT', 'GRPO', 'PPO', 'Reward design', 'Agent evaluation', 'Recursive self-improvement', 'Agent infrastructure', 'Knowledge management'],
      },
      ...Object.entries(projectSources).map(([id, p]) => ({ '@type': 'SoftwareSourceCode', '@id': `${SITE}/#${id}-source`, name: p.name, description: c.selectedCopy[id].description, codeRepository: p.url, url: `${url}#${id}`, keywords: p.technologies.join(', ') })),
      { '@type': 'SoftwareSourceCode', name: 'Open Evo', codeRepository: 'https://github.com/CARI-DAAL/open-evo', description: c.focus[0].text, contributor: { '@id': personId } },
    ],
  };
}
export function metadata(lang = 'en') {
  const c = copy[lang], canonical = `${SITE}/${lang === 'en' ? '' : 'zh.html'}`;
  return `<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${SITE}/"><link rel="alternate" hreflang="zh-CN" href="${SITE}/zh.html"><link rel="alternate" hreflang="x-default" href="${SITE}/">
<link rel="alternate" type="text/markdown" href="${SITE}/profile.md" title="Public career profile"><link rel="describedby" href="${SITE}/llms.txt" type="text/plain">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="author" content="Yiju (Eason) Zhao"><meta property="og:type" content="profile"><meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="${esc(c.meta)}"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="Yiju Zhao"><meta property="og:locale" content="${lang === 'en' ? 'en_CA' : 'zh_CN'}">
<meta property="og:image" content="${SITE}/assets/social.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Yiju Zhao, research engineer and builder. LLM post-training, agentic systems, and products.">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(c.title)}"><meta name="twitter:description" content="${esc(c.meta)}"><meta name="twitter:image" content="${SITE}/assets/social.png">
<script type="application/ld+json">${JSON.stringify(schema(lang)).replace(/</g, '\\u003c')}</script>`;
}
export function buildDiscovery() {
  const p = publicProfile();
  const markdown = `# ${p.name} (${p.alternate_names[0]})\n\n${p.summary}\n\nLocation: ${p.location}\n\nEmail: ${p.contact.email}\nLinkedIn: ${p.contact.linkedin}\nGitHub: ${p.contact.github}\nPortfolio: ${p.url}\nUpdated: ${UPDATED}\n\n## Experience\n\n${p.experience.map(e => `### ${e.organization} | ${e.role}\n\n${e.dates}\n\n${e.text}`).join('\n\n')}\n\n## Education\n\n${p.education.map(e => `- ${e}`).join('\n')}\n\n## Research and product interests\n\n${p.interests.map(i => `### ${i.name}\n\n${i.description}\n\n${i.evidence.map(e => `- [${e.title}](${e.url})`).join('\n')}`).join('\n\n')}\n\n## Selected projects\n\n${p.projects.map(x => `### ${x.name}\n\n${x.description}\n\nStatus: ${x.status}. Technologies: ${x.technologies.join(', ')}.\n\n${x.implementation}\n\n${x.evidence.map(url => `- ${url}`).join('\n')}`).join('\n\n')}\n\n## Role interests\n\n${p.role_interests.map(r => `- ${r.role}: ${r.evidence.join(', ')}`).join('\n')}\n\n## Scope and status\n\n${p.boundaries.map(b => `- ${b}`).join('\n')}\n`;
  writeFileSync(new URL('../profile.json', import.meta.url), JSON.stringify(p, null, 2) + '\n');
  writeFileSync(new URL('../profile.md', import.meta.url), markdown);
  writeFileSync(new URL('../llms.txt', import.meta.url), `# Yiju (Eason) Zhao\n\n> Research engineer and builder in Toronto. LLM post-training, agentic RL, recursive self-improvement and agent products.\n\n## Public profile\n\n- [Portfolio](${SITE}/): career background, research interests and selected work\n- [Recruiter brief](${SITE}/recruiters.html): a concise human-readable overview\n- [Profile Markdown](${SITE}/profile.md): career facts and project evidence\n- [Profile JSON](${SITE}/profile.json): the same facts as structured data\n- [中文](${SITE}/zh.html): Chinese version\n\n## External evidence\n\n- [GitHub](https://github.com/yiju-zhao): public repositories\n- [LinkedIn](${identity.linkedin}): professional identity\n- [Open Evo](https://github.com/CARI-DAAL/open-evo): main contributor; current evaluation is ongoing\n\nUpdated: ${UPDATED}. RSI is an ongoing research direction.\n`);
  writeFileSync(new URL('../robots.txt', import.meta.url), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  writeFileSync(new URL('../sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/zh.html', '/recruiters.html'].map(path => `<url><loc>${SITE}${path}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(new URL('../.nojekyll', import.meta.url), '');
  const brief = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Yiju (Eason) Zhao | Recruiter brief</title><meta name="description" content="Research engineering, agent infrastructure and products. A concise career brief with project evidence."><link rel="canonical" href="${SITE}/recruiters.html"><link rel="stylesheet" href="styles.css"><link rel="icon" href="favicon.svg" type="image/svg+xml"></head><body><a class="skip" href="#main">Skip to content</a><div class="page brief"><header class="nav"><a class="wordmark" href="index.html">yiju<span>.</span></a><nav class="nav__sections"><a href="index.html#building">Work</a><a href="profile.md">Markdown</a><a href="profile.json">JSON</a></nav></header><main id="main"><section class="intro"><p class="eyebrow">Research / agent systems / products</p><h1>Yiju Zhao<span>.</span></h1><p class="intro__identity">Eason Zhao · Toronto, Canada</p><p class="intro__description">A concise brief for research &amp; agent teams.</p><p class="intro__context">${esc(p.summary)}</p><div class="contact-links"><a href="mailto:${p.contact.email}">Email ↗</a><a href="${p.contact.linkedin}">LinkedIn ↗</a><a href="profile.md" download>Save profile ↓</a></div></section><section class="section"><header class="section__label"><h2>Background</h2></header><div class="brief-content">${p.experience.map(e => `<h3>${esc(e.organization)} · ${esc(e.role)}</h3><p>${esc(e.dates)}</p><p>${esc(e.text)}</p>`).join('')}<h3>Education</h3><ul>${p.education.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div></section><section class="section"><header class="section__label"><h2>Research &amp; products</h2></header><div class="brief-content">${p.interests.map(i => `<h3>${esc(i.name)}</h3><p>${esc(i.description)}</p><div class="interest-links">${i.evidence.map(e => `<a href="${esc(e.url)}">${esc(e.title)} ↗</a>`).join('')}</div>`).join('')}</div></section><section class="section"><header class="section__label"><h2>Project evidence</h2></header><div class="brief-content">${p.projects.map(x => `<h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><p>${esc(x.implementation)}</p><p>${esc(x.status)} · ${esc(x.technologies.join(' / '))}</p><div class="interest-links">${x.evidence.map(url => `<a href="${url}">${esc(url)} ↗</a>`).join('')}</div>`).join('')}<h3>Scope and status</h3><ul>${p.boundaries.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></section></main><footer class="footer"><a href="index.html">Full portfolio ↗</a><span>Updated ${UPDATED}</span><a href="profile.json">Profile JSON ↗</a></footer></div></body></html>`;
  writeFileSync(new URL('../recruiters.html', import.meta.url), brief);
}
