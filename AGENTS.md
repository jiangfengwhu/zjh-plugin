# 云端应用制作

本文件面向 Jules 等云端 Coding Agent。唯一开放仓库为 jiangfengwhu/zjh-plugin；不访问或克隆 SDK、Android、server 或旧单体仓库。

## 实现

先阅读目标应用代码，保留既有数据键与应用 ID，完成可使用的功能。一次心愿只交付一个 apps/<id>/ 应用，包括页面、动态、头像和媒体。main 为所有应用的稳定集成分支，模板在 templates/basic。
新增应用执行 npm run init:application -- <id>；moduleBase 由平台提前分配并通过初始化工具读取，不自行扫描目录分配或修改既有范围。早期不要求兼容旧数据或编写数据迁移。src/index.ts 默认导出 SDK defineApp。main 延迟加载页面，avatar/cards 按需登记，动态内容由应用自绘。

只导入 @zijinhua/app-sdk、/ui、/creation 及 SDK platform.json 公开的共享入口；制作服务仅授权 Jolly。存储、动态、导航、手机能力、资源 URI 通过 getAppContext() 获取。不要导入其他应用及宿主源码，不虚构接口或硬编码凭证。共享 RN 库、React 类型与 TypeScript 由 SDK 精确安装，不在根或应用 package.json 重复声明、使用别名或 overrides 改写；标准公开入口仍可直接导入。额外纯 JS 库声明在应用 package.json，并更新根 package-lock.json；新的原生能力交给本地维护者。

## 必须发包

1. npm ci 安装 SDK 和工具链。默认不单独执行类型检查、测试或预览，发布必要的构建与兼容检查仍执行。
2. 完成源码后先提交全部改动，确保 git status 干净。
3. 运行 npm run publish:application -- <id>。不以 build 命令代替发布；不修改 SDK 或校验绕过错误。
4. 按既有流程创建 PR；清单 source.repository 应为 jiangfengwhu/zjh-plugin，source.commit 必须等于最终 PR head，source.dirty 必须为 false。任何源码再次提交都必须重新发布。
5. 不自行合入 main 或强推。用户加载体验后在工坊确认收下，由平台核对运行版本后合入 PR。

基线不一致时获取本仓库历史并处理冲突，保留他人修改；不覆盖线上版本。使用 SDK 1.1.4 或更新版本，按本轮平台提示先执行 zjh-app authorize <id> '<grant>'，授权只存入 Git 元数据。只通过服务端接口上传本应用包体与候选；不使用共享 R2、BUNDLE_CATALOG_TOKEN、管理权限、Wrangler 登录或直接写 KV。不得输出或提交授权；授权缺失、过期或轮次失效时保留代码并报告阻塞。

最后用中文说明实现、实际发布结果及剩余限制；只有上传和清单写入成功才能报告已发布。跨仓库需求说明所需 API，由本地维护者处理。

## Session 与并行

平台指定目标 appId 与模块范围；一个应用绑定一个 Jules session，后续修改仍在同一 session，新应用才创建新 session。不同应用可并行，同一应用等待当前轮收下后再改。一次 PR 仅修改 apps/<目标id>/ 和必要的根 package-lock.json，不修改其他应用或平台。

同一 session 的已收下 PR 不再续写；从 origin/main 同步后创建新的任务分支与 PR。别的应用先合入允许继续交付；有合入冲突或本应用基线改变时，在当前 session 同步 main、保留他人修改、提交后重新发布。

基于他人作品创作时 init 从平台锁定的 originalCommit 复制 src/assets 和纯 JS 依赖，保留新 appId/moduleBase，application.json 记录 originalAppId、originalReleaseId、originalCommit，不改用 main 上的新版本或修改原作。分享由用户在收下后提交审核，维护者审核执行版本后才上架。

根 package.json 只声明 SDK 与仓库脚本。应用 package.json 仅保留 name/private 与应用自己的纯 JS 依赖，不维护重复 version；应用版本以 application.json 为准。

## 版本流转边界

SDK 1.1.4 的 publish:application 只上传候选，不更新已收下或公开指针。候选基线受鉴权保护，使用本应用本轮授权读取；不要去掉身份头或改读公开版本绕过候选基线。发布工具提交预期候选版本，由服务端按应用串行并原子比较；遇到 409 冲突时同步最新基线、处理冲突并重新发布，不直接覆盖候选或写 KV。用户收下后更新 accepted，主动分享并经维护者审核后才更新 public；审核期间保留旧公开版本。内置应用也遵守这个边界。不得调用官方 release、审核接口或请求 OFFICIAL_PUBLISH_TOKEN。候选发包成功应说明“候选已发布，等待体验与收下”。
