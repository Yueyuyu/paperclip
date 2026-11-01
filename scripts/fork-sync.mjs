import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const repo = process.env.GH_REPO;
if (repo !== "Yueyuyu/paperclip") throw new Error("This sync job is restricted to the personal fork.");
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const api = (...args) => JSON.parse(gh("api", ...args));

// GitHub rejects diverged mirror history instead of force-resetting it.
const synced = api(`repos/${repo}/merge-upstream`, "--method", "POST", "-f", "branch=master");
const comparison = api(`repos/${repo}/compare/main...master`);
let summary = `Mirror sync: ${synced.merge_type ?? synced.message}\n`;
if (comparison.ahead_by > 0) {
  const existing = JSON.parse(gh("pr", "list", "--repo", repo, "--base", "main", "--head", "master", "--state", "open", "--json", "number,url"));
  let pull = existing[0];
  if (!pull) {
    gh("pr", "create", "--repo", repo, "--base", "main", "--head", "master", "--draft",
      "--title", "chore: 同步 Paperclip 官方更新",
      "--body-file", ".github/fork-sync-pr.md");
    pull = JSON.parse(gh("pr", "view", "master", "--repo", repo, "--json", "number,url"));
  }
  summary += `Review the upstream changes: ${pull.url}\n`;
  // GITHUB_TOKEN-created PRs do not trigger pull_request workflows. Dispatch
  // verification explicitly; it tests the prospective merge, never just master.
  gh("workflow", "run", "fork-verify.yml", "--repo", repo, "--ref", "main", "-f", `pull_request=${pull.number}`);
  summary += "Verification was requested. No changes were merged into main or deployed.\n";
} else {
  summary += "main already contains the current upstream commits.\n";
}
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
