// Checks the services on the study server for the System health page.
// Every check is a real request; nothing is reported as OK without being tried.
import { pool } from './db';
import { config } from './config';

export type ServiceStatus = { name: string; where: string; ok: boolean; detail?: string };

export type SiteCheck = { ok: boolean; detail?: string };

/**
 * Asks one deployed copy of the cafe site how it is. Its answer also says why it is not
 * online: nothing deployed yet, broken content, or a setting the new version needs.
 */
export async function siteCheck(url: string, timeoutMs = 2500): Promise<SiteCheck> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/api/health`, { signal: control.signal, cache: 'no-store' });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as { status?: string } | null;
    return { ok: false, detail: body?.status ?? `http ${res.status}` };
  } catch {
    return { ok: false, detail: 'not reachable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkServices(): Promise<ServiceStatus[]> {
  const [database, methodA, methodB, staging] = await Promise.all([
    pool.query('SELECT 1').then(() => true).catch(() => false),
    siteCheck(config.methodAUrl),
    siteCheck(config.methodBUrl),
    siteCheck(config.stagingUrl),
  ]);

  return [
    { name: 'NUM Portal', where: ':3000', ok: true },
    { name: 'PostgreSQL', where: ':5432', ok: database, detail: database ? undefined : 'no connection' },
    { name: 'Method A site (manual)', where: config.methodAPublicUrl, ...methodA },
    { name: 'Method B production', where: config.methodBPublicUrl, ...methodB },
    { name: 'Method B staging', where: config.stagingPublicUrl, ...staging },
    { name: 'GitLab runner', where: config.gitlabProjectUrl || 'not configured', ok: Boolean(config.gitlabToken), detail: config.gitlabToken ? undefined : 'not configured' },
    { name: 'Cloudflare Tunnel', where: config.previewDomain, ok: Boolean(config.gitlabToken), detail: config.gitlabToken ? undefined : 'not configured' },
  ];
}
