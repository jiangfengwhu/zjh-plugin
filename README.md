# zjh-plugin

紫金花应用源码仓库：apps/<id>/ 按应用管理，apps/jolly 是默认安装的伙伴与工坊，templates/basic 是新应用模板。SDK、RN 宿主与构建工具由 zjh-dynamic 维护。

使用 Node.js >=22.11.0，在仓库根目录运行 npm ci。根依赖和锁文件固定 SDK，应用接入、公开能力及依赖规则见安装包 node_modules/@zijinhua/app-sdk/README.md，共享库清单在其 dist/libraries.md。

| 命令 | 用途 |
| --- | --- |
| npm run init:application -- <id> | 用模板和平台分配的模块范围初始化应用，需要发布授权 |
| npm run build:application -- <id> | 仅构建，产物在 dist/applications/<id>/ |
| npm run publish:application -- <id> | 自动构建并发布候选，不自动上架 |

云端任务读取 [AGENTS.md](AGENTS.md)、目标应用、模板、锁文件及安装 SDK 的文档和公共类型，无需访问其他仓库。分支、任务范围和交付要求统一维护在 AGENTS.md。
