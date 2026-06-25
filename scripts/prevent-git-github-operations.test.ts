import { describe, it, expect, beforeAll, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

let tempDir: string
let stateFilePath: string
const STATE_PATH_ENV = "DEVFLOW_MAIN_AGENT_WRITE_STATE"

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "devflow-test-gitgh-"))
  stateFilePath = join(tempDir, "test-sessions.json")
  process.env[STATE_PATH_ENV] = stateFilePath
})

function cleanupState(): void {
  if (existsSync(stateFilePath)) {
    unlinkSync(stateFilePath)
  }
}

import { shouldBlockSessionStart, shouldBlockTool } from "./prevent-git-github-operations"
import { containsGitOrGh } from "../src/shared/command-parser"
import { loadState, saveState } from "../src/shared/state-store"

function startSubagent(sessionId: string, agentName: string): void {
  const state = loadState()
  state[sessionId] = { agent: agentName }
  saveState(state)
}

function stopSubagent(sessionId: string): void {
  const state = loadState()
  delete state[sessionId]
  saveState(state)
}

describe("containsGitOrGh", () => {
  it("detects plain git and gh commands", () => {
    expect(containsGitOrGh("git status")).toBe(true)
    expect(containsGitOrGh("git push origin main")).toBe(true)
    expect(containsGitOrGh("git log --oneline -5")).toBe(true)
    expect(containsGitOrGh("gh pr create")).toBe(true)
    expect(containsGitOrGh("gh issue list")).toBe(true)
  })

  it("detects path-prefixed binaries", () => {
    expect(containsGitOrGh("/usr/bin/git status")).toBe(true)
    expect(containsGitOrGh("/usr/local/bin/gh pr create")).toBe(true)
  })

  it("detects wrapped commands", () => {
    expect(containsGitOrGh("bash -c \"git push\"")).toBe(true)
    expect(containsGitOrGh("sh -c \"git log\"")).toBe(true)
    expect(containsGitOrGh("eval \"git status\"")).toBe(true)
    expect(containsGitOrGh("command git status")).toBe(true)
    expect(containsGitOrGh("env GIT_AUTHOR_DATE=x git commit")).toBe(true)
    expect(containsGitOrGh("rtk proxy git push origin main")).toBe(true)
  })

  it("does not false-positive on non-git commands", () => {
    expect(containsGitOrGh("cat README.md")).toBe(false)
    expect(containsGitOrGh("rg -n DevFlow README.md")).toBe(false)
    expect(containsGitOrGh("ls .git/")).toBe(false)
    expect(containsGitOrGh("echo git is great")).toBe(false)
    expect(containsGitOrGh("find . -name .git")).toBe(false)
  })
})

describe("GitGhOperationsHook SessionStart", () => {
  it("blocks when .codex/agents/df-publisher.toml is missing", () => {
    const projectDir = mkdtempSync(join(tempDir, "no-agents-"))
    const message = shouldBlockSessionStart(projectDir)
    expect(message).not.toBeUndefined()
    expect(message).toInclude("df-publisher")
    expect(message).toInclude("插件不完整")
  })

  it("allows when df-publisher.toml exists", () => {
    const projectDir = mkdtempSync(join(tempDir, "has-agents-"))
    const agentsDir = join(projectDir, ".codex", "agents")
    mkdirSync(agentsDir, { recursive: true })
    writeFileSync(join(agentsDir, "df-publisher.toml"), "name = \"df-publisher\"")
    const message = shouldBlockSessionStart(projectDir)
    expect(message).toBeUndefined()
  })
})

describe("GitGhOperationsHook PreToolUse", () => {
  beforeEach(() => {
    cleanupState()
  })

  afterEach(() => {
    cleanupState()
  })

  it("blocks non-df-publisher git commands", () => {
    expect(shouldBlockTool("Bash", { command: "git status" })).toBe(true)
    expect(shouldBlockTool("Bash", { command: "git push origin main" })).toBe(true)
    expect(shouldBlockTool("Bash", { command: "git log --oneline" })).toBe(true)
    expect(shouldBlockTool("Bash", { command: "git add README.md" })).toBe(true)
    expect(shouldBlockTool("Bash", { command: "git diff HEAD~1" })).toBe(true)
  })

  it("blocks non-df-publisher gh commands", () => {
    expect(shouldBlockTool("Bash", { command: "gh pr create" })).toBe(true)
    expect(shouldBlockTool("Bash", { command: "gh issue list" })).toBe(true)
    expect(shouldBlockTool("Bash", { command: "gh release create v1.0" })).toBe(true)
  })

  it("blocks wrapped git commands for non-df-publisher", () => {
    expect(shouldBlockTool("Bash", { command: "bash -c \"git push\""})).toBe(true)
    expect(shouldBlockTool("Bash", { command: "sh -c \"git log\""})).toBe(true)
    expect(shouldBlockTool("Bash", { command: "eval \"git status\""})).toBe(true)
    expect(shouldBlockTool("Bash", { command: "command git status"})).toBe(true)
    expect(shouldBlockTool("Bash", { command: "rtk proxy git push origin main"})).toBe(true)
  })

  it("allows non-git/gh commands", () => {
    expect(shouldBlockTool("Bash", { command: "cat README.md" })).toBe(false)
    expect(shouldBlockTool("Bash", { command: "rg -n DevFlow README.md" })).toBe(false)
    expect(shouldBlockTool("Bash", { command: "bun test" })).toBe(false)
    expect(shouldBlockTool("Bash", { command: "ls -la" })).toBe(false)
  })

  it("allows git commands for df-publisher session", () => {
    startSubagent("dfpub-1", "df-publisher")
    expect(shouldBlockTool("Bash", { command: "git status" }, "dfpub-1")).toBe(false)
    expect(shouldBlockTool("Bash", { command: "git push origin feature" }, "dfpub-1")).toBe(false)
    expect(shouldBlockTool("Bash", { command: "gh pr create" }, "dfpub-1")).toBe(false)
    expect(shouldBlockTool("Bash", { command: "git add README.md" }, "dfpub-1")).toBe(false)
    stopSubagent("dfpub-1")
  })

  it("blocks git commands for non-df-publisher worker", () => {
    startSubagent("worker-1", "some-worker")
    expect(shouldBlockTool("Bash", { command: "git status" }, "worker-1")).toBe(true)
    expect(shouldBlockTool("Bash", { command: "git push" }, "worker-1")).toBe(true)
    expect(shouldBlockTool("Bash", { command: "gh pr create" }, "worker-1")).toBe(true)
    stopSubagent("worker-1")
  })

  it("blocks git after df-publisher session ends", () => {
    startSubagent("dfpub-1", "df-publisher")
    expect(shouldBlockTool("Bash", { command: "git status" }, "dfpub-1")).toBe(false)
    stopSubagent("dfpub-1")
    expect(shouldBlockTool("Bash", { command: "git status" }, "dfpub-1")).toBe(true)
  })

  it("returns false for direct write tools", () => {
    expect(shouldBlockTool("Write", {})).toBe(false)
    expect(shouldBlockTool("Edit", {})).toBe(false)
    expect(shouldBlockTool("apply_patch", {})).toBe(false)
  })
})