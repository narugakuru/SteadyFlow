"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { BookOpenText, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils/utils";
import type { DisciplineNote } from "@/lib/utils/types";
import {
  buildDisciplineNoteSavePayload,
  createDisciplineNoteSaveSignature,
  isDisciplineNoteDraftDirty,
  normalizeDisciplineNoteDraft,
  preserveDisciplineNoteDraftOnSaveFailure,
  type DisciplineNoteDraft,
} from "@/lib/services/discipline-note-draft";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const CLASSIC_QUOTES = [
  "在别人恐惧时贪婪，在别人贪婪时恐惧。",
  "市场先生每天给你报价，但你不必每天都交易。",
  "价格是你付出的，价值是你得到的。",
  "成熟的交易者在开盘前就知道买什么、买多少、何时止损。",
  "纪律不是限制收益，而是先保证你活在下一轮机会里。",
];

function pickQuote(): string {
  return CLASSIC_QUOTES[Math.floor(Math.random() * CLASSIC_QUOTES.length)];
}

function createDefaultFormState(): DisciplineNoteDraft {
  return {
    title: "新建投资笔记",
    plan: "开盘前计划：\n- 关注标的\n- 计划买入价\n- 风险控制条件",
  };
}

function toNoteDraft(note: DisciplineNote): DisciplineNoteDraft {
  return {
    title: note.title,
    plan: note.plan,
  };
}

