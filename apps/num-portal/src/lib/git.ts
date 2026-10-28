// Writes the cafe site content and commits it. When a remote is configured the commit is
// pushed, which is what starts the Method B pipeline in GitLab.
//
// The portal never stores credentials: pushing uses the git remote already set up on the
// server (a deploy key or a credential helper).
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { config } from './config';

const run = promisify(execFile);

/** The repository root. In Docker the repo is mounted and REPO_ROOT points at it. */
const repoRoot = () => (process.env.REPO_ROOT ? resolve(process.env.REPO_ROOT) : resolve(process.cwd(), '../..'));

export type CommitResult = { sha: string; pushed: boolean; note?: string };

async function git(args: string[], cwd: string) {
  const { stdout } = await run('git', args, { cwd, timeout: 20_000 });
  return stdout.trim();
}

export async function commitContent(code: string, message: string): Promise<CommitResult> {
  const cwd = repoRoot();
  const file = join(cwd, config.smeContentPath);

  try {
    await writeFile(file, code.endsWith('\n') ? code : `${code}\n`, 'utf8');
  } catch {
    // Method A can still go ahead by hand, so a missing repository must not stop the release.
    return {
      sha: 'local',
      pushed: false,
      note: `The cafe site is not reachable at ${file}. Method B cannot start until the repository is mounted.`,
    };
  }

  try {
    await git(['add', config.smeContentPath], cwd);
    await git(['-c', 'user.name=NUM Portal', '-c', 'user.email=portal@num.local', 'commit', '-m', message], cwd);
    const sha = (await git(['rev-parse', '--short', 'HEAD'], cwd)).slice(0, 7);

    const remotes = await git(['remote'], cwd).catch(() => '');
    if (!remotes) {
      return { sha, pushed: false, note: 'Saved locally. No git remote is configured, so no pipeline started.' };
    }

    try {
      await git(['push', 'origin', 'HEAD'], cwd);
      return { sha, pushed: true };
    } catch {
      return { sha, pushed: false, note: 'Committed, but the push failed. Method B will not start until the push succeeds.' };
    }
  } catch (err) {
    // Nothing to commit, or git is unavailable: the file on disk is still updated.
    const detail = err instanceof Error ? err.message : String(err);
    const nothing = /nothing to commit/i.test(detail);
    return {
      sha: 'local',
      pushed: false,
      note: nothing ? 'The file already has this content, so there was nothing to commit.' : 'The change was written to the file, but git could not commit it.',
    };
  }
}
