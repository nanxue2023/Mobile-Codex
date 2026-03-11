# Mobile Codex

[English](./README.md)

面向手机的 Codex 远程控制 MVP。

这个项目的目标是：在不直接暴露开发服务器的前提下，通过手机完成 Codex 任务提交、预定义动作执行和日志查看。

## ✨ 功能

- 通过手机友好的 Web UI 提交 `codex exec` 任务
- 执行预定义动作
- 读取预定义日志源
- 在浏览器中完成 agent 配对与撤销
- 默认关闭高风险能力

## 🏗️ 结构

- `relay/`：对外的消息中转与 PWA 静态站点
- `agent/`：运行在工作区旁边的本地执行器
- `web/`：移动端界面
- `config/`：示例配置
- `docs/`：教程、部署、安全与运维文档

## 🔐 安全默认值

- 默认没有任意远程 shell
- 默认没有任意文件读取
- 默认关闭 `codexExecWrite`
- agent 只需要主动连接 relay
- relay 和 agent 两侧都会校验功能开关

## 🚀 快速开始

### 本地测试

1. 运行 `npm run init:relay`
2. 运行 `npm run init:agent`
3. 用 `npm run relay:start` 启动 relay
4. 打开网页并创建 pairing code
5. 用 `npm run agent:pair -- --pair-code YOUR_CODE` 完成配对
6. 后续用 `npm run agent:start` 正常启动 agent

### 正式部署

1. 运行 `npm run init:relay -- --mode production`
2. 运行 `npm run init:agent -- --mode production`
3. 用 `npm run scaffold:production` 生成部署模板
4. 从 `deploy/generated/` 复制生成的 `systemd` 和 `Caddy` 模板
5. 用 `npm run relay:start -- --config /etc/mobile-codex/relay.prod.json` 启动 relay
6. 打开网页，创建 pairing code，并使用网页建议的配对命令

如果你需要完整的手工部署流程或主机加固细节，再看详细教程和部署文档。

## 📚 文档

- [详细教程](./docs/TUTORIAL.md)
- [正式部署](./docs/DEPLOYMENT.md)
- [安全模型](./docs/SECURITY.md)
- [功能开关说明](./docs/FEATURE_FLAGS.md)
- [运维与回滚](./docs/OPERATIONS.md)
- [架构说明](./docs/ARCHITECTURE.md)

## 🧼 仓库约定

仓库默认不包含：

- 本地运行状态
- 已配对的 agent token
- 本地 `.local.json` 配置
- 与具体机器绑定的路径信息

你需要从示例配置复制自己的本地配置：

- [config/relay.example.json](./config/relay.example.json)
- [config/agent.example.json](./config/agent.example.json)