function sortNotesByUpdatedAt(notes: DisciplineNote[]) {
  return [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function DisciplineNotesFab() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<DisciplineNote[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<DisciplineNoteDraft>(createDefaultFormState);
  const [savedForm, setSavedForm] = useState<DisciplineNoteDraft>(createDefaultFormState);
  const [isPlanEditing, setIsPlanEditing] = useState(false);
  const [displayQuote, setDisplayQuote] = useState(() => pickQuote());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const planEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef(notes);
  const formRef = useRef(form);
  const savedFormRef = useRef(savedForm);
  const selectedIdRef = useRef(selectedId);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const pendingSaveRef = useRef<{ signature: string; promise: Promise<boolean> } | null>(null);
  const activeSaveCountRef = useRef(0);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    savedFormRef.current = savedForm;
  }, [savedForm]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const applySelectedNote = useCallback((note: DisciplineNote | null) => {
    setSelectedId(note?.id ?? null);
    const nextForm = note ? toNoteDraft(note) : createDefaultFormState();
    setForm(nextForm);
    setSavedForm(nextForm);
    setIsPlanEditing(false);
    setSaveStatus("idle");
    setDisplayQuote(pickQuote());
  }, []);

  const beginSaving = () => {
    activeSaveCountRef.current += 1;
    setSaving(true);
  };

  const endSaving = () => {
    activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
    if (activeSaveCountRef.current === 0) {
      setSaving(false);
    }
  };

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/discipline-notes");
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || "加载笔记失败");
      }

      const data = sortNotesByUpdatedAt((await res.json()) as DisciplineNote[]);
      setNotes(data);

      if (data.length === 0) {
        applySelectedNote(null);
        return;
      }

      const nextSelectedNote =
        data.find((note) => note.id === selectedIdRef.current) ?? data[0] ?? null;
      applySelectedNote(nextSelectedNote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载笔记失败");
    } finally {
      setLoading(false);
    }
  }, [applySelectedNote]);

  useEffect(() => {
    if (open && status === "authenticated") {
      setDisplayQuote(pickQuote());
      setIsPlanEditing(false);
      void fetchNotes();
    }
  }, [fetchNotes, open, status]);

  const saveDraft = async (noteId: number, draft: DisciplineNoteDraft) => {
    if (!notesRef.current.some((note) => note.id === noteId)) {
      return true;
    }

    const payload = buildDisciplineNoteSavePayload(draft);
    if (!payload.title || !payload.plan) {
      setError("笔记标题和内容不能为空");
      return false;
    }

    const signature = createDisciplineNoteSaveSignature(noteId, draft);
    if (pendingSaveRef.current?.signature === signature) {
      return pendingSaveRef.current.promise;
    }

    beginSaving();
    setError("");
    setSaveStatus("idle");

    const savePromise = saveQueueRef.current.then(async () => {
      try {
        const res = await fetch(`/api/discipline-notes/${noteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error || "保存笔记失败");
        }

        const updated = (await res.json()) as DisciplineNote;
        const normalizedDraft = normalizeDisciplineNoteDraft(draft);

        setNotes((prev) =>
          sortNotesByUpdatedAt(prev.map((note) => (note.id === updated.id ? updated : note)))
        );
        setSavedForm(normalizedDraft);
        setSaveStatus("saved");
        return true;
      } catch (e) {
        const failureState = preserveDisciplineNoteDraftOnSaveFailure(
          savedFormRef.current,
          formRef.current
        );
        setSavedForm(failureState.savedDraft);
        setForm(failureState.currentDraft);
        setSaveStatus("idle");
        setError(e instanceof Error ? e.message : "保存笔记失败");
        return false;
      } finally {
        endSaving();
      }
    });

    pendingSaveRef.current = { signature, promise: savePromise };
    saveQueueRef.current = savePromise.then(
      () => true,
      () => true
    );

    savePromise.finally(() => {
      if (pendingSaveRef.current?.promise === savePromise) {
        pendingSaveRef.current = null;
      }
    });

    return savePromise;
  };

  const saveIfDirty = async (
    noteId = selectedIdRef.current,
    draft = formRef.current
  ): Promise<boolean> => {
    if (!noteId) {
      return true;
    }

    if (!isDisciplineNoteDraftDirty(savedFormRef.current, draft)) {
      return true;
    }

    return saveDraft(noteId, draft);
  };

  const handleCreate = async () => {
    if (!(await saveIfDirty())) {
      return;
    }

    beginSaving();
    setError("");
    setSaveStatus("idle");

    try {
      const payload = createDefaultFormState();
      const res = await fetch("/api/discipline-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          plan: payload.plan,
          content: payload.plan,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || "创建笔记失败");
      }

      const created = (await res.json()) as DisciplineNote;
      const nextNotes = sortNotesByUpdatedAt([created, ...notesRef.current]);
      setNotes(nextNotes);
      applySelectedNote(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建笔记失败");
    } finally {
      endSaving();
    }
  };

  const handleDelete = async () => {
    if (!selectedIdRef.current) {
      return;
    }

    beginSaving();
    setError("");
    setSaveStatus("idle");

    try {
      const noteId = selectedIdRef.current;
      const res = await fetch(`/api/discipline-notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || "删除笔记失败");
      }

      const nextNotes = notesRef.current.filter((note) => note.id !== noteId);
      setNotes(nextNotes);
      applySelectedNote(nextNotes[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除笔记失败");
    } finally {
      endSaving();
    }
  };

  const handleSelectNote = async (noteId: number) => {
    if (noteId === selectedIdRef.current) {
      return;
    }

    if (!(await saveIfDirty())) {
      return;
    }

    const targetNote = notesRef.current.find((note) => note.id === noteId) ?? null;
    applySelectedNote(targetNote);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsPlanEditing(false);
      void saveIfDirty();
    }
    setOpen(nextOpen);
  };

  const handleEditorBoundaryBlur = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setIsPlanEditing(false);
    void saveIfDirty();
  };

  const startPlanEditing = () => {
    if (!selectedNote) {
      return;
    }

    setIsPlanEditing(true);
    requestAnimationFrame(() => {
      planEditorRef.current?.focus();
      planEditorRef.current?.setSelectionRange(
        planEditorRef.current.value.length,
        planEditorRef.current.value.length
      );
    });
  };

  if (status !== "authenticated") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex size-12 items-center justify-center rounded-full border bg-background shadow-lg transition hover:scale-105 hover:bg-accent"
        aria-label="打开投资笔记"
      >
        <BookOpenText className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="top-0 bottom-0 left-0 right-0 h-[100dvh] max-h-[100dvh] rounded-none p-0 pb-0 overflow-hidden md:top-[50%] md:bottom-auto md:h-[min(82vh,760px)] md:max-h-[82vh] md:w-[92vw] md:max-w-5xl md:rounded-xl md:p-0">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="border-b px-4 py-4 md:px-6">
              <DialogTitle>纪律投资笔记</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[240px_minmax(0,1fr)]">
              <section
                className="order-1 flex min-h-0 flex-1 flex-col px-4 py-4 md:order-2 md:px-6 md:py-5"
                onBlurCapture={handleEditorBoundaryBlur}
              >
                <div className="flex items-start gap-2">
                  <Input
                    id="discipline-note-title"
                    value={form.title}
                    disabled={!selectedNote}
                    onFocus={() => setIsPlanEditing(false)}
                    onChange={(event) => {
                      setError("");
                      setSaveStatus("idle");
                      setForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }));
                    }}
                    placeholder="例如：2026-03-21 开盘计划"
                    className="h-10 text-base md:h-11 md:text-lg"
                  />
                  {selectedNote ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                      disabled={saving}
                      className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                      aria-label="删除当前笔记"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground">
                  {saving ? (
                    <span className="inline-flex items-center gap-1">
                      <LoaderCircle className="size-3 animate-spin" />
                      自动保存中...
                    </span>
                  ) : saveStatus === "saved" ? (
                    "已自动保存"
                  ) : selectedNote ? (
                    "失去焦点后自动保存"
                  ) : (
                    "创建笔记后开始记录"
                  )}
                </div>

                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                  <div className="min-h-[220px] flex-1 overflow-hidden rounded-lg border bg-background md:min-h-0">
                    {selectedNote ? (
                      isPlanEditing ? (
                        <textarea
                          ref={planEditorRef}
                          value={form.plan}
                          onChange={(event) => {
                            setError("");
                            setSaveStatus("idle");
                            setForm((prev) => ({
                              ...prev,
                              plan: event.target.value,
                            }));
                          }}
                          className="h-full w-full resize-none overflow-y-auto bg-transparent px-4 py-3 text-sm leading-6 font-mono outline-none"
                          placeholder="支持 Markdown，例如 ## 标题 / - 列表 / **加粗**"
                        />
                      ) : (
                        <article
                          role="button"
                          tabIndex={0}
                          className="h-full cursor-text overflow-y-auto px-4 py-3 text-left text-sm leading-6 outline-none hover:bg-accent/20 focus-visible:bg-accent/20 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2"
                          onClick={startPlanEditing}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              startPlanEditing();
                            }
                          }}
                        >
                          <ReactMarkdown skipHtml>
                            {form.plan || "_点击此处编辑笔记内容_"}
                          </ReactMarkdown>
                        </article>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                        请选择一条笔记，或点击下方列表右侧的 + 新建一条投资笔记。
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm italic text-muted-foreground">
                  “{displayQuote}”
                </div>

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              </section>

              <aside className="order-2 flex shrink-0 flex-col border-t px-4 py-4 md:order-1 md:min-h-0 md:border-r md:border-t-0 md:px-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">便签列表</p>
                    <p className="text-xs text-muted-foreground">切换笔记前会自动保存当前修改</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCreate()}
                    disabled={saving}
                    className="h-8 px-2"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <div className="min-h-[160px] max-h-[28dvh] overflow-y-auto pr-1 md:max-h-none md:min-h-0 md:flex-1">
                  <div className="space-y-1">
                    {loading && <p className="text-xs text-muted-foreground">加载中...</p>}
                    {!loading && notes.length === 0 && (
                      <p className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
                        暂无笔记，点击右上角 + 创建
                      </p>
                    )}
                    {notes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => void handleSelectNote(note.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                          selectedId === note.id
                            ? "border-foreground/20 bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <p className="truncate font-medium">{note.title}</p>
                        <p className="mt-1 text-muted-foreground">
                          {new Date(note.updatedAt).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
