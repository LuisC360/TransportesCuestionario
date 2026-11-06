import { Types } from "mongoose";

import { ResponseModel } from "./responses.model.js";
import type { SubmittedAnswer } from "./responses.types.js";

interface ResponseCountsByVersion {
  _id: number;
  count: number;
}

interface OptionCountsByVersion {
  _id: {
    version: number;
    questionId: string;
    optionId: string;
  };
  count: number;
}

export class ResponsesRepository {
  async create(data: { surveyId: string; surveyVersion: number; answers: SubmittedAnswer[] }) {
    return ResponseModel.create(data);
  }

  async aggregateResults(surveyId: string) {
    const match = { surveyId: new Types.ObjectId(surveyId) };
    const [responseCounts, optionCounts] = await Promise.all([
      ResponseModel.aggregate<ResponseCountsByVersion>([
        { $match: match },
        { $group: { _id: "$surveyVersion", count: { $sum: 1 } } },
      ]),
      ResponseModel.aggregate<OptionCountsByVersion>([
        { $match: match },
        { $unwind: "$answers" },
        { $unwind: "$answers.optionIds" },
        {
          $group: {
            _id: {
              version: "$surveyVersion",
              questionId: "$answers.questionId",
              optionId: "$answers.optionIds",
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return { responseCounts, optionCounts };
  }

  async findForExport(surveyId: string, filter: { from?: Date; toExclusive?: Date }) {
    const submittedAt: { $gte?: Date; $lt?: Date } = {};
    if (filter.from) submittedAt.$gte = filter.from;
    if (filter.toExclusive) submittedAt.$lt = filter.toExclusive;

    const query: { surveyId: Types.ObjectId; submittedAt?: typeof submittedAt } = {
      surveyId: new Types.ObjectId(surveyId),
    };
    if (filter.from || filter.toExclusive) query.submittedAt = submittedAt;

    return ResponseModel.find(query)
      .select("surveyVersion answers submittedAt")
      .sort({ submittedAt: 1 })
      .lean();
  }
}
