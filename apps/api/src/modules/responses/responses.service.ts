import { HttpError } from "../../middlewares/http-error.js";
import type { SurveysService } from "../surveys/surveys.service.js";
import type { ResponsesRepository } from "./responses.repository.js";
import { type SubmitResponseInput, submitResponseSchema } from "./responses.validation.js";

export class ResponsesService {
  constructor(
    private readonly responsesRepository: ResponsesRepository,
    private readonly surveysService: SurveysService,
  ) {}

  async getSurveyToAnswer(surveyId: string) {
    const survey = await this.surveysService.getById(surveyId, false);
    return {
      id: survey.id,
      version: survey.version,
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
    };
  }

  async submit(surveyId: string, input: SubmitResponseInput) {
    const data = submitResponseSchema.parse(input);
    const survey = await this.surveysService.getById(surveyId, false);

    if (data.version !== survey.version) {
      throw new HttpError(409, "Survey has changed; reload it before submitting");
    }

    const answersByQuestionId = new Map(data.answers.map((answer) => [answer.questionId, answer]));
    if (answersByQuestionId.size !== survey.questions.length) {
      throw new HttpError(400, "An answer is required for every question");
    }

    const normalizedAnswers = survey.questions.map((question) => {
      const answer = answersByQuestionId.get(question.id);
      if (!answer) throw new HttpError(400, `Missing answer for question ${question.id}`);

      const selectedOptionIds = new Set(answer.optionIds);
      if (
        answer.optionIds.some(
          (optionId) => !question.options.some((option) => option.id === optionId),
        )
      ) {
        throw new HttpError(400, `Answer contains an invalid option for question ${question.id}`);
      }
      if (
        selectedOptionIds.size < question.minSelections ||
        selectedOptionIds.size > question.maxSelections
      ) {
        throw new HttpError(
          400,
          `Question ${question.id} requires between ${question.minSelections} and ${question.maxSelections} selections`,
        );
      }

      return {
        questionId: question.id,
        optionIds: question.options
          .filter((option) => selectedOptionIds.has(option.id))
          .map((option) => option.id),
      };
    });

    const response = await this.responsesRepository.create({
      surveyId,
      surveyVersion: survey.version,
      answers: normalizedAnswers,
    });

    return { id: response.id, submittedAt: response.submittedAt };
  }

  async getResults(surveyId: string) {
    const survey = await this.surveysService.getDefinitions(surveyId);
    const { responseCounts, optionCounts } =
      await this.responsesRepository.aggregateResults(surveyId);
    const responseCountByVersion = new Map(responseCounts.map(({ _id, count }) => [_id, count]));
    const optionCountByKey = new Map(
      optionCounts.map(({ _id, count }) => [
        this.optionCountKey(_id.version, _id.questionId, _id.optionId),
        count,
      ]),
    );

    const versions = survey.versions.map((version) => {
      const responseCount = responseCountByVersion.get(version.version) ?? 0;
      const questions = version.questions.map((question) => {
        const options = question.options.map((option) => {
          const selectionCount =
            optionCountByKey.get(this.optionCountKey(version.version, question.id, option.id)) ?? 0;
          return {
            optionId: option.id,
            label: option.label,
            selectionCount,
            percentageOfResponses:
              responseCount === 0 ? 0 : Number(((selectionCount / responseCount) * 100).toFixed(1)),
          };
        });

        return {
          questionId: question.id,
          prompt: question.prompt,
          responseCount,
          totalSelections: options.reduce((sum, option) => sum + option.selectionCount, 0),
          options,
        };
      });

      return {
        version: version.version,
        title: version.title,
        responseCount,
        questions,
      };
    });

    return {
      surveyId,
      totalResponses: responseCounts.reduce((sum, item) => sum + item.count, 0),
      versions,
    };
  }

  private optionCountKey(version: number, questionId: string, optionId: string) {
    return JSON.stringify([version, questionId, optionId]);
  }
}
