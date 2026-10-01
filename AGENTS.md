# 云端应用制作

唯一开放仓库为 jiangfengwhu/zjh-plugin，不访问或克隆 SDK、Android、server 或旧单体仓库。main 只由维护者管理官方应用、模板和公共工具；用户应用一直在 Jules 自动创建的专属分支迭代，不同步 main，不合入 main。

## 实现

先阅读目标应用代码，保留应用 ID、数据键和模块范围。一次心愿只修改 apps/<目标id>/ 与必要的根 package-lock.json；SDK 升级可以更新根 package.json 中 @zijinhua/app-sdk 的版本。不要修改其他应用或平台。

新应用执行 npm run init:application -- <id>，moduleBase 由平台分配，不自行扫描或改范围。src/index.ts 默认导出 SDK defineApp。main 页面延迟加载，avatar/cards 按需登记。application.json 填写面向用户的 title、summary、mark、accent，不以 appId 命名。

只导入 @zijinhua/app-sdk、/ui、/creation 与 platform.json 公开共享入口。制作服务仅授权 Jolly。存储、动态、导航、手机能力和资源通过 getAppContext() 获取，不导入宿主或其他应用源码，不虚构 API、硬编码或输出凭证。共享原生依赖由 SDK 精确安装；额外纯 JS 库声明在应用 package.json，更新根锁文件。新的原生能力交维护者协调。应用 package.json 只保留 name/private 与自己的纯 JS 依赖，版本在 application.json 维护。

## 分支与发布

1. npm ci 安装当前分支锁定的 SDK。使用 SDK 1.1.8 或更新版本；已有分支如工具过旧，按平台提示升级 SDK，无需同步 main。默认不单独执行类型检查、测试或预览，打包所需构建与运行时兼容检查继续执行。
2. 后续需求继续 checkout 平台记录的应用分支，保留既有修改；不为每轮创建新的分支或 PR。Jules 自动导出的 PR 只是分支信息，不是交付条件，不要求审查或合并。
3. 完成源码后先提交全部改动，确保 git status 干净。
4. 用本轮平台授权执行 zjh-app authorize <id> '<grant>'；授权只存 Git 元数据，不输出或提交。运行 npm run publish:application -- <id> 自动构建并发布候选，不以 build 代替发布，不改工具绕过错误。
5. 上传及清单写入成功后才报告“候选已发布，等待体验与收下”。用户收下只选定该包版本，不合入代码；作者之后主动决定是否上架。候选、已收下和公开指针独立，更新候选不影响旧公开版本。

source.repository 为 jiangfengwhu/zjh-plugin，source.commit/tree 记录真实源码，source.dirty=false。应用无需检查 main 或 PR 提交基线；服务端以本轮授权和 expectedReleases 原子比较防止旧任务覆盖新候选。409 时先接回最新状态，不强推或直接覆盖存储。

平台为每个应用绑定作者和一个 Jules session；同一应用同一时间仅进行一轮制作，多设备共用服务端状态，不另开会话绕过锁。不同应用可并行。授权缺失、过期或轮次失效时保留代码并报告阻塞。不得使用共享 R2、BUNDLE_CATALOG_TOKEN、OFFICIAL_PUBLISH_TOKEN、Wrangler、管理权限或官方 release 接口。

## Remix

平台创建新 appId、模块范围、作者归属和独立分支，从原作对应分支开始。init 读取锁定的 originalCommit 复制原作 src/assets 和纯 JS 依赖，保留新 appId/moduleBase，记录 originalAppId/originalReleaseId/originalCommit。不得在原作者分支上编辑，也不改用 main 的源码。早期不要求数据迁移，开发阶段不做市场审核。

最后用中文说明实现、实际发布结果和剩余限制。跨仓库需求说明所需 API，由维护者处理。
