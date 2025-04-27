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
  // Get original commit details from environment variables passed by the workflow
  // Use HEAD~1 as a fallback if ORIGINAL_COMMIT_SHA is not set (e.g., running locally)
  // In CI, ORIGINAL_COMMIT_SHA is the current commit, so we need to compare against its parent.
  let compareCommitSha = 'HEAD~1'; // Default for local runs

  const originalCommitSha = process.env.ORIGINAL_COMMIT_SHA; // The SHA that triggered the CI

  if (process.env.CI && originalCommitSha) {
    try {
      // Get the parent commit SHA in CI
      compareCommitSha = execSync(`git rev-parse ${originalCommitSha}~1`).toString().trim();
      stepInfo(`Running in CI. Comparing against parent commit SHA: ${compareCommitSha}`);
    } catch (error) {
      stepError(`Could not get parent commit SHA for ${originalCommitSha}. Falling back to HEAD~1.`, { error });
      // Fallback to HEAD~1 if rev-parse fails (e.g., initial commit)
      compareCommitSha = 'HEAD~1';
    }
  } else {
    stepInfo(`Running locally or missing ORIGINAL_COMMIT_SHA. Comparing against: ${compareCommitSha}`);
  }

  const originalCommitMessage =
    process.env.ORIGINAL_COMMIT_MESSAGE?.replace(/\n/g, ' ') || 'No original commit message available.';

  let versionBumpOccurred = false;
  const bumpedPackages: string[] = [];

  stepInfo(`Comparing changes against commit SHA: ${compareCommitSha}`);

  for (const pkg of packages) {
    const packageDir = pkg.path;
    let changesDetected = false;

    try {
      execSync(`git diff --quiet ${compareCommitSha} HEAD -- ${packageDir}`, { stdio: 'ignore' });
      stepInfo(`No changes detected in ${pkg.parsed.name} (${packageDir}). Skipping versioning.`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      stepInfo(`Changes detected in ${pkg.parsed.name} (${packageDir}). Proceeding with versioning.`);
      changesDetected = true;
    }

    // Proceed with versioning only if changes were detected in the package directory
    if (changesDetected) {
      try {
        stepInfo(`Starting versioning for ${pkg.parsed.name}...`, { pkg: pkg.path });
        if (!pkg.parsed.version) {
          throw new Error('Missing pkg version!');
        }
        const newVersion = getNewVersion(pkg.parsed.version);
        stepInfo('New Version:', { newVersion });

        if (process.env.CI) {
          // npm version command modifies package.json locally
          execSync(`npm --prefix ${pkg.path} version ${newVersion} --no-git-tag-version`).toString();

          // Create a git tag for this specific package version bump
          // This tag will be pushed later if any version bump occurred
          try {
            execSync(`git tag ${pkg.parsed.name}@${newVersion}`);
          } catch (error) {
            stepError(`Error on tagging ${pkg.parsed.name} with ${newVersion}`, { error });
          }
        }

        // Mark that at least one version bump occurred in this script run
        versionBumpOccurred = true;
        bumpedPackages.push(pkg.parsed.name); // Record the name of the bumped package

        stepInfo(`Finished versioning for ${pkg.parsed.name}, version bumped to ${newVersion}!`);
      } catch (error) {
        stepError(`Error on versioning ${pkg.parsed.name}`, { error });
        throw error;
      }
    }
  }

  if (versionBumpOccurred) {
    stepInfo('Version bumps occurred for packages:', { packages: bumpedPackages });
    stepInfo('Creating a single commit for all version bumps and pushing.');

    // In CI, we create a single commit for all the version bumps
    if (process.env.CI) {
      const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
      // Create a subject line summarizing the bumped packages and including [skip ci]
      const commitSubject = `[branch|${branch}] Version bumps for ${bumpedPackages.join(', ')} [skip ci]`;
      const commitBody = `\n\nTriggered by commit:\nSHA: ${originalCommitSha}\nMessage: ${originalCommitMessage}`;

      // Stage all modified package.json files. This handles all packages updated in the loop.
      execSync('git add **/package.json');

      // Create the commit. Use multiple -m flags for subject and body.
      // This commit includes all staged package.json changes.
      execSync(`git commit -m "${commitSubject}" -m "${commitBody}"`);

      stepInfo('Commit created successfully.');

      try {
        stepInfo('Pushing commit and tags to main...');
        execSync('git push origin HEAD:main --follow-tags --force-with-lease');
        stepInfo('Push successful to main.');
      } catch (error) {
        stepError('Error pushing to main', { error });
      }

      try {
        stepInfo('Pushing commit and tags to release...');
        execSync('git push origin HEAD:release --follow-tags --force-with-lease');
        stepInfo('Push successful to release.');
      } catch (error) {
        stepError('Error pushing to release', { error });
      }
    } else {
      stepInfo('Local version bump detected. Skipping commit and push.');
    }

    stepInfo('Versioning process completed.');
  } else {
    stepInfo('No version bumps occurred for any package. Skipping commit and push.');
  }
})();
