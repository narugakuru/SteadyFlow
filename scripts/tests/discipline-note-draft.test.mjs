import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDisciplineNoteSavePayload,
  isDisciplineNoteDraftDirty,
  normalizeDisciplineNoteDraft,
  preserveDisciplineNoteDraftOnSaveFailure,
} from "../../src/lib/services/discipline-note-draft.ts";

test("isDisciplineNoteDraftDirty returns true when note content changes", () => {
  const saved = { title: "周计划", plan: "- 继续持有" };
  const current = { title: "周计划", plan: "- 继续持有\n- 观察财报" };

  assert.equal(isDisciplineNoteDraftDirty(saved, current), true);
});

test("normalizeDisciplineNoteDraft removes outer whitespace so blur does not save noop edits", () => {
  const saved = { title: "周计划", plan: "- 继续持有" };
  const current = { title: " 周计划 ", plan: "\n- 继续持有\n" };

  assert.equal(isDisciplineNoteDraftDirty(saved, current), false);
  assert.deepEqual(normalizeDisciplineNoteDraft(current), saved);
});

test("buildDisciplineNoteSavePayload keeps note quote and mirrors content from plan", () => {
  const payload = buildDisciplineNoteSavePayload("纪律优先", {
    title: "交易复盘",
    plan: "## 执行\n- 控回撤",
  });

  assert.deepEqual(payload, {
    title: "交易复盘",
    quote: "纪律优先",
    plan: "## 执行\n- 控回撤",
    content: "## 执行\n- 控回撤",
  });
});

test("preserveDisciplineNoteDraftOnSaveFailure keeps the latest draft in the editor", () => {
  const result = preserveDisciplineNoteDraftOnSaveFailure(
    { title: "旧标题", plan: "- 旧内容" },
    { title: "新标题", plan: "- 新内容" }
  );

  assert.deepEqual(result, {
    savedDraft: { title: "旧标题", plan: "- 旧内容" },
    currentDraft: { title: "新标题", plan: "- 新内容" },
  });
});
