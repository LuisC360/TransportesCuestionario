import type { ResponsesRepository } from "../responses/responses.repository.js";
import type { SurveysService } from "../surveys/surveys.service.js";
import type { ExportDateQuery } from "./exports.validation.js";

export class ExportsService {
  constructor(
    private readonly responsesRepository: ResponsesRepository,
    private readonly surveysService: SurveysService,
  ) {}

  async exportSurveyResponses(surveyId: string, filters: ExportDateQuery) {
    const survey = await this.surveysService.getDefinitions(surveyId);
    const responses = await this.responsesRepository.findForExport(surveyId, {
      from: filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined,
      toExclusive: filters.to
        ? new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000)
        : undefined,
    });

    const responseCountByVersion = new Map<number, number>();
    const selectionCountByOption = new Map<string, number>();
    for (const response of responses) {
      responseCountByVersion.set(
        response.surveyVersion,
        (responseCountByVersion.get(response.surveyVersion) ?? 0) + 1,
      );
      for (const answer of response.answers) {
        for (const optionId of answer.optionIds) {
          const key = JSON.stringify([response.surveyVersion, answer.questionId, optionId]);
          selectionCountByOption.set(key, (selectionCountByOption.get(key) ?? 0) + 1);
        }
      }
    }

    const header = [
      "surveyVersion",
      "question",
      "option",
      "selectionCount",
      "responseCount",
      "percentageOfResponses",
    ];
    const rows = survey.versions.flatMap((version) =>
      version.questions.flatMap((question) =>
        question.options.map((option) => {
          const responseCount = responseCountByVersion.get(version.version) ?? 0;
          const selectionCount =
            selectionCountByOption.get(JSON.stringify([version.version, question.id, option.id])) ?? 0;
          const percentage =
            responseCount === 0 ? 0 : Number(((selectionCount / responseCount) * 100).toFixed(1));
          return [version.version, question.prompt, option.label, selectionCount, responseCount, percentage];
        }),
      ),
    );

    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
    const from = filters.from ?? "start";
    const to = filters.to ?? "end";

    return {
      csv,
      fileName: `survey-${surveyId}-${from}-to-${to}.csv`,
    };
  }
}

function escapeCsvCell(value: string | number) {
  let cell = String(value);
  if (/^\s*[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
}
