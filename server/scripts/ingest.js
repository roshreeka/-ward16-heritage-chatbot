// Converts the Ward 16 heritage report (.docx) into server/data/sites.json.
// Usage: npm run ingest [-- path/to/report.docx]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mammoth from 'mammoth';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DOCX = path.join(here, '../data/source/Ward_16_Heritage_Research_Report.docx');
const OUT = path.join(here, '../data/sites.json');

// Curated metadata keyed by the report's section number.
const SITE_META = {
  1: {
    id: '22-dhara',
    name: 'Balaju 22 Dhara',
    aliases: ['Baisdhara', 'Baaisdhara', 'Bais Dhara', 'Balaju Water Garden'],
    photoKeywords: ['22 Dhara'],
    suggestions: [
      'Who built the 22 Dhara and when?',
      'What happens during the Baisdhara / Lhuti Punhi Mela?',
      'How did the traditional hiti water system work?',
      'Is the water at 22 Dhara safe to drink?',
    ],
  },
  2: {
    id: 'pyatho-ajima',
    name: 'Pyatho Ajima',
    aliases: ['Sitalamai', 'Shitala Ajima', 'Pyathwa Ajima'],
    photoKeywords: ['Sitalamai', 'Pyatho'],
    suggestions: [
      'What does "Ajima" mean?',
      'Why do families worship Sitalamai for children?',
      'How is Pyatho Ajima different from Mhepi Ajima?',
      'What is the 2025 KMC project at this shrine?',
    ],
  },
  3: {
    id: 'mhepi-ajima',
    name: 'Mhepi Ajima',
    aliases: ['Mhepi Mandir', 'Mhaypi', 'Mhayepi'],
    photoKeywords: ['Mhepi'],
    suggestions: [
      'Which goddess is worshipped at Mhepi?',
      'What happens during the Mhepi khat jatra?',
      'Who takes care of the Mhepi temple?',
    ],
  },
  4: {
    id: 'siddhi-ganesh',
    name: 'Siddhi Ganesh, Sorakhutte',
    aliases: ['Sorakhutte Ganesh', 'Paknajol Ganesh'],
    photoKeywords: ['Sorakhutte'],
    suggestions: [
      'What does the Ganesh image at Sorakhutte look like?',
      'Which day is busiest for worship here?',
      'What is the 16-pillar sattal at Sorakhutte?',
    ],
  },
  5: {
    id: 'nanak-math',
    name: 'Nanak Math, Balaju',
    aliases: ['Guru Nanak Math', 'Sangat Bari'],
    photoKeywords: ['Nanak'],
    suggestions: [
      'Did Guru Nanak really visit Nepal?',
      'What can be found inside Nanak Math?',
      'What problems does Nanak Math face today?',
    ],
  },
  6: {
    id: 'koncha-dyo',
    name: 'Koncha Dyo',
    aliases: [],
    photoKeywords: ['Koncha'],
    suggestions: [
      'What is known about Koncha Dyo?',
      'Why does Koncha Dyo need local verification?',
    ],
  },
};

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m);
const stripTags = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const paragraphs = (html) => [...html.matchAll(/<(p|li)>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
const firstHref = (s) => decode(s.match(/href="([^"]+)"/)?.[1] ?? '') || null;

export function parseReport(html) {
  const title = stripTags(html.split('<h1>')[0].match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '');
  const sections = [...html.matchAll(/<h1>([\s\S]*?)<\/h1>([\s\S]*?)(?=<h1>|$)/g)].map((m) => ({
    heading: stripTags(m[1]),
    body: m[2],
  }));

  const sites = [];
  const photos = [];
  const references = [];
  let context = null;

  for (const { heading, body } of sections) {
    const num = Number(heading.match(/^(\d+)\./)?.[1]);
    if (/^Photographic references/i.test(heading)) {
      for (const p of paragraphs(body)) {
        const label = stripTags(p.match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? '').replace(/:$/, '');
        const credit = stripTags(p.split('</a>')[1] ?? '').replace(/^[—-]\s*/, '');
        photos.push({ label, url: firstHref(p), credit });
      }
    } else if (/^Selected references/i.test(heading)) {
      for (const p of paragraphs(body)) {
        const m = stripTags(p).match(/^(\d+)\.\s*(.*?)(?:\s*Link)?$/);
        if (m) references.push({ number: Number(m[1]), text: m[2], url: firstHref(p) });
      }
    } else if (SITE_META[num]) {
      const { photoKeywords, ...meta } = SITE_META[num];
      sites.push({
        ...meta,
        heading: heading.replace(/^\d+\.\s*/, ''),
        content: paragraphs(body).map(stripTags).filter(Boolean),
        photos: [],
        _photoKeywords: photoKeywords,
      });
    } else if (num) {
      context = { heading: heading.replace(/^\d+\.\s*/, ''), content: paragraphs(body).map(stripTags).filter(Boolean) };
    }
  }

  for (const photo of photos) {
    const site = sites.find((s) => s._photoKeywords.some((k) => photo.label.includes(k)));
    if (site) site.photos.push(photo);
  }
  for (const ref of references) {
    if (!/photograph/i.test(ref.text) || !/wikimedia/i.test(ref.text)) continue;
    const site = sites.find((s) => s._photoKeywords.some((k) => ref.text.includes(k)));
    if (site) site.photos.push({ label: site.name, url: ref.url, credit: ref.text.replace(/\.$/, '') });
  }
  for (const site of sites) delete site._photoKeywords;

  return { title, sites, context, references };
}

async function main() {
  const docx = process.argv[2] ?? DEFAULT_DOCX;
  const { value: html } = await mammoth.convertToHtml({ buffer: await readFile(docx) });
  const data = parseReport(html);
  if (data.sites.length !== Object.keys(SITE_META).length) {
    throw new Error(`Expected ${Object.keys(SITE_META).length} sites, found ${data.sites.length}`);
  }
  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote ${data.sites.length} sites, ${data.references.length} references -> ${path.relative(process.cwd(), OUT)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
