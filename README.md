# zjh-plugin

紫金花应用源码仓库。所有应用通过目录管理，main 是稳定集成分支；制作任务在短期分支上提交 PR。模板位于 templates/basic，不为每个应用维护长期分支。

- apps/jolly：默认安装的伙伴与工坊。
- apps/notepad：记事本。
- apps/pomodoro：番茄钟。
- templates/basic：新应用模板。

使用 Node.js 22.11 以上，运行 npm ci。SDK、工具链与依赖由 package-lock.json 固定；目前 SDK 以 CDN 上不可变 npm tarball 安装，公开 npm registry 发布后再切换依赖地址。

新增应用：npm run init:application -- <id>。页面入口在 apps/<id>/src/index.ts，媒体在 assets/。只使用 SDK 公开 API；纯 JS 依赖声明在对应应用 package.json，并更新根锁文件。不要引用宿主或其他应用源码。

提交全部源码后运行 npm run publish:application -- <id>，发布独立 Hermes 包和媒体。发布检查依赖兼容性、源码提交基线、模块范围及存储结构版本。产物在 dist/applications/<id>/，不提交 Git。

AI Coding 输入为本文件、AGENTS.md、目标应用、SDK 公开类型、SDK platform.json、模板及根锁文件；不需要访问 SDK/Android/server 仓库。
SDK、宿主和工具由 jiangfengwhu/zjh-dynamic 维护。新增原生能力、共享依赖升级与 SDK 契约变更交给平台维护者。

Jolly 的主页在 apps/jolly/src/Home.tsx，工坊是它内部的页面。应用市场由平台维护；新创作的应用不会自动公开上架。
