"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const execute_1 = require("./execute");
const fs_1 = require("fs");
const util_1 = require("util");
const util_2 = require("./util");
const constants_1 = require("./constants");
/** Generates the branch if it doesn't exist on the remote.
 * @returns {Promise}
 */
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (util_2.isNullOrUndefined(constants_1.action.accessToken) &&
                util_2.isNullOrUndefined(constants_1.action.gitHubToken) &&
                util_2.isNullOrUndefined(constants_1.action.deployKey)) {
                return core.setFailed("You must provide the action with either a Personal Access Token or the GitHub Token secret in order to deploy.");
            }
            if (!util_2.isNullOrUndefined(constants_1.action.deployKey)) {
                const createFile = util_1.promisify(fs_1.appendFile);
                yield execute_1.execute(`mkdir -p ${constants_1.ssh}`, constants_1.workspace);
                createFile(`${constants_1.ssh}/known_hosts`, '\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n');
                createFile(`${constants_1.ssh}/known_hosts`, '\ngithub.com ssh-dss AAAAB3NzaC1kc3MAAACBANGFW2P9xlGU3zWrymJgI/lKo//ZW2WfVtmbsUZJ5uyKArtlQOT2+WRhcg4979aFxgKdcsqAYW3/LS1T2km3jYW/vr4Uzn+dXWODVk5VlUiZ1HFOHf6s6ITcZvjvdbp6ZbpM+DuJT7Bw+h5Fx8Qt8I16oCZYmAPJRtu46o9C2zk1AAAAFQC4gdFGcSbp5Gr0Wd5Ay/jtcldMewAAAIATTgn4sY4Nem/FQE+XJlyUQptPWMem5fwOcWtSXiTKaaN0lkk2p2snz+EJvAGXGq9dTSWHyLJSM2W6ZdQDqWJ1k+cL8CARAqL+UMwF84CR0m3hj+wtVGD/J4G5kW2DBAf4/bqzP4469lT+dF2FRQ2L9JKXrCWcnhMtJUvua8dvnwAAAIB6C4nQfAA7x8oLta6tT+oCk2WQcydNsyugE8vLrHlogoWEicla6cWPk7oXSspbzUcfkjN3Qa6e74PhRkc7JdSdAlFzU3m7LMkXo1MHgkqNX8glxWNVqBSc0YRdbFdTkL0C6gtpklilhvuHQCdbgB3LBAikcRkDp+FCVkUgPC/7Rw==\n');
                constants_1.action.deployKey.split(/(?=-----BEGIN)/).forEach(function (key) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield execute_1.execute(`ssh-add -${key.trim() + "\n"}`, constants_1.ssh);
                    });
                });
            }
            if (constants_1.action.build.startsWith("/") || constants_1.action.build.startsWith("./")) {
                return core.setFailed(`The deployment folder cannot be prefixed with '/' or './'. Instead reference the folder name directly.`);
            }
            yield execute_1.execute(`git init`, constants_1.workspace);
            yield execute_1.execute(`git config user.name ${constants_1.action.name}`, constants_1.workspace);
            yield execute_1.execute(`git config user.email ${constants_1.action.email}`, constants_1.workspace);
            yield execute_1.execute(`git remote rm origin`, constants_1.workspace);
            yield execute_1.execute(`git remote add origin ${constants_1.repositoryPath}`, constants_1.workspace);
            yield execute_1.execute(`git fetch`, constants_1.workspace);
        }
        catch (error) {
            core.setFailed(`There was an error initializing the repository: ${error}`);
        }
        finally {
            return Promise.resolve("Initialization step complete...");
        }
    });
}
exports.init = init;
/** Switches to the base branch.
 * @returns {Promise}
 */
function switchToBaseBranch() {
    return __awaiter(this, void 0, void 0, function* () {
        yield execute_1.execute(`git checkout --progress --force ${constants_1.action.baseBranch ? constants_1.action.baseBranch : constants_1.action.defaultBranch}`, constants_1.workspace);
        return Promise.resolve("Switched to the base branch...");
    });
}
exports.switchToBaseBranch = switchToBaseBranch;
/** Generates the branch if it doesn't exist on the remote.
 * @returns {Promise}
 */
