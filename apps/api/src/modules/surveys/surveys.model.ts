import { model, Schema } from "mongoose";

import type { ISurvey } from "./surveys.types.js";

const optionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true, trim: true },
    options: { type: [optionSchema], required: true },
    minSelections: { type: Number, required: true, min: 0 },
    maxSelections: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const surveyDefinitionSchema = new Schema(
  {
    version: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, default: "" },
    questions: { type: [questionSchema], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const surveySchema = new Schema<ISurvey>(
  {
    isActive: { type: Boolean, required: true, default: false },
    currentVersion: { type: Number, required: true, min: 1 },
    createdBy: { type: String, required: true },
    versions: { type: [surveyDefinitionSchema], required: true },
  },
  { timestamps: true },
);

export const SurveyModel = model<ISurvey>("Survey", surveySchema);
