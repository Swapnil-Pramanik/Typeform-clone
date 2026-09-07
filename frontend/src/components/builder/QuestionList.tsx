"use client";

/**
 * The left rail: a *Pages* group of numbered chips and a separate *Endings*
 * group, each reorderable with dnd-kit.
 *
 * Dropping a chip sends the complete ordered ID array to the server, which
 * rewrites every position in one transaction — the client never computes a
 * position of its own.
 */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Plus, TypeWelcome } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { BLOCKS } from "@/lib/questionTypes";
import {
  WELCOME as selectionWelcome,
  question as selectionQuestion,
  type Selection,
} from "@/components/builder/selection";
import type { Question, WelcomeScreen as WelcomeScreenData } from "@/types";

interface QuestionListProps {
  questions: Question[];
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onReorder: (orderedIds: number[]) => void;
  onAddContent: () => void;
  onAddEnding: () => void;
  /** Null when the form has no welcome screen yet. */
  welcome: WelcomeScreenData | null;
  onAddWelcome: () => void;
}

export function QuestionList({
  questions,
  selected,
  onSelect,
  onReorder,
  onAddContent,
  onAddEnding,
  welcome,
  onAddWelcome,
}: QuestionListProps) {
  const pages = questions.filter((question) => question.type !== "ending");
  const endings = questions.filter((question) => question.type === "ending");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent, group: Question[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = group.map((question) => question.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;

    const moved = [...ids];
    moved.splice(to, 0, ...moved.splice(from, 1));

    // Pages always precede endings, so the array sent to the server is the
    // reordered group spliced back into the full list in that order.
    const others = questions
      .filter((question) => !ids.includes(question.id))
      .map((question) => question.id);
    onReorder(
      group === pages ? [...moved, ...others] : [...others, ...moved],
    );
  };

  return (
    <aside className="tf-scrollbar flex w-[268px] shrink-0 flex-col gap-5 overflow-y-auto border-r-2 border-groove bg-rail p-3">
      <Group
        label="Welcome"
        count={welcome ? 1 : 0}
        onAdd={onAddWelcome}
      >
        {welcome ? (
          <li className="list-none">
            <button
              type="button"
              onClick={() => onSelect(selectionWelcome)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left",
                selected.kind === "welcome" ? "bg-muted-strong" : "hover:bg-muted",
              )}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
                style={{ backgroundColor: "#0891b2" }}
                aria-hidden="true"
              >
                ★
              </span>
              <TypeWelcome width={14} height={14} className="shrink-0 text-ink-faint" />
              <span className="flex-1 truncate text-[13px] text-ink">
                {welcome.title || "Welcome screen"}
              </span>
            </button>
          </li>
        ) : (
          <li className="list-none px-2 py-1 text-[12px] text-ink-faint">
            No welcome screen
          </li>
        )}
      </Group>

      <Group
        label="Pages"
        count={pages.length}
        onAdd={onAddContent}
        addLabel="Add content"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={(event) => onDragEnd(event, pages)}
        >
          <SortableContext
            items={pages.map((question) => question.id)}
            strategy={verticalListSortingStrategy}
          >
            {pages.map((question, index) => (
              <Chip
                key={question.id}
                question={question}
                badge={String(index + 1)}
                selected={
                  selected.kind === "question" && selected.id === question.id
                }
                onSelect={() => onSelect(selectionQuestion(question.id))}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Group>

      <Group label="Endings" count={endings.length} onAdd={onAddEnding}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={(event) => onDragEnd(event, endings)}
        >
          <SortableContext
            items={endings.map((question) => question.id)}
            strategy={verticalListSortingStrategy}
          >
            {endings.map((question, index) => (
              <Chip
                key={question.id}
                question={question}
                badge={String.fromCharCode(65 + index)}
                selected={
                  selected.kind === "question" && selected.id === question.id
                }
                onSelect={() => onSelect(selectionQuestion(question.id))}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Group>
    </aside>
  );
}

function Group({
  label,
  count,
  onAdd,
  addLabel,
  children,
}: {
  label: string;
  count: number;
  onAdd: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <header className="flex items-center justify-between px-2 py-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {label} <span className="font-normal">{count}</span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel ?? `Add ${label}`}
          className="rounded p-1 text-ink-muted hover:bg-muted hover:text-ink"
        >
          <Plus width={15} height={15} />
        </button>
      </header>

      <ul className="flex flex-col gap-1">{children}</ul>

      {addLabel && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-muted hover:bg-muted hover:text-ink"
        >
          <Plus width={15} height={15} />
          {addLabel}
        </button>
      )}
    </section>
  );
}

function Chip({
  question,
  badge,
  selected,
  onSelect,
}: {
  question: Question;
  badge: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });
  const meta = BLOCKS[question.type];
  const TypeIcon = meta.icon;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("list-none", isDragging && "z-10 opacity-80")}
    >
      <button
        type="button"
        onClick={onSelect}
        {...attributes}
        {...listeners}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left",
          "cursor-grab active:cursor-grabbing",
          selected ? "bg-muted-strong" : "hover:bg-muted",
        )}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
          style={{ backgroundColor: meta.tint }}
          aria-hidden="true"
        >
          {badge}
        </span>
        <TypeIcon width={14} height={14} className="shrink-0 text-ink-faint" />
        <span className="flex-1 truncate text-[13px] text-ink">
          {question.title || meta.label}
        </span>
      </button>
    </li>
  );
}
