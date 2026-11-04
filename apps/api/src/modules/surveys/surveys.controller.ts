import type { Request, Response } from "express";

import { HttpError } from "../../middlewares/http-error.js";
import type { SurveysService } from "./surveys.service.js";
import { surveyIdParamSchema, surveyVersionParamSchema } from "./surveys.validation.js";

export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  create = async (req: Request, res: Response) => {
    const userId = req.authenticatedUser?.id;
    if (!userId) throw new HttpError(401, "Authentication required");
    const survey = await this.surveysService.create(req.body, userId);
    res.status(201).json({ success: true, data: survey });
  };

  list = async (req: Request, res: Response) => {
    const activeOnly = req.authenticatedUser?.role !== "superadmin";
    const surveys = await this.surveysService.list(activeOnly);
    res.status(200).json({ success: true, data: surveys });
  };

  getById = async (req: Request, res: Response) => {
    const { surveyId } = surveyIdParamSchema.parse(req.params);
    const includeInactive = req.authenticatedUser?.role === "superadmin";
    const survey = await this.surveysService.getById(surveyId, includeInactive);
    res.status(200).json({ success: true, data: survey });
  };

  update = async (req: Request, res: Response) => {
    const { surveyId } = surveyIdParamSchema.parse(req.params);
    const userId = req.authenticatedUser?.id;
    if (!userId) throw new HttpError(401, "Authentication required");
    const survey = await this.surveysService.update(surveyId, req.body, userId);
    res.status(200).json({ success: true, data: survey });
  };

  setActive = async (req: Request, res: Response) => {
    const { surveyId } = surveyIdParamSchema.parse(req.params);
    const survey = await this.surveysService.setActive(surveyId, req.body);
    res.status(200).json({ success: true, data: survey });
  };

  listVersions = async (req: Request, res: Response) => {
    const { surveyId } = surveyIdParamSchema.parse(req.params);
    const versions = await this.surveysService.listVersions(surveyId);
    res.status(200).json({ success: true, data: versions });
  };

  getVersion = async (req: Request, res: Response) => {
    const { surveyId, version } = surveyVersionParamSchema.parse(req.params);
    const data = await this.surveysService.getVersion(surveyId, version);
    res.status(200).json({ success: true, data });
  };
}
