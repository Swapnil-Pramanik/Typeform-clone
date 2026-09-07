/**
 * The catalogue of blocks, grouped the way the real add-element modal groups them.
 *
 * `supported: false` entries are rendered greyed out and disabled. They are here
 * deliberately: the modal reads as the real product, and the unbuilt types are
 * visibly a scope decision rather than an omission.
 */

import type { ComponentType, SVGProps } from "react";

import {
  TypeChoice,
  TypeDate,
  TypeDropdown,
  TypeEmail,
  TypeEnding,
  TypeFile,
  TypeLongText,
  TypeNumber,
  TypePayment,
  TypePhone,
  TypePicture,
  TypeRating,
  TypeScale,
  TypeShortText,
  TypeWelcome,
  TypeYesNo,
} from "@/components/ui/icons";
import type { QuestionSettings, QuestionType } from "@/types";

export interface BlockMeta {
  /** Present only for the eight types plus `ending` that this app implements. */
  type?: QuestionType;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  supported: boolean;
  /** Chip colour in the left rail, so the block list scans by type at a glance. */
  tint: string;
  /**
   * Copy a new block is created with. Question types deliberately have none:
   * an empty title shows the renderer's placeholder, so the creator types
   * straight into it instead of first clearing text someone else wrote.
   * Endings do carry copy, because theirs is a finished sentence.
   */
  defaultTitle?: string;
  defaultSettings?: QuestionSettings;
  /**
   * Set for blocks that are not question rows. The welcome screen lives in
   * `forms.welcome_screen`, so picking it takes a different path than adding a
   * question — the modal needs to know which.
   */
  action?: "welcome";
}

export const BLOCKS: Record<QuestionType, BlockMeta> = {
  short_text: {
    type: "short_text",
    label: "Short Text",
    icon: TypeShortText,
    supported: true,
    tint: "#3b82f6",
  },
  long_text: {
    type: "long_text",
    label: "Long Text",
    icon: TypeLongText,
    supported: true,
    tint: "#6366f1",
  },
  multiple_choice: {
    type: "multiple_choice",
    label: "Multiple Choice",
    icon: TypeChoice,
    supported: true,
    tint: "#e0761c",
  },
  dropdown: {
    type: "dropdown",
    label: "Dropdown",
    icon: TypeDropdown,
    supported: true,
    tint: "#0891b2",
  },
  email: {
    type: "email",
    label: "Email",
    icon: TypeEmail,
    supported: true,
    tint: "#db2777",
  },
  number: {
    type: "number",
    label: "Number",
    icon: TypeNumber,
    supported: true,
    tint: "#0d9488",
  },
  yes_no: {
    type: "yes_no",
    label: "Yes/No",
    icon: TypeYesNo,
    supported: true,
    tint: "#7c3aed",
  },
  rating: {
    type: "rating",
    label: "Rating",
    icon: TypeRating,
    supported: true,
    tint: "#ca8a04",
    defaultSettings: { max_rating: 5, icon: "star" },
  },
  ending: {
    type: "ending",
    label: "End Screen",
    icon: TypeEnding,
    supported: true,
    tint: "#475569",
    defaultTitle: "Thanks for completing this typeform!",
    defaultSettings: { button_text: "Create a typeform" },
  },
};

/** The welcome screen: form-level JSON rather than a question row. */
export const WELCOME_BLOCK: BlockMeta = {
  label: "Welcome Screen",
  icon: TypeWelcome,
  supported: true,
  tint: "#0891b2",
  action: "welcome",
};

const unsupported = (
  label: string,
  icon: ComponentType<SVGProps<SVGSVGElement>>,
): BlockMeta => ({ label, icon, supported: false, tint: "#9a9aa2" });

export interface BlockGroup {
  name: string;
  blocks: BlockMeta[];
}

/** The add-element modal's columns, in the real product's order. */
export const BLOCK_GROUPS: BlockGroup[] = [
  {
    name: "Contact info",
    blocks: [
      BLOCKS.email,
      unsupported("Phone Number", TypePhone),
      unsupported("Address", TypeShortText),
      unsupported("Website", TypeShortText),
    ],
  },
  {
    name: "Text & Video",
    blocks: [BLOCKS.long_text, BLOCKS.short_text],
  },
  {
    name: "Choice",
    blocks: [
      BLOCKS.multiple_choice,
      BLOCKS.dropdown,
      unsupported("Picture Choice", TypePicture),
      BLOCKS.yes_no,
      unsupported("Legal", TypeFile),
      unsupported("Checkbox", TypeChoice),
    ],
  },
  {
    name: "Rating & ranking",
    blocks: [
      unsupported("Net Promoter Score®", TypeScale),
      unsupported("Opinion Scale", TypeScale),
      BLOCKS.rating,
      unsupported("Ranking", TypeScale),
      unsupported("Matrix", TypeScale),
    ],
  },
  {
    name: "Other",
    blocks: [
      BLOCKS.number,
      unsupported("Date", TypeDate),
      unsupported("Signature", TypeFile),
      unsupported("Payment", TypePayment),
      unsupported("File Upload", TypeFile),
      unsupported("Scheduler", TypeDate),
    ],
  },
  {
    name: "Structural",
    blocks: [
      WELCOME_BLOCK,
      unsupported("Statement", TypeLongText),
      unsupported("Question Group", TypeChoice),
      BLOCKS.ending,
      unsupported("Redirect", TypeFile),
    ],
  },
];

/** The shortlist the modal shows above the columns. */
export const RECOMMENDED: BlockMeta[] = [
  BLOCKS.multiple_choice,
  BLOCKS.email,
  BLOCKS.short_text,
  BLOCKS.long_text,
  BLOCKS.rating,
  BLOCKS.yes_no,
];

/** Types offered by the settings panel's "Answer type" dropdown. */
export const ANSWER_TYPES: QuestionType[] = [
  "short_text",
  "long_text",
  "multiple_choice",
  "dropdown",
  "email",
  "number",
  "yes_no",
  "rating",
];

export const isChoiceType = (type: QuestionType): boolean =>
  type === "multiple_choice" || type === "dropdown";
