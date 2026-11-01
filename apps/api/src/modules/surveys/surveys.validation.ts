import { z } from "zod";

const optionSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  label: z.string().trim().min(1).max(200),
});

const questionSchema = z
  .object({
    id: z.string().trim().min(1).max(100).optional(),
    prompt: z.string().trim().min(1).max(500),
    options: z.array(optionSchema).min(2).max(100),
    minSelections: z.number().int().min(0).default(0),
    maxSelections: z.number().int().min(1).optional(),
  })
  .superRefine((question, ctx) => {
    const maxSelections = question.maxSelections ?? question.options.length;
    if (maxSelections > question.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["maxSelections"],
        message: "maxSelections cannot exceed the number of options",
      });
    }
    if (question.minSelections > maxSelections) {
      ctx.addIssue({
        code: "custom",
        path: ["minSelections"],
        message: "minSelections cannot exceed maxSelections",
      });
    }

    const optionLabels = question.options.map((option) => option.label.toLocaleLowerCase());
    if (new Set(optionLabels).size !== optionLabels.length) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option labels must be unique within a question",
      });
    }
  });

export const surveyDefinitionSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).default(""),
    questions: z.array(questionSchema).min(1).max(100),
  })
  .superRefine((definition, ctx) => {
    const questionIds = definition.questions.flatMap((question) => question.id ?? []);
    if (new Set(questionIds).size !== questionIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Question IDs must be unique within a survey",
      });
    }

    definition.questions.forEach((question, index) => {
      const optionIds = question.options.flatMap((option) => option.id ?? []);
      if (new Set(optionIds).size !== optionIds.length) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", index, "options"],
          message: "Option IDs must be unique within a question",
        });
      }
    });
  });

export const createSurveySchema = surveyDefinitionSchema;

export const updateSurveySchema = surveyDefinitionSchema.extend({
  expectedVersion: z.number().int().positive(),
});

export const surveyStatusSchema = z.object({
  isActive: z.boolean(),
});

export const surveyIdParamSchema = z.object({
  surveyId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const surveyVersionParamSchema = surveyIdParamSchema.extend({
  version: z.coerce.number().int().positive(),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type SurveyStatusInput = z.infer<typeof surveyStatusSchema>;
