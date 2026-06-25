import { describe, it, expect, beforeAll } from "bun:test"
import { mkdtempSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { shouldBlockOpenCodeToolInput } from "../src/shared/opencode-adapter"

let tempDir: string
let featureRepo: string
let mainRepo: string

function initGitRepo(path: string, branch: string): void {
  mkdirSync(path, { recursive: true })
  Bun.spawnSync({ cmd: ["git", "init", "-b", branch], cwd: path, stdout: "ignore" })
  Bun.spawnSync({ cmd: ["git", "config", "user.email", "test@example.com"], cwd: path })
  Bun.spawnSync({ cmd: ["git", "config", "user.name", "Test User"], cwd: path })
  Bun.write(`${path}/README.md`, "test\n")
  Bun.spawnSync({ cmd: ["git", "add", "README.md"], cwd: path })
  Bun.spawnSync({ cmd: ["git", "commit", "-m", "init"], cwd: path, stdout: "ignore" })
}

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "devflow-opencode-test-"))
  featureRepo = join(tempDir, "feature-repo")
  mainRepo = join(tempDir, "main-repo")
  initGitRepo(featureRepo, "feature/demo")
  initGitRepo(mainRepo, "main")
})

describe("OpenCode adapter", () => {
  it("blocks main agent direct writes", () => {
    const decision = shouldBlockOpenCodeToolInput({
      tool: "edit",
      args: { filePath: "README.md" },
      agent: { mode: "primary", name: "build" },
      project: { directory: featureRepo },
    })

    expect(decision).not.toBeNull()
    expect(decision!.reason).toInclude("主 Agent 禁止写入")
  })

  it("blocks main agent shell writes", () => {
    const decision = shouldBlockOpenCodeToolInput({
      tool: "bash",
      args: { command: "touch marker" },
      agent: { mode: "primary", name: "build" },
      project: { directory: featureRepo },
    })

    expect(decision).not.toBeNull()
    expect(decision!.reason).toInclude("主 Agent 禁止写入")
  })

  it("allows subagent writes on feature branches", () => {
    expect(shouldBlockOpenCodeToolInput({
      tool: "write",
      args: { filePath: "README.md" },
      agent: { mode: "subagent", name: "worker" },
      project: { directory: featureRepo },
    })).toBeUndefined()
  })

  it("blocks subagent writes on protected branches", () => {
    const decision = shouldBlockOpenCodeToolInput({
      tool: "write",
      args: { filePath: "README.md" },
      agent: { mode: "subagent", name: "worker" },
      project: { directory: mainRepo },
    })

    expect(decision).not.toBeNull()
    expect(decision!.reason).toInclude("main")
  })

  it("blocks git push for non-df-publisher agents", () => {
    const decision = shouldBlockOpenCodeToolInput({
      tool: "bash",
      args: { command: "git push origin feature/demo" },
      agent: { mode: "subagent", name: "worker" },
      project: { directory: featureRepo },
    })

    expect(decision).not.toBeNull()
    expect(decision!.reason).toInclude("git/gh")
    expect(decision!.reason).toInclude("df-publisher")
  })

  it("blocks git status for non-df-publisher main agents", () => {
    const decision = shouldBlockOpenCodeToolInput({
      tool: { name: "bash" },
      args: { command: "git status --short" },
      agent: { mode: "primary", name: "build" },
      project: { directory: mainRepo },
    })
    expect(decision).not.toBeNull()
    expect(decision!.reason).toInclude("git/gh")
  })

  it("allows df-publisher to run git commands", () => {
    expect(shouldBlockOpenCodeToolInput({
      tool: { name: "bash" },
      args: { command: "git push origin feature/demo" },
      agent: { mode: "subagent", name: "df-publisher" },
      project: { directory: featureRepo },
    })).toBeUndefined()
    expect(shouldBlockOpenCodeToolInput({
      tool: { name: "bash" },
      args: { command: "git status --short" },
      agent: { mode: "subagent", name: "df-publisher" },
      project: { directory: featureRepo },
    })).toBeUndefined()
  })
})
