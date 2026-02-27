"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { BookOpenText, Eye, PenSquare, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DisciplineNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type NoteFormState = {
  title: string;
  quote: string;
  plan: string;
  content: string;
};

function createDefaultFormState(): NoteFormState {
  return {
    title: "新建投资笔记",
    quote: pickQuote(),
    plan: "开盘前计划：\n- 关注标的\n- 计划买入价\n- 风险控制条件",
    content: "## 内容区域\n\n- 买入前提\n- 加仓条件\n- 卖出纪律",
  };
}

export function DisciplineNotesFab() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<DisciplineNote[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<NoteFormState>(createDefaultFormState);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const hydrateForm = (note: DisciplineNote) => {
    setForm({
      title: note.title,
      quote: note.quote,
      plan: note.plan,
      content: note.content,
    });
  };

  const fetchNotes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/discipline-notes");
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || "加载笔记失败");
      }
      const data = (await res.json()) as DisciplineNote[];
      setNotes(data);
      if (data.length > 0) {
        setSelectedId((prev) => (prev && data.some((n) => n.id === prev) ? prev : data[0].id));
      } else {
        setSelectedId(null);
        setForm(createDefaultFormState());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载笔记失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && status === "authenticated") {
      void fetchNotes();
    }
  }, [open, status]);

  useEffect(() => {
    if (selectedNote) {
      hydrateForm(selectedNote);
    }
  }, [selectedNote]);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = createDefaultFormState();
      const res = await fetch("/api/discipline-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || "创建笔记失败");
      }
      const created = (await res.json()) as DisciplineNote;
      const next = [created, ...notes].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setNotes(next);
      setSelectedId(created.id);
      hydrateForm(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建笔记失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) {
      setError("请先新建一条笔记");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/discipline-notes/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          quote: form.quote,
          plan: form.plan,
          content: form.content,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || "保存笔记失败");
      }
      const updated = (await res.json()) as DisciplineNote;
      const next = notes
        .map((note) => (note.id === updated.id ? updated : note))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setNotes(next);
      setSelectedId(updated.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存笔记失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/discipline-notes/${selectedId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || "删除笔记失败");
      }

      const next = notes.filter((note) => note.id !== selectedId);
      setNotes(next);
      if (next.length > 0) {
        setSelectedId(next[0].id);
      } else {
        setSelectedId(null);
        setForm(createDefaultFormState());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除笔记失败");
    } finally {
      setSaving(false);
    }
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="md:max-w-5xl md:w-[92vw]">
          <DialogHeader>
            <DialogTitle>纪律投资笔记</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            <aside className="border rounded-md p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">便签列表</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreate}
                  disabled={saving}
                  className="h-8 px-2"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="max-h-[320px] overflow-y-auto space-y-1">
                {loading && <p className="text-xs text-muted-foreground">加载中...</p>}
                {!loading && notes.length === 0 && (
                  <p className="text-xs text-muted-foreground">暂无笔记，点击 + 创建</p>
                )}
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-left text-xs border",
                      selectedId === note.id
                        ? "bg-accent border-foreground/20"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {new Date(note.updatedAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="space-y-4">
              <div>
                <Label>投资笔记</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="例如：2026-02-28 开盘计划"
                />
              </div>

              <div>
                <Label>经典句子</Label>
                <Input
                  value={form.quote}
                  onChange={(e) => setForm((prev) => ({ ...prev, quote: e.target.value }))}
                  placeholder="例如：市场先生每天都在报价，但你不必每天交易。"
                />
              </div>

              <div>
                <Label>交易计划</Label>
                <textarea
                  value={form.plan}
                  onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
                  className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="开盘前计划..."
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>内容区域</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant={previewMode ? "outline" : "secondary"}
                      size="sm"
                      className="h-8"
                      onClick={() => setPreviewMode(false)}
                    >
                      <PenSquare className="size-4" />
                      编辑
                    </Button>
                    <Button
                      type="button"
                      variant={previewMode ? "secondary" : "outline"}
                      size="sm"
                      className="h-8"
                      onClick={() => setPreviewMode(true)}
                    >
                      <Eye className="size-4" />
                      预览
                    </Button>
                  </div>
                </div>
                {!previewMode ? (
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                    className="min-h-56 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="支持 Markdown，例如 ## 标题 / - 列表 / **加粗**"
                  />
                ) : (
                  <article className="min-h-56 rounded-md border p-3 text-sm leading-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2">
                    <ReactMarkdown skipHtml>{form.content || "_暂无内容_"}</ReactMarkdown>
                  </article>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={!selectedId || saving}
                >
                  <Trash2 className="size-4" />
                  删除
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存笔记"}
                </Button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
