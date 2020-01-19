import * as core from "@actions/core";
import { execute } from "./execute";
import { appendFile } from "fs";
import { promisify } from "util";
import { isNullOrUndefined } from "./util";
import {
  workspace,
  action,
  root,
  ssh,
  repositoryPath,
  isTest
} from "./constants";

/** Generates the branch if it doesn't exist on the remote.
 * @returns {Promise}
 */
export async function init(): Promise<any> {
  try {
    if (
      isNullOrUndefined(action.accessToken) &&
      isNullOrUndefined(action.gitHubToken) &&
      isNullOrUndefined(action.deployKey)
    ) {
      return core.setFailed(
        "You must provide the action with either a Personal Access Token or the GitHub Token secret in order to deploy."
      );
    }

    if (!isNullOrUndefined(action.deployKey)) {
      const createFile = promisify(appendFile);
      await execute(`mkdir -p ${ssh}`, workspace);
      createFile(`${ssh}/known_hosts`, '\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n');
      createFile(`${ssh}/known_hosts`, '\ngithub.com ssh-dss AAAAB3NzaC1kc3MAAACBANGFW2P9xlGU3zWrymJgI/lKo//ZW2WfVtmbsUZJ5uyKArtlQOT2+WRhcg4979aFxgKdcsqAYW3/LS1T2km3jYW/vr4Uzn+dXWODVk5VlUiZ1HFOHf6s6ITcZvjvdbp6ZbpM+DuJT7Bw+h5Fx8Qt8I16oCZYmAPJRtu46o9C2zk1AAAAFQC4gdFGcSbp5Gr0Wd5Ay/jtcldMewAAAIATTgn4sY4Nem/FQE+XJlyUQptPWMem5fwOcWtSXiTKaaN0lkk2p2snz+EJvAGXGq9dTSWHyLJSM2W6ZdQDqWJ1k+cL8CARAqL+UMwF84CR0m3hj+wtVGD/J4G5kW2DBAf4/bqzP4469lT+dF2FRQ2L9JKXrCWcnhMtJUvua8dvnwAAAIB6C4nQfAA7x8oLta6tT+oCk2WQcydNsyugE8vLrHlogoWEicla6cWPk7oXSspbzUcfkjN3Qa6e74PhRkc7JdSdAlFzU3m7LMkXo1MHgkqNX8glxWNVqBSc0YRdbFdTkL0C6gtpklilhvuHQCdbgB3LBAikcRkDp+FCVkUgPC/7Rw==\n');  
      action.deployKey.split(/(?=-----BEGIN)/).forEach(async function(key) {
        await execute(`ssh-add -${key.trim() + "\n"}`, ssh);
      });
    }

    if (action.build.startsWith("/") || action.build.startsWith("./")) {
      return core.setFailed(
        `The deployment folder cannot be prefixed with '/' or './'. Instead reference the folder name directly.`
      );
    }

    await execute(`git init`, workspace);
    await execute(`git config user.name ${action.name}`, workspace);
    await execute(`git config user.email ${action.email}`, workspace);
    await execute(`git remote rm origin`, workspace);
    await execute(`git remote add origin ${repositoryPath}`, workspace);
    await execute(`git fetch`, workspace);
  } catch (error) {
    core.setFailed(`There was an error initializing the repository: ${error}`);
  } finally {
    return Promise.resolve("Initialization step complete...");
  }
}

/** Switches to the base branch.
 * @returns {Promise}
 */
export async function switchToBaseBranch(): Promise<any> {
  await execute(
    `git checkout --progress --force ${
      action.baseBranch ? action.baseBranch : action.defaultBranch
    }`,
    workspace
  );

  return Promise.resolve("Switched to the base branch...");
}

/** Generates the branch if it doesn't exist on the remote.
 * @returns {Promise}
 */
