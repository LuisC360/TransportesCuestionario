import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { ResponsesRepository } from "../responses/responses.repository.js";
import { SurveysRepository } from "../surveys/surveys.repository.js";
import { SurveysService } from "../surveys/surveys.service.js";
import { ExportsController } from "./exports.controller.js";
import { ExportsService } from "./exports.service.js";

const router = Router();
const surveysService = new SurveysService(new SurveysRepository());
const exportsService = new ExportsService(new ResponsesRepository(), surveysService);
const controller = new ExportsController(exportsService);

router.use(authenticate, authorize("superadmin"));
router.get("/surveys/:surveyId.csv", controller.exportSurveyResponses);

export default router;
