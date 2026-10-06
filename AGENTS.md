# 云端应用 Agent

仅改 `apps/<id>/` 及必要的根锁文件。身份、授权、分支和原作版本按任务；不改原作、不合入 main、不新建分支或 PR，不泄露授权或使用全局凭据。

Node.js ≥22.11.0。开工先切到指定任务分支（未指定则使用本会话分支），根目录执行 `git fetch origin && git merge --no-edit origin/main && npm ci`，再按任务授权；仅新应用执行 `npm run init:application -- <id>`。

开发规则查 `node_modules/@zijinhua/app-sdk/README.md`；参数和共享库按需查该包的 `dist/*.d.ts`、`dist/libraries.md`。不升级 SDK、不虚构 API、不绕过校验。

完成后执行 `npm run publish:application -- <id>`，自动构建并发布候选。仅上传和清单写入成功才报告发布成功；失败用中文说明原因。上架由作者决定。默认不另跑构建、类型检查、测试或预览。
