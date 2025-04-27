import fs from 'fs';
import { globby } from 'globby';
import colors from 'picocolors';
import { execSync } from 'node:child_process';
import type { Colors, Formatter } from 'picocolors/types';

export interface ParsedPackage {
  path: string;
  parsed: Record<string, unknown> & { name: string; version: string };
}

function step(msg: string, format: keyof Colors = 'cyan', meta?: Record<string, unknown>): void {
  const formattedMsg = (colors[format] as Formatter)(msg);
  if (meta) {
    console.log(`${formattedMsg} ${colors.white(JSON.stringify(meta, null, 2))}`);
  } else {
    console.log(formattedMsg);
  }
}

export function stepInfo(msg: string, meta?: Record<string, unknown>): void {
  return step(msg, 'cyan', meta);
}

export function stepWarn(msg: string, meta?: Record<string, unknown>): void {
  return step(msg, 'yellow', meta);
}

export function stepError(msg: string, meta?: Record<string, unknown>): void {
  return step(msg, 'red', meta);
}

export async function getServices(ignoreRoot = true): Promise<ParsedPackage[]> {
  const packagePaths = await globby(
    ignoreRoot ? ['services/*/package.json'] : ['./package.json', 'services/*/package.json'],
    {
      ignore: ['**/node_modules/**', '**/examples/**', '**/fixtures/**'],
    },
  );
  const services = packagePaths.map((p: string) => ({
    path: p.replace('package.json', ''),
    parsed: JSON.parse(fs.readFileSync(p, 'utf-8')) as ParsedPackage['parsed'],
  }));

  return services;
}

export function publishPackage(pkdDir: string, tag?: string) {
  const publicArgs = ['pnpm', 'publish', '--access', 'public'];
  if (tag) {
    publicArgs.push('--tag', tag);
  }

  execSync(publicArgs.join(' '), {
    cwd: pkdDir,
  });
}

export const getCommitPkgV = (commit: string, path: string) => {
  try {
    const pkgBuff = execSync(`git show "${commit}:${path}package.json"`, { stdio: 'pipe' });
    const version = (JSON.parse(pkgBuff.toString()) as { version?: string })?.version;
    step('info', undefined, { commit, path, version });
    return version || 'unknown';
  } catch (err) {
    step('getCommitPkgV error', 'red', { err });
    return;
  }
};

export const getFilesInACommit = (commit: string) => {
  const files = execSync(`git ls-tree --name-only -r ${commit}`, { stdio: 'pipe' }).toString();
  const parsed = JSON.stringify(files).replace(/"/g, '').replace(/\\n/g, ',').split(',').filter(Boolean);

  return parsed;
};

export const hasChangesInDir = (commit: string, dir: string) => {
  try {
    const fileChanges = getFilesInACommit(commit);

    return fileChanges.some((change) => change.includes(dir));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return true;
  }
};
