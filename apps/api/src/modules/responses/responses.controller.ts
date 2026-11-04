import type { Request, Response } from "express";
import type { ResponsesService } from "./responses.service.js";
import { responseSurveyIdParamSchema } from "./responses.validation.js";

export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  getSurveyToAnswer = async (req: Request, res: Response) => {
    const { surveyId } = responseSurveyIdParamSchema.parse(req.params);
    const survey = await this.responsesService.getSurveyToAnswer(surveyId);
    res.status(200).json({ success: true, data: survey });
  };

  submit = async (req: Request, res: Response) => {
    const { surveyId } = responseSurveyIdParamSchema.parse(req.params);
    const response = await this.responsesService.submit(surveyId, req.body);
    res.status(201).json({ success: true, data: response });
  };

  getResults = async (req: Request, res: Response) => {
    const { surveyId } = responseSurveyIdParamSchema.parse(req.params);
    const results = await this.responsesService.getResults(surveyId);
    res.status(200).json({ success: true, data: results });
  };
}
