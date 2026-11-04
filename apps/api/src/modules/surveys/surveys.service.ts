import { randomUUID } from "node:crypto";

import { HttpError } from "../../middlewares/http-error.js";
import type { SurveysRepository } from "./surveys.repository.js";
import type { SurveyDefinition, SurveyDefinitionInput } from "./surveys.types.js";
import {
  type CreateSurveyInput,
  createSurveySchema,
  type SurveyStatusInput,
  surveyStatusSchema,
  type UpdateSurveyInput,
  updateSurveySchema,
} from "./surveys.validation.js";

export class SurveysService {
  constructor(private readonly surveysRepository: SurveysRepository) {}

  async create(input: CreateSurveyInput, userId: string) {
    const data = createSurveySchema.parse(input);
    const survey = await this.surveysRepository.create({
      createdBy: userId,
      definition: this.createDefinition(data, 1, userId),
    });
    return this.toCurrentSurvey(survey);
  }

  async list(activeOnly: boolean) {
    const surveys = await this.surveysRepository.findAll(activeOnly);
    return surveys.map((survey) => this.toCurrentSurvey(survey));
  }

  async getById(id: string, includeInactive: boolean) {
    const survey = await this.findByIdOrThrow(id);
    if (!survey.isActive && !includeInactive) throw new HttpError(404, "Survey not found");
    return this.toCurrentSurvey(survey);
  }

  async update(id: string, input: UpdateSurveyInput, userId: string) {
    const data = updateSurveySchema.parse(input);
    const existing = await this.findByIdOrThrow(id);

    if (existing.currentVersion !== data.expectedVersion) {
      throw new HttpError(409, "Survey has changed; reload it before editing");
    }

    const nextVersion = this.createDefinition(data, existing.currentVersion + 1, userId);
    const survey = await this.surveysRepository.appendVersion(
      id,
      data.expectedVersion,
      nextVersion,
    );
    if (!survey) throw new HttpError(409, "Survey has changed; reload it before editing");
    return this.toCurrentSurvey(survey);
  }

  async setActive(id: string, input: SurveyStatusInput) {
    const { isActive } = surveyStatusSchema.parse(input);
    const survey = await this.surveysRepository.setActive(id, isActive);
    if (!survey) throw new HttpError(404, "Survey not found");
    return this.toCurrentSurvey(survey);
  }

  async listVersions(id: string) {
    const survey = await this.findByIdOrThrow(id);
    return survey.versions.map((version) => ({
      version: version.version,
      title: version.title,
      description: version.description,
      questionCount: version.questions.length,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
    }));
  }

  async getVersion(id: string, versionNumber: number) {
    const survey = await this.findByIdOrThrow(id);
    const version = survey.versions.find((item) => item.version === versionNumber);
    if (!version) throw new HttpError(404, "Survey version not found");
    return {
      surveyId: survey.id,
      isActive: survey.isActive,
      ...this.toVersionData(version),
    };
  }

  async getDefinitions(id: string) {
    const survey = await this.findByIdOrThrow(id);
    return {
      surveyId: survey.id,
      isActive: survey.isActive,
      currentVersion: survey.currentVersion,
      versions: survey.versions.map((version) => this.toVersionData(version)),
    };
  }

  private async findByIdOrThrow(id: string) {
    const survey = await this.surveysRepository.findById(id);
    if (!survey) throw new HttpError(404, "Survey not found");
    return survey;
  }

  private createDefinition(
    input: SurveyDefinitionInput,
    version: number,
    userId: string,
  ): SurveyDefinition {
    return {
      version,
      title: input.title,
      description: input.description,
      createdBy: userId,
      createdAt: new Date(),
      questions: input.questions.map((question) => ({
        id: question.id ?? randomUUID(),
        prompt: question.prompt,
        minSelections: question.minSelections,
        maxSelections: question.maxSelections ?? question.options.length,
        options: question.options.map((option) => ({
          id: option.id ?? randomUUID(),
          label: option.label,
        })),
      })),
    };
  }

  private toCurrentSurvey(survey: {
    id?: string;
    _id: { toString: () => string };
    isActive: boolean;
    currentVersion: number;
    createdAt: Date;
    updatedAt: Date;
    versions: SurveyDefinition[];
  }) {
    const definition = survey.versions.find((item) => item.version === survey.currentVersion);
    if (!definition) throw new Error("Current survey version is missing");

    return {
      id: survey.id ?? survey._id.toString(),
      isActive: survey.isActive,
      ...this.toVersionData(definition),
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    };
  }

  private toVersionData(definition: SurveyDefinition) {
    return {
      version: definition.version,
      title: definition.title,
      description: definition.description,
      createdBy: definition.createdBy,
      createdAt: definition.createdAt,
      questions: definition.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        minSelections: question.minSelections,
        maxSelections: question.maxSelections,
        options: question.options.map((option) => ({ id: option.id, label: option.label })),
      })),
    };
  }
}
