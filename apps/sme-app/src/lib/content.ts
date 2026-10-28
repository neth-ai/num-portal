// The shape of src/content/page.json, the one file both methods deploy.
// A section the site does not know is ignored, so an older image never crashes on new content.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Section =
  | { type: 'menu'; items: string[] }
  | { type: 'hours'; text: string }
  | { type: 'offer'; text: string }
  | { type: 'order'; button: string; node?: string }
  | { type: 'delivery'; fee: string };

export type PageContent = { title: string; sections: Section[] };

const SECTION_TYPES = ['menu', 'hours', 'offer', 'order', 'delivery'];

/** Reads page.json. A broken file is a deployment failure, so the error is thrown on purpose. */
export function parsePage(raw: string): PageContent {
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (typeof data.title !== 'string' || !data.title.trim()) throw new Error('page.json needs a title');
  if (!Array.isArray(data.sections)) throw new Error('page.json needs a list of sections');

  const sections = (data.sections as Record<string, unknown>[]).filter(
    (s) => s && typeof s.type === 'string' && SECTION_TYPES.includes(s.type),
  );
  return { title: data.title, sections: sections as unknown as Section[] };
}

/**
 * The file this copy of the site serves. Every environment (manual, devops, staging) points
 * SITE_CONTENT_PATH at its own published copy, which is what lets one method be on the new
 * version while the other is still on the old one.
 */
export const contentFile = () => process.env.SITE_CONTENT_PATH || join(process.cwd(), 'src/content/page.json');

export type Published = { content: PageContent; notDeployed?: false } | { notDeployed: true };

/**
 * Reads the page this environment has online.
 *  - no file      -> nothing has been deployed here yet (Scenario S1, empty environment)
 *  - broken file  -> a failed deployment, so the error is thrown on purpose (Scenario S3)
 */
export async function readPublished(): Promise<Published> {
  let raw: string;
  try {
    raw = await readFile(contentFile(), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { notDeployed: true };
    throw err;
  }
  return { content: parsePage(raw) };
}
