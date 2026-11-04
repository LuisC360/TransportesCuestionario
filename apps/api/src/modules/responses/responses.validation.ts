import { z } from "zod";

const answerSchema = z.object({
  questionId: z.string().trim().min(1).max(100),
  optionIds: z.array(z.string().trim().min(1).max(100)).max(100),
});

export const submitResponseSchema = z
  .object({
    version: z.number().int().positive(),
    answers: z.array(answerSchema).min(1).max(100),
  })
  .superRefine((response, ctx) => {
    const questionIds = response.answers.map((answer) => answer.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["answers"],
        message: "Each question can only be answered once",
      });
    }

    response.answers.forEach((answer, index) => {
      if (new Set(answer.optionIds).size !== answer.optionIds.length) {
        ctx.addIssue({
          code: "custom",
          path: ["answers", index, "optionIds"],
          message: "An option cannot be selected more than once",
        });
      }
    });
  });

export const responseSurveyIdParamSchema = z.object({
  surveyId: z.string().regex(/^[a-f\d]{24}$/i),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
