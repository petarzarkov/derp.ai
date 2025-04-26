import { execSync } from 'child_process';
import { getServices, stepError, stepInfo } from './releaseUtils';

export const getNewVersion = (version: string) => {
  let [major, minor, patch] = version.split('.').map((v) => parseInt(v));

  let patched = false;
  let minored = false;

  if (patch === 9) {
    if (minor <= 8) {
      minor += 1;
      minored = true;
    }
    patch = 0;
    patched = true;
  }

  if (minor === 9 && !minored) {
    major += 1;
    minor = 0;
  }

  if (patch <= 8 && !patched) {
    patch += 1;
  }

  return [major, minor, patch].join('.');
};

(async () => {
  const packages = await getServices();
  const originalCommitSha = process.env.ORIGINAL_COMMIT_SHA || 'unknown_sha';
  const originalCommitMessage =
    process.env.ORIGINAL_COMMIT_MESSAGE?.replace(/\n/g, ' ') || 'No original commit message available.';

  for (const pkg of packages) {
    try {
      stepInfo(`Starting versioning for ${pkg.parsed.name}...`, { pkg });
      if (!pkg.parsed.version) {
        throw new Error('Missing pkg version!');
      }
      const newVersion = getNewVersion(pkg.parsed.version);
      stepInfo('New Version:', { newVersion });

      execSync(`npm --prefix ${pkg.path} version ${newVersion} --no-git-tag-version`).toString();
      const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

      if (process.env.CI) {
        execSync(`git add ${pkg.path}/package.json`);
        execSync(`git tag ${pkg.parsed.name}@${newVersion}`);
        const commitSubject = `[branch|${branch}] version of ${pkg.parsed.name} bumped to ${newVersion} [skip ci]`;
        const commitBody = `\n\nTriggered by commit:\nSHA: ${originalCommitSha}\nMessage: ${originalCommitMessage}`;

        execSync(`git commit -m "${commitSubject}" -m "${commitBody}"`);
      }

      stepInfo(`Finished versioning for ${pkg.parsed.name}, version bumped to ${newVersion}!`);
    } catch (error) {
      stepError(`Error on versioning ${pkg.parsed.name}`, { error });
    }
  }
})();
