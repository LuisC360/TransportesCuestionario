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

    const versionByNumber = new Map(survey.versions.map((version) => [version.version, version]));
    const questionColumns = survey.versions.flatMap((version) =>
      version.questions.map((question) => ({
        key: `${version.version}:${question.id}`,
        version: version.version,
        questionId: question.id,
        prompt: question.prompt,
        optionLabels: new Map(question.options.map((option) => [option.id, option.label])),
      })),
    );

    const header = [
      "submittedAt",
      "surveyVersion",
      ...questionColumns.map((column) => `V${column.version}: ${column.prompt}`),
    ];
    const rows = responses.map((response) => {
      const version = versionByNumber.get(response.surveyVersion);
      const answers = new Map(
        response.answers.map((answer) => [answer.questionId, answer.optionIds]),
      );
      const values = questionColumns.map((column) => {
        if (column.version !== response.surveyVersion || !version) return "";
        const selectedIds = answers.get(column.questionId) ?? [];
        return selectedIds
          .map((optionId) => column.optionLabels.get(optionId))
          .filter((label): label is string => label !== undefined)
          .join("; ");
      });

      return [response.submittedAt.toISOString(), response.surveyVersion, ...values];
    });

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
