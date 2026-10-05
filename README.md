# zjh-plugin

紫金花应用源码在 `apps/<id>/`，新应用模板在 `templates/basic/`。

Node.js ≥22.11.0；仓库根目录执行 `npm ci`。

| 命令 | 用途 |
| --- | --- |
| `npm run init:application -- <id>` | 初始化新应用 |
| `npm run publish:application -- <id>` | 构建并发布候选 |

约束与交付见 [AGENTS.md](AGENTS.md)。SDK 用法、公共类型和共享库清单按需查 `node_modules/@zijinhua/app-sdk/` 中的 `README.md`、`dist/*.d.ts`、`dist/libraries.md`。
