# Mobile Codex

[English](./README.md)

面向手机的 Codex 远程控制 MVP。

Mobile Codex 的目标是：在不直接暴露 SSH、完整 IDE 或原始 shell 的前提下，通过手机完成 Codex 任务提交、会话续接、预定义动作执行和日志查看。当前版本已经支持真正的多用户隔离：用户、工作区、邀请和 passkey 都是独立的。

项目由三部分组成：

- `relay`：对外的控制平面和 PWA 静态站点
- `agent`：运行在工作区旁边的私有执行器
- `web`：面向手机的操作界面

## ✨ 功能

- 通过手机友好的 Web UI 提交 `codex exec` 任务
- 删除当前 agent 上不需要的 Codex 会话
- 执行预定义动作
- 读取预定义日志源
- 在浏览器中完成 agent 配对与撤销
- 支持“短配对码 + 手机批准”的 agent 配对
- 支持用 passkey 进行日常登录，把 bootstrap token 降级为 owner 恢复入口
- 支持按 workspace 隔离不同的人、设备或环境
- 支持通过 invite code 把新用户加入指定 workspace，而不共享 owner 恢复口令
- 默认关闭高风险能力

## 🔐 安全默认值

- 默认没有任意远程 shell
- 默认没有任意文件读取
- 默认关闭 `codexExecWrite`
- agent 只需要主动连接 relay
- relay 和 agent 两侧都会校验功能开关
- 日常登录使用 `HttpOnly` same-site cookie，而不是浏览器可读 token
- relay 在服务端按 workspace 隔离 users、memberships、agents、tasks 和 pair requests
- relay 磁盘只保存最小元数据，任务细节和会话预览不落盘
- Codex 会话预览来自 agent，本地浏览器可缓存，relay 仅在内存中暂存
- agent token 存放在独立的 state 目录中，不回写到配置文件
- WebAuthn/passkey 按用户绑定；`bootstrap token` 主要用于 owner 首次绑定和恢复

## 🏗️ 仓库结构

- `relay/`：对外的消息中转与 PWA 静态站点
- `agent/`：运行在工作区旁边的本地执行器
- `web/`：移动端界面
- `config/`：示例配置
- `docs/`：教程、部署、安全与运维文档

## 🚀 快速开始

### 本地测试

1. 运行 `npm run init:relay`
2. 运行 `npm run init:agent`
3. 用 `npm run relay:start` 启动 relay
4. 用 bootstrap token 以 owner 身份登录并注册 passkey
5. 在目标 workspace 中创建短配对码
6. 用 `npm run agent:pair -- --pair-code YOUR_CODE` 完成配对
7. 在手机上批准待配对设备
8. 后续用 `npm run agent:start` 正常启动 agent

### 正式部署

1. 运行 `npm run init:relay -- --mode production`
2. 运行 `npm run init:agent -- --mode production`
3. 用 `npm run scaffold:production` 生成部署模板
4. 从 `deploy/generated/` 复制生成的 `systemd` 和 `Caddy` 模板
5. 用 `npm run relay:start -- --config /etc/mobile-codex/relay.prod.json` 启动 relay
6. 以 owner 身份登录，注册 passkey，并按需要创建 workspace 或 invite
7. 在目标 workspace 中创建短配对码，在 agent 机器上运行网页建议的命令，然后在手机上批准待配对设备

如果你需要完整的手工部署流程或主机加固细节，再看详细教程和部署文档。

## 📚 文档

- [详细教程](./docs/TUTORIAL.md)
- [正式部署](./docs/DEPLOYMENT.md)
- [单用户升级到多用户](./docs/MIGRATION.md)
- [安全模型](./docs/SECURITY.md)
- [功能开关说明](./docs/FEATURE_FLAGS.md)
- [运维与回滚](./docs/OPERATIONS.md)
- [架构说明](./docs/ARCHITECTURE.md)
- [贡献指南](./CONTRIBUTING.md)

## 🤝 贡献

欢迎贡献，尤其是部署加固、移动端交互和更细粒度安全控制相关的改进。

提交 PR 前建议先看 [CONTRIBUTING.md](./CONTRIBUTING.md)，并确保：

- 默认安全边界没有被放宽
- 不提交本地配置、运行态文件或已配对 token
- 行为或部署方式变化时同步更新文档

## 🧼 仓库约定

仓库默认不包含：

- 本地运行状态
- 已配对的 agent token
- 本地 `.local.json` 配置
- 与具体机器绑定的路径信息

你需要从示例配置复制自己的本地配置：

- [config/relay.example.json](./config/relay.example.json)
- [config/agent.example.json](./config/agent.example.json)

## 📄 许可证

[MIT](./LICENSE)
