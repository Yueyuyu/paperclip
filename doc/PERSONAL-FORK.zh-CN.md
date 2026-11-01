# 个人定制版维护说明

本 fork 为本地任务工作台增加简体中文。任务、评论、用户命名、模型回答和日志原文不做机器替换。

## 分支与上游更新

- `master`：官方 `paperclipai/paperclip:master` 的镜像，不在此开发个人功能。
- `main`：个人定制和部署分支，默认使用简体中文。
- `codex/*`：后续功能分支，从 `main` 创建，完成检查后合入 `main`。

`Fork - sync upstream` 每天北京时间 05:17 运行，也可在 Actions 手动运行。GitHub 可能延迟定时任务。工作流更新镜像分支，并维护一个 `master → main` 草稿合并请求。它不会强制覆盖定制分支，也不会自动合并或部署。

工作流显式触发 `Fork - verify custom build`，验证合并后的代码。自动创建的 PR 使用 `GITHUB_TOKEN`，不能依赖普通 PR 事件再次触发测试。测试失败或冲突时先处理再合并；不要使用 `reset --hard upstream/master` 更新定制分支。

源码同步、镜像构建、数据库升级和运行实例切换是四个独立步骤。网页不会因为 GitHub 上有新提交就自动升级。长期无活动的公开 fork 可能被 GitHub 暂停定时工作流，应在 Actions 中检查是否仍启用。

## 中文维护

浏览器首次访问默认中文；账户菜单提供“界面语言”。切换时明确点击“应用并刷新”，以便模块级选项也采用新语言。刷新前先保存编辑内容。语言选择保存在当前浏览器，无法使用存储时会显示错误，不伪装保存成功。

- 核心语言资源：`ui/src/i18n/copy/zh-CN.json`。
- 静态文案调用：`translateUi("English source text")`，未知文案回退英文。
- 任务状态只翻译显示值，API 中仍使用 `todo`、`in_progress`、`in_review`、`done` 等原始值。
- `fork-copy-scope.json` 列出当前覆盖的核心页面与组件。
- 保留上游三键、多语言资源验证；定制文案使用单独的 `ui` 命名空间。

执行 `node scripts/fork-ui-copy.mjs --check` 检查覆盖范围内新增的静态 JSX 文案及缺失翻译。使用 `--json` 查看待翻译项，补充资源后使用 `--apply` 接入已确认的静态文案。脚本不修改任意运行时字符串、路由或 API 状态。仍需人工检查动态模板、组合句、无障碍标签和范围以外的新页面；静态扫描通过不等于全站已翻译。

当前范围包括导航、总览、任务列表与看板、新建任务、附件、任务详情、审核、Agent 配置、项目、循环任务和主要设置。连接器专有配置、实验页面、部分动态提示及上游日志仍可能显示英文。后续同步时持续扩展，不能把这部分描述成全站 100% 中文。

验证：`pnpm --filter @paperclipai/ui typecheck`、UI Vitest 测试、UI build，以及真实浏览器。完整发布还需根目录 AGENTS.md 要求的全仓检查。

## WSL2 与 Docker 运行

先完成 Windows 重启并安装 Ubuntu 24.04，再在 Ubuntu 中运行 `scripts/personal/install-docker-ubuntu.sh`。该脚本使用 Docker 官方 apt 仓库，安装 Engine、Buildx 和 Compose；不安装 Docker Desktop。

`docker/compose.personal.yml` 明确使用官方 Dockerfile 的 `production` target。服务器与数据库仅监听 WSL 主机的 `127.0.0.1`，保留 `local_trusted` 模式和 `local-board` 人工审批身份。不要改成 `0.0.0.0` 绕过本地模式约束。此 compose 仅适用于 Linux/WSL，不适用于公网部署。

在仓库外建立私有环境文件，设置：

```dotenv
PAPERCLIP_RUNTIME_ROOT=/home/paperclip/runtime
PAPERCLIP_DB_PASSWORD=<使用随机十六进制密码，避免 URL 转义问题>
PAPERCLIP_BUILD_COMMIT=<完整且已验证的提交 SHA>
PAPERCLIP_PORT=3111
```

不要提交这个环境文件、数据库、Codex 登录、Paperclip 密钥、截图附件或工作区。源码中仅保留配置模板。构建命令：

```bash
docker compose --env-file /path/outside/repo/runtime.env -f docker/compose.personal.yml build paperclip
```

## 数据迁移与回滚顺序

1. 保存旧实例数据库的官方逻辑备份；另行复制实例配置、加密主密钥、上传附件、Agent 文件及项目工作区。Windows 的 PostgreSQL 数据目录不能直接当 Linux 数据目录使用。
2. 记录旧实例的公司、Agent、项目、任务、评论、审批、工作产物和附件数量、ID、状态及附件哈希。
3. 在独立目录恢复数据库和文件，只启动数据库服务。新库中的 Agent 先暂停，避免与旧实例同时执行任务；保留原状态清单。
4. 仅更换运行配置中的 Windows 路径：实例根目录映射到 `/paperclip/instances/default`，试点工作区映射到 `/workspaces/pilot/workspace`。保留历史任务文字与审计原文。同步项目工作区、Agent cwd、指令文件及本地工具路径。
5. 移除 Windows 专属兼容参数，使用 Linux Codex 和独立持久认证目录。验证实际执行的版本、登录身份及对图片文件的访问，不打印认证内容。
6. 在 3111 启动新服务器，应用官方数据库迁移，逐字段比较原任务与人工审批状态，并验证附件下载哈希、交付物及预览。完成一次新的隔离验收任务后，由用户审核，不能代为批准历史任务。
7. 停止旧实例的执行入口，重新取最终备份并同步迁移窗口内的变化；再次核对后切换到 3100 和桌面入口。恢复按需唤醒设置，并确认旧实例不会同时自动启动。
8. 保留原安装与完整备份。回滚时停新实例，恢复旧入口；不要用旧程序打开已升级的数据库。若新实例已产生业务数据，先备份并制定反向迁移，不能直接丢弃。

本文件和 compose 是可审阅的迁移准备，不是已完成恢复或运行验证的证明。

参考：[Docker 官方 Ubuntu 安装](https://docs.docker.com/engine/install/ubuntu/)、[微软 WSL 安装](https://learn.microsoft.com/en-us/windows/wsl/install)、[GitHub 同步 fork API](https://docs.github.com/en/rest/branches/branches#sync-a-fork-branch-with-the-upstream-repository)。
