import type { Request, Response } from "express";
import type { ExportsService } from "./exports.service.js";
import { exportDateQuerySchema, exportSurveyIdParamSchema } from "./exports.validation.js";

export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  exportSurveyResponses = async (req: Request, res: Response) => {
    const params = exportSurveyIdParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ success: false, errors: params.error.issues });
      return;
    }

    const query = exportDateQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ success: false, errors: query.error.issues });
      return;
    }

    const { csv, fileName } = await this.exportsService.exportSurveyResponses(
      params.data.surveyId,
      query.data,
    );

    res.attachment(fileName);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.status(200).send(csv);
  };
}
