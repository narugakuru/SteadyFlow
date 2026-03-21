export interface DisciplineNoteDraft {
  title: string;
  plan: string;
}

export interface DisciplineNoteSavePayload {
  title: string;
  quote: string;
  plan: string;
  content: string;
}

export function normalizeDisciplineNoteDraft(draft: DisciplineNoteDraft): DisciplineNoteDraft {
  return {
    title: draft.title.trim(),
    plan: draft.plan.trim(),
  };
}

export function isDisciplineNoteDraftDirty(
  savedDraft: DisciplineNoteDraft,
  currentDraft: DisciplineNoteDraft
) {
  const normalizedSavedDraft = normalizeDisciplineNoteDraft(savedDraft);
  const normalizedCurrentDraft = normalizeDisciplineNoteDraft(currentDraft);

  return (
    normalizedSavedDraft.title !== normalizedCurrentDraft.title ||
    normalizedSavedDraft.plan !== normalizedCurrentDraft.plan
  );
}

export function createDisciplineNoteSaveSignature(noteId: number, draft: DisciplineNoteDraft) {
  const normalizedDraft = normalizeDisciplineNoteDraft(draft);
  return `${noteId}:${normalizedDraft.title}\u0000${normalizedDraft.plan}`;
}

export function buildDisciplineNoteSavePayload(
  quote: string,
  draft: DisciplineNoteDraft
): DisciplineNoteSavePayload {
  const normalizedDraft = normalizeDisciplineNoteDraft(draft);
  return {
    title: normalizedDraft.title,
    quote,
    plan: normalizedDraft.plan,
    content: normalizedDraft.plan,
  };
}

export function preserveDisciplineNoteDraftOnSaveFailure(
  savedDraft: DisciplineNoteDraft,
  currentDraft: DisciplineNoteDraft
) {
  return {
    savedDraft,
    currentDraft,
  };
}
