# Codex Bridge MVP

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

1. 复制示例配置
2. 按详细教程进行本地测试
3. 本地跑通后再进入正式部署

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