export async function generateBranch(): Promise<any> {
  try {
    console.log(`Creating ${action.branch} branch... 🔧`);
    await switchToBaseBranch();
    await execute(`git checkout --orphan ${action.branch}`, workspace);
    await execute(`git reset --hard`, workspace);
    await execute(
      `git commit --allow-empty -m "Initial ${action.branch} commit."`,
      workspace
    );
    await execute(`git push ${repositoryPath} ${action.branch}`, workspace);
    await execute(`git fetch`, workspace);
  } catch (error) {
    core.setFailed(
      `There was an error creating the deployment branch: ${error} ❌`
    );
  } finally {
    return Promise.resolve("Deployment branch creation step complete... ✅");
  }
}

/** Runs the necessary steps to make the deployment.
 * @returns {Promise}
 */
export async function deploy(): Promise<any> {
  const temporaryDeploymentDirectory = "gh-action-temp-deployment-folder";
  const temporaryDeploymentBranch = "gh-action-temp-deployment-branch";
  /*
      Checks to see if the remote exists prior to deploying.
      If the branch doesn't exist it gets created here as an orphan.
    */
  const branchExists = await execute(
    `git ls-remote --heads ${repositoryPath} ${action.branch} | wc -l`,
    workspace
  );
  if (!branchExists) {
    console.log("Deployment branch does not exist. Creating....");
    await generateBranch();
  }

  // Checks out the base branch to begin the deployment process.
  await switchToBaseBranch();
  await execute(`git fetch ${repositoryPath}`, workspace);
  await execute(
    `git worktree add --checkout ${temporaryDeploymentDirectory} origin/${action.branch}`,
    workspace
  );

  // Ensures that items that need to be excluded from the clean job get parsed.
  let excludes = "";
  if (action.clean && action.cleanExclude) {
    try {
      const excludedItems = JSON.parse(action.cleanExclude);
      excludedItems.forEach(
        (item: string) => (excludes += `--exclude ${item} `)
      );
    } catch {
      console.log(
        "There was an error parsing your CLEAN_EXCLUDE items. Please refer to the README for more details. ❌"
      );
    }
  }

  /*
    Pushes all of the build files into the deployment directory.
    Allows the user to specify the root if '.' is provided.
    rysync is used to prevent file duplication. */
  await execute(
    `rsync -q -av --progress ${action.build}/. ${
      action.targetFolder
        ? `${temporaryDeploymentDirectory}/${action.targetFolder}`
        : temporaryDeploymentDirectory
    } ${
      action.clean
        ? `--delete ${excludes} --exclude CNAME --exclude .nojekyll`
        : ""
    }  --exclude .ssh --exclude .git --exclude .github ${
      action.build === root ? `--exclude ${temporaryDeploymentDirectory}` : ""
    }`,
    workspace
  );

  const hasFilesToCommit = await execute(
    `git status --porcelain`,
    temporaryDeploymentDirectory
  );

  if (!hasFilesToCommit && !isTest) {
    console.log("There is nothing to commit. Exiting... ✅");
    return Promise.resolve();
  }

  // Commits to GitHub.
  await execute(`git add --all .`, temporaryDeploymentDirectory);
  await execute(
    `git checkout -b ${temporaryDeploymentBranch}`,
    temporaryDeploymentDirectory
  );
  await execute(
    `git commit -m "${
      !isNullOrUndefined(action.commitMessage)
        ? action.commitMessage
        : `Deploying to ${action.branch} from ${action.baseBranch}`
    } - ${process.env.GITHUB_SHA} 🚀" --quiet`,
    temporaryDeploymentDirectory
  );
  await execute(
    `git push --force ${repositoryPath} ${temporaryDeploymentBranch}:${action.branch}`,
    temporaryDeploymentDirectory
  );

  // Cleans up temporary files/folders and restores the git state.
  console.log("Running post deployment cleanup jobs... 🔧");
  await execute(`rm -rf ${temporaryDeploymentDirectory}`, workspace);
  await execute(
    `git checkout --progress --force ${action.defaultBranch}`,
    workspace
  );

  return Promise.resolve("Commit step complete...");
}