function generateBranch() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Creating ${constants_1.action.branch} branch... 🔧`);
            yield switchToBaseBranch();
            yield execute_1.execute(`git checkout --orphan ${constants_1.action.branch}`, constants_1.workspace);
            yield execute_1.execute(`git reset --hard`, constants_1.workspace);
            yield execute_1.execute(`git commit --allow-empty -m "Initial ${constants_1.action.branch} commit."`, constants_1.workspace);
            yield execute_1.execute(`git push ${constants_1.repositoryPath} ${constants_1.action.branch}`, constants_1.workspace);
            yield execute_1.execute(`git fetch`, constants_1.workspace);
        }
        catch (error) {
            core.setFailed(`There was an error creating the deployment branch: ${error} ❌`);
        }
        finally {
            return Promise.resolve("Deployment branch creation step complete... ✅");
        }
    });
}
exports.generateBranch = generateBranch;
/** Runs the necessary steps to make the deployment.
 * @returns {Promise}
 */
function deploy() {
    return __awaiter(this, void 0, void 0, function* () {
        const temporaryDeploymentDirectory = "gh-action-temp-deployment-folder";
        const temporaryDeploymentBranch = "gh-action-temp-deployment-branch";
        /*
            Checks to see if the remote exists prior to deploying.
            If the branch doesn't exist it gets created here as an orphan.
          */
        const branchExists = yield execute_1.execute(`git ls-remote --heads ${constants_1.repositoryPath} ${constants_1.action.branch} | wc -l`, constants_1.workspace);
        if (!branchExists) {
            console.log("Deployment branch does not exist. Creating....");
            yield generateBranch();
        }
        // Checks out the base branch to begin the deployment process.
        yield switchToBaseBranch();
        yield execute_1.execute(`git fetch ${constants_1.repositoryPath}`, constants_1.workspace);
        yield execute_1.execute(`git worktree add --checkout ${temporaryDeploymentDirectory} origin/${constants_1.action.branch}`, constants_1.workspace);
        // Ensures that items that need to be excluded from the clean job get parsed.
        let excludes = "";
        if (constants_1.action.clean && constants_1.action.cleanExclude) {
            try {
                const excludedItems = JSON.parse(constants_1.action.cleanExclude);
                excludedItems.forEach((item) => (excludes += `--exclude ${item} `));
            }
            catch (_a) {
                console.log("There was an error parsing your CLEAN_EXCLUDE items. Please refer to the README for more details. ❌");
            }
        }
        /*
          Pushes all of the build files into the deployment directory.
          Allows the user to specify the root if '.' is provided.
          rysync is used to prevent file duplication. */
        yield execute_1.execute(`rsync -q -av --progress ${constants_1.action.build}/. ${constants_1.action.targetFolder
            ? `${temporaryDeploymentDirectory}/${constants_1.action.targetFolder}`
            : temporaryDeploymentDirectory} ${constants_1.action.clean
            ? `--delete ${excludes} --exclude CNAME --exclude .nojekyll`
            : ""}  --exclude .ssh --exclude .git --exclude .github ${constants_1.action.build === constants_1.root ? `--exclude ${temporaryDeploymentDirectory}` : ""}`, constants_1.workspace);
        const hasFilesToCommit = yield execute_1.execute(`git status --porcelain`, temporaryDeploymentDirectory);
        if (!hasFilesToCommit && !constants_1.isTest) {
            console.log("There is nothing to commit. Exiting... ✅");
            return Promise.resolve();
        }
        // Commits to GitHub.
        yield execute_1.execute(`git add --all .`, temporaryDeploymentDirectory);
        yield execute_1.execute(`git checkout -b ${temporaryDeploymentBranch}`, temporaryDeploymentDirectory);
        yield execute_1.execute(`git commit -m "${!util_2.isNullOrUndefined(constants_1.action.commitMessage)
            ? constants_1.action.commitMessage
            : `Deploying to ${constants_1.action.branch} from ${constants_1.action.baseBranch}`} - ${process.env.GITHUB_SHA} 🚀" --quiet`, temporaryDeploymentDirectory);
        yield execute_1.execute(`git push --force ${constants_1.repositoryPath} ${temporaryDeploymentBranch}:${constants_1.action.branch}`, temporaryDeploymentDirectory);
        // Cleans up temporary files/folders and restores the git state.
        console.log("Running post deployment cleanup jobs... 🔧");
        yield execute_1.execute(`rm -rf ${temporaryDeploymentDirectory}`, constants_1.workspace);
        yield execute_1.execute(`git checkout --progress --force ${constants_1.action.defaultBranch}`, constants_1.workspace);
        return Promise.resolve("Commit step complete...");
    });
}
exports.deploy = deploy;
