#!/usr/bin/env bun

import {
  readPayload,
  findHookEvent,
  findToolName,
  findToolInput,
  findCommand,
  findWorkdir,
  findSessionId,
  SESSION_HOOK_NAMES,
  SHELL_TOOL_NAMES,
  DIRECT_WRITE_TOOL_NAMES,
  SUBAGENT_TOOL_NAMES,
  PRE_TOOL_USE_EVENTS,
} from "../src/shared/payload"
import { containsGitOrGh } from "../src/shared/command-parser"
import { isDfPublisherSession } from "../src/shared/state-store"
import { existsSync } from "node:fs"
import { join } from "node:path"

const DELEGATE_MESSAGE = "git/gh 操作已被禁止；请委托 df-publisher 子代理完成发布相关工作"

export function shouldBlockSessionStart(cwd: string): string | undefined {
  const agentsDir = join(cwd, ".codex", "agents")
  const dfPublisherToml = join(agentsDir, "df-publisher.toml")
  if (!existsSync(dfPublisherToml)) {
    return "DevFlow 插件不完整：未找到 df-publisher 子代理定义。预期位置：" + dfPublisherToml
  }
  return undefined
}

export function shouldBlockTool(
  toolName: string,
  toolInput: { command?: string; cmd?: string; [key: string]: unknown },
  sessionId?: string,
): boolean {
  if (toolName && !SHELL_TOOL_NAMES.has(toolName)) return false
  if (DIRECT_WRITE_TOOL_NAMES.has(toolName)) return false
  if (SUBAGENT_TOOL_NAMES.has(toolName)) return false
  const command = findCommand(toolInput)
  if (!command) return false
  if (!containsGitOrGh(command)) return false
  if (sessionId && isDfPublisherSession(sessionId)) return false
  return true
}

function writeSessionStartBlock(message: string): void {
  const lines = [
    message,
    "",
    "请在项目 .codex/agents/ 目录中安装 df-publisher.toml，",
    "或运行插件安装流程将 agents/df-publisher.toml 复制到 .codex/agents/。",
  ]
  for (const line of lines) {
    process.stderr.write(line + "\n")
  }
}

function writeToolBlock(): void {
  const lines = [
    "DevFlow 已阻止 git/gh 操作。",
    "原因：" + DELEGATE_MESSAGE + "。",
    "",
    "主 Agent 和所有 worker 均被禁止执行 git/gh 命令。",
    "请通过 delegate_task 委托 df-publisher 子代理完成提交、推送、PR 等发布工作。",
  ]
  for (const line of lines) {
    process.stderr.write(line + "\n")
  }
}

function main(): number {
  const payload = readPayload()
  if (!payload || typeof payload !== "object") return 0

  const event = findHookEvent(payload)

  if (SESSION_HOOK_NAMES.has(event)) {
    const toolInput = findToolInput(payload) ?? {}
    const cwd = findWorkdir(payload, toolInput)
    const message = shouldBlockSessionStart(cwd)
    if (message) {
      writeSessionStartBlock(message)
      return 2
    }
    return 0
  }

  if (!PRE_TOOL_USE_EVENTS.has(event)) {
    return 0
  }

  const toolName = findToolName(payload)
  const toolInput = findToolInput(payload) ?? {}
  const sessionId = findSessionId(payload)

  if (shouldBlockTool(toolName, toolInput, sessionId)) {
    writeToolBlock()
    return 2
  }
  return 0
}

if (import.meta.main) {
  process.exit(main())
}
