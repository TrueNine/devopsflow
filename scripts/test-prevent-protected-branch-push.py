#!/usr/bin/env python3
"""Regression tests for the protected branch push hook."""

from __future__ import annotations

import importlib.util
import sys
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("prevent-protected-branch-push.py")
SPEC = importlib.util.spec_from_file_location("prevent_protected_branch_push", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
HOOK = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = HOOK
SPEC.loader.exec_module(HOOK)


class ProtectedBranchPushHookTest(unittest.TestCase):
  def assert_blocked(self, command: str, branch: str = "main") -> None:
    with patch.object(HOOK, "_current_branch", return_value=branch):
      decision = HOOK.should_block(command, "/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.branch, branch)

  def assert_push_blocked_globally(self, command: str) -> None:
    with patch.object(HOOK, "_current_branch", return_value="feature/demo"):
      decision = HOOK.should_block(command, "/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.branch, "*")
    self.assertIn("全场拦截", decision.reason)

  def assert_allowed(self, command: str, current_branch: str = "feature/demo") -> None:
    with patch.object(HOOK, "_current_branch", return_value=current_branch):
      self.assertIsNone(HOOK.should_block(command, "/repo"))

  def test_blocks_direct_main_push(self) -> None:
    self.assert_push_blocked_globally("git push origin main")

  def test_blocks_explicit_destination(self) -> None:
    self.assert_push_blocked_globally("git push origin HEAD:main")
    self.assert_push_blocked_globally("git push origin feature:refs/heads/dev")

  def test_blocks_common_develop_typo(self) -> None:
    self.assert_push_blocked_globally("git push origin devlop")

  def test_blocks_plain_push_from_protected_current_branch(self) -> None:
    with patch.object(HOOK, "_current_branch", return_value="develop"):
      decision = HOOK.should_block("git push origin", "/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.branch, "*")

  def test_blocks_feature_branch_push(self) -> None:
    self.assert_push_blocked_globally("git push -u origin codex/convert-to-plugin")

  def test_blocks_feature_branch_destination(self) -> None:
    self.assert_push_blocked_globally("git push origin HEAD:codex/convert-to-plugin")

  def test_blocks_wrapped_git_push_forms(self) -> None:
    self.assert_push_blocked_globally("command git push origin feature/demo")
    self.assert_push_blocked_globally("env GIT_SSH_COMMAND=ssh git push origin feature/demo")
    self.assert_push_blocked_globally("git -C ../repo push origin feature/demo")
    self.assert_push_blocked_globally("git -c credential.helper= push origin feature/demo")

  def test_escalates_proxy_bypass_attempts(self) -> None:
    decision = HOOK.should_block("rtk proxy git push origin main", "/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.branch, "*")
    self.assertEqual(decision.action, "escalation")
    self.assertIn("二级警告", decision.reason)

    decision = HOOK.should_block("proxy sed -n '1,20p' README.md", "/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.action, "escalation")

  def test_blocks_all_branch_push(self) -> None:
    decision = HOOK.should_block("git push --all origin", "/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.branch, "*")

  def test_blocks_session_start_on_protected_branch(self) -> None:
    with patch.object(HOOK, "_current_branch", return_value="dev"):
      decision = HOOK.should_block_session_start("/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.branch, "dev")
    self.assertEqual(decision.action, "session")

  def test_allows_session_start_on_feature_branch(self) -> None:
    with patch.object(HOOK, "_current_branch", return_value="codex/task"):
      self.assertIsNone(HOOK.should_block_session_start("/repo"))

  def test_blocks_direct_write_tool_on_protected_branch(self) -> None:
    with patch.object(HOOK, "_current_branch", return_value="main"):
      decision = HOOK.should_block_tool("apply_patch", {}, "/repo")
    self.assertIsNotNone(decision)
    self.assertEqual(decision.branch, "main")

  def test_allows_direct_write_tool_on_feature_branch(self) -> None:
    with patch.object(HOOK, "_current_branch", return_value="codex/task"):
      self.assertIsNone(HOOK.should_block_tool("Write", {}, "/repo"))

  def test_uses_tool_workdir_for_nested_repository_branch_detection(self) -> None:
    with tempfile.TemporaryDirectory() as tempdir:
      root = Path(tempdir) / "root"
      nested = root / "nested"
      _init_git_repo(root, "codex/root-topic")
      _init_git_repo(nested, "codex/topic")

      self.assertIsNone(HOOK.should_block_tool("Write", {}, str(root)))
      self.assertIsNone(HOOK.should_block_tool("Write", {}, str(nested)))

      _switch_branch(root, "dev")
      decision = HOOK.should_block_tool("Write", {}, str(root))
      self.assertIsNotNone(decision)
      self.assertEqual(decision.branch, "dev")
      self.assertIn(str(root), decision.reason)

  def test_blocks_shell_redirection_on_protected_branch(self) -> None:
    self.assert_blocked("printf hi > README.md", "develop")
    self.assert_blocked("printf hi>README.md", "develop")

  def test_blocks_file_mutation_commands_on_protected_branch(self) -> None:
    self.assert_blocked("rm -rf build", "main")
    self.assert_blocked("mv old new", "main")
    self.assert_blocked("cp a b", "main")
    self.assert_blocked("rg -n DevFlow README.md;rm README.md", "main")

  def test_blocks_git_writes_on_protected_branch(self) -> None:
    self.assert_blocked("git add README.md", "dev")
    self.assert_blocked("git commit -m test", "dev")
    self.assert_blocked("git reset --hard HEAD~1", "dev")

  def test_allows_branch_escape_on_protected_branch(self) -> None:
    with patch.object(HOOK, "_current_branch", return_value="main"):
      self.assertIsNone(HOOK.should_block("git switch -c codex/task", "/repo"))
      self.assertIsNone(HOOK.should_block("git checkout -b codex/task", "/repo"))

  def test_blocks_package_install_on_protected_branch(self) -> None:
    self.assert_blocked("pnpm add zod", "develop")
    self.assert_blocked("npm install lodash", "develop")

  def test_allows_read_only_commands_on_protected_branch(self) -> None:
    with patch.object(HOOK, "_current_branch", return_value="main"):
      self.assertIsNone(HOOK.should_block("cat README.md", "/repo"))
      self.assertIsNone(HOOK.should_block("sed -n '1,20p' README.md", "/repo"))
      self.assertIsNone(HOOK.should_block("sed -n 1,20p README.md", "/repo"))
      self.assertIsNone(HOOK.should_block("sed --quiet '1,20p' README.md", "/repo"))
      self.assertIsNone(HOOK.should_block("sed --silent '1,20p' README.md", "/repo"))
      self.assertIsNone(HOOK.should_block("sed 's/a/b/' README.md", "/repo"))
      self.assertIsNone(HOOK.should_block("rg -n DevFlow README.md", "/repo"))
      self.assertIsNone(HOOK.should_block("git status --short", "/repo"))
      self.assertIsNone(HOOK.should_block("python3 -c 'print(1)'", "/repo"))
      self.assertIsNone(HOOK.should_block("python3 -c 'open(\"README.md\").read()'", "/repo"))

  def test_blocks_mutating_sed_on_protected_branch(self) -> None:
    self.assert_blocked("sed -i 's/a/b/' README.md", "main")
    self.assert_blocked("sed --in-place 's/a/b/' README.md", "main")
    self.assert_blocked("python3 -c 'open(\"README.md\", \"w\").write(\"x\")'", "main")


def _init_git_repo(path: Path, branch: str) -> None:
  path.mkdir(parents=True)
  subprocess.run(["git", "init", "-b", branch], cwd=path, check=True, stdout=subprocess.DEVNULL)
  subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=path, check=True)
  subprocess.run(["git", "config", "user.name", "Test User"], cwd=path, check=True)
  (path / "README.md").write_text("test\n", encoding="utf-8")
  subprocess.run(["git", "add", "README.md"], cwd=path, check=True)
  subprocess.run(["git", "commit", "-m", "init"], cwd=path, check=True, stdout=subprocess.DEVNULL)


def _switch_branch(path: Path, branch: str) -> None:
  subprocess.run(["git", "switch", "-c", branch], cwd=path, check=True, stdout=subprocess.DEVNULL)


if __name__ == "__main__":
  unittest.main()
