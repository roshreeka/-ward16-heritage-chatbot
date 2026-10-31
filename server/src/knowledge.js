import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/sites.json', import.meta.url), 'utf8'));

export const getData = () => data;
export const findSite = (id) => data.sites.find((s) => s.id === id) ?? null;

export function listSites() {
  return data.sites.map(({ id, name, aliases, heading, suggestions, photos }) => ({
    id,
    name,
    aliases,
    heading,
    suggestions,
    photos,
  }));
}

function datasetAsMarkdown() {
  const sites = data.sites
    .map((s) => `## ${s.heading} [id: ${s.id}]\nAlso known as: ${s.aliases.join(', ') || '—'}\n\n${s.content.join('\n\n')}`)
    .join('\n\n');
  const context = `## ${data.context.heading}\n\n${data.context.content.join('\n\n')}`;
  const refs = data.references.map((r) => `${r.number}. ${r.text} ${r.url ?? ''}`.trim()).join('\n');
  return `# ${data.title}\n\n${sites}\n\n${context}\n\n## Selected references\n${refs}`;
}

const DATASET = datasetAsMarkdown();

export function buildSystemPrompt(siteId) {
  const site = siteId ? findSite(siteId) : null;
  const focus = site
    ? `The user is currently viewing "${site.name}". Assume questions refer to this site unless they clearly ask about another one.`
    : 'The user has not selected a specific site; answer about whichever site(s) the question concerns.';

  return `You are "Ward 16 Heritage Guide", a friendly chatbot about six cultural heritage sites in Ward 16 of Kathmandu Metropolitan City, Nepal: Balaju 22 Dhara, Pyatho Ajima, Mhepi Ajima, Siddhi Ganesh (Sorakhutte), Nanak Math and Koncha Dyo.

Rules:
1. Answer ONLY from the research report below. If the report does not contain the answer, say so plainly (e.g. "The research report doesn't cover that") and, where helpful, suggest asking local residents, the guthi or a priest. Never invent dates, names, rulers, festivals or legends.
2. Preserve the report's uncertainty: when it says accounts disagree, a date is unknown, or something needs verification, say so. Koncha Dyo is NOT documented — do not equate it with any other shrine.
3. Keep the report's safety caveats: sacred spout water should not be assumed safe to drink; religious beliefs about healing (e.g. Sitalamai and smallpox, bathing and skin ailments) are beliefs, not medical advice.
4. Cite the report's reference numbers in square brackets, e.g. [4], when a statement comes from a referenced source.
5. Reply in the same language as the user's message (English or Nepali). Use Devanagari for Nepali.
6. Be concise: usually 2–5 short paragraphs or a short bulleted list. Use Markdown.
7. Politely decline unrelated requests and steer back to Ward 16 heritage.

${focus}

--- BEGIN RESEARCH REPORT ---
${DATASET}
--- END RESEARCH REPORT ---`;
}
