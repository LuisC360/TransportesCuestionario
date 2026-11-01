import { model, Schema } from "mongoose";

import type { IResponse } from "./responses.types.js";

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    optionIds: { type: [String], required: true },
  },
  { _id: false },
);

const responseSchema = new Schema<IResponse>(
  {
    surveyId: {
      type: Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    surveyVersion: { type: Number, required: true, min: 1 },
    answers: { type: [answerSchema], required: true },
    submittedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { versionKey: false },
);

responseSchema.index({ surveyId: 1, submittedAt: -1 });
responseSchema.index({ surveyId: 1, surveyVersion: 1 });

export const ResponseModel = model<IResponse>("Response", responseSchema);
