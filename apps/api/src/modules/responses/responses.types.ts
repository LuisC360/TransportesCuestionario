export interface SubmittedAnswer {
  questionId: string;
  optionIds: string[];
}

export interface SubmitResponseInput {
  version: number;
  answers: SubmittedAnswer[];
}

export interface IResponse {
  surveyId: Types.ObjectId;
  surveyVersion: number;
  answers: SubmittedAnswer[];
  submittedAt: Date;
}

import type { Types } from "mongoose";
