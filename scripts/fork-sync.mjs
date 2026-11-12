import {execFileSync} from 'node:child_process';
import {appendFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function syncUpstream({repo, credentialConfigured, gh}) {
  if (repo !== 'Yueyuyu/paperclip') throw new Error('This sync job is restricted to the personal fork.');
  const api = (...args) => JSON.parse(gh('api', ...args));
  if (!credentialConfigured) {
    // 直接比较真正的上游，不能只看停留在旧提交的 master 镜像而误报“已同步”。
    const main = api(`repos/${repo}/compare/main...paperclipai:master`);
    const mirror = api(`repos/${repo}/compare/master...paperclipai:master`);
    const pending = main.ahead_by > 0 || mirror.ahead_by > 0;
    return {
      status: pending ? 'manual-sync-required' : 'up-to-date',
      mainBehindUpstream: main.ahead_by,
      mirrorBehindUpstream: mirror.ahead_by,
      summary: pending
        ? `待人工同步：main 尚缺上游 ${main.ahead_by} 个提交，master 镜像尚缺 ${mirror.ahead_by} 个提交。\n未配置 FORK_SYNC_TOKEN，仅完成更新检测；未更新分支、创建 PR 或部署。\n请按 doc/PERSONAL-FORK.zh-CN.md 处理。\n`
        : '检测完成：main 与 master 已包含当前上游提交。未进行写入或部署。\n',
    };
  }

  // 仅专用凭据可更新包含工作流文件的镜像；分叉冲突、权限或网络错误必须继续报错。
  const synced = api(`repos/${repo}/merge-upstream`, '--method', 'POST', '-f', 'branch=master');
  const comparison = api(`repos/${repo}/compare/main...master`);
  if (comparison.ahead_by === 0) return {status:'up-to-date', summary:'镜像已检查，main 已包含当前上游提交。未合并或部署。\n'};
  const existing = JSON.parse(gh('pr', 'list', '--repo', repo, '--base', 'main', '--head', 'master', '--state', 'open', '--json', 'number,url'));
  let pull = existing[0];
  if (!pull) {
    gh('pr', 'create', '--repo', repo, '--base', 'main', '--head', 'master', '--draft',
      '--title', 'chore: 同步 Paperclip 官方更新', '--body-file', '.github/fork-sync-pr.md');
    pull = JSON.parse(gh('pr', 'view', 'master', '--repo', repo, '--json', 'number,url'));
  }
  // 专用 PAT/App 凭据产生的 PR / synchronize 事件会执行 fork-verify；
  // 不再每日重复 dispatch 同一个未变化的 PR。
  return {status:'review-required', pullRequest:pull.url, mirrorResult:synced.merge_type ?? synced.message,
    summary:`镜像更新已完成，定制分支待人工审阅：${pull.url}\n新建或更新 PR 时由 pull_request 事件验证；未变化的 PR 不重复验证。未自动合并或部署。\n`};
}

export function main() {
  const result = syncUpstream({
    repo:process.env.GH_REPO,
    credentialConfigured:process.env.FORK_SYNC_CREDENTIAL_CONFIGURED === 'true',
    gh:(...args) => execFileSync('gh', args, {encoding:'utf8', maxBuffer:32 * 1024 * 1024}).trim(),
  });
  writeFileSync('fork-sync-status.json', JSON.stringify(result, null, 2) + '\n');
  console.log(result.summary);
  if (result.status === 'manual-sync-required') console.log('::warning::上游有更新，待人工同步；未配置专用同步凭据。');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## 上游更新状态\n\n' + result.summary);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
