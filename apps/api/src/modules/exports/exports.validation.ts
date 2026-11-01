import { z } from "zod";

export const exportSurveyIdParamSchema = z.object({
  surveyId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const exportDateQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((value) => value.from || value.to, {
    message: "Provide at least one date filter (from or to)",
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "from must be on or before to",
    path: ["to"],
  });

export type ExportDateQuery = z.infer<typeof exportDateQuerySchema>;
