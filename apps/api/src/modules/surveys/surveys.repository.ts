import { SurveyModel } from "./surveys.model.js";
import type { SurveyDefinition } from "./surveys.types.js";

export class SurveysRepository {
  async create(data: { createdBy: string; definition: SurveyDefinition }) {
    return SurveyModel.create({
      createdBy: data.createdBy,
      currentVersion: data.definition.version,
      isActive: false,
      versions: [data.definition],
    });
  }

  async findById(id: string) {
    return SurveyModel.findById(id);
  }

  async findAll(activeOnly: boolean) {
    return SurveyModel.find(activeOnly ? { isActive: true } : {})
      .sort({ updatedAt: -1 })
      .lean();
  }

  async appendVersion(id: string, expectedVersion: number, definition: SurveyDefinition) {
    return SurveyModel.findOneAndUpdate(
      { _id: id, currentVersion: expectedVersion },
      {
        $set: { currentVersion: definition.version },
        $push: { versions: definition },
      },
      { new: true, runValidators: true },
    );
  }

  async setActive(id: string, isActive: boolean) {
    return SurveyModel.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true, runValidators: true },
    );
  }
}
