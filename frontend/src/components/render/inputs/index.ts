/**
 * The question-type dispatch table.
 *
 * Adding a type means adding a module and one line here — never another branch
 * inside a shared component.
 */

import type { ComponentType } from "react";

import type { QuestionInputProps } from "@/components/render/types";
import type { QuestionType } from "@/types";

import { ChoiceInput } from "./ChoiceInput";
import { DropdownInput } from "./DropdownInput";
import { EmailInput } from "./EmailInput";
import { LongTextInput } from "./LongTextInput";
import { NumberInput } from "./NumberInput";
import { RatingInput } from "./RatingInput";
import { ShortTextInput } from "./ShortTextInput";
import { YesNoInput } from "./YesNoInput";

export const QUESTION_INPUTS: Partial<
  Record<QuestionType, ComponentType<QuestionInputProps>>
> = {
  short_text: ShortTextInput,
  long_text: LongTextInput,
  email: EmailInput,
  number: NumberInput,
  multiple_choice: ChoiceInput,
  dropdown: DropdownInput,
  yes_no: YesNoInput,
  rating: RatingInput,
  // `ending` has no input: it is a screen, rendered by EndingScreen.
};
