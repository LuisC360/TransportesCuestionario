import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate, validateParams } from "../../middlewares/validate.middleware.js";
import { SurveysRepository } from "../surveys/surveys.repository.js";
import { SurveysService } from "../surveys/surveys.service.js";
import { ResponsesController } from "./responses.controller.js";
import { ResponsesRepository } from "./responses.repository.js";
import { ResponsesService } from "./responses.service.js";
import { responseSurveyIdParamSchema, submitResponseSchema } from "./responses.validation.js";

const router = Router();
const surveysService = new SurveysService(new SurveysRepository());
const responsesService = new ResponsesService(new ResponsesRepository(), surveysService);
const controller = new ResponsesController(responsesService);

router.use(authenticate);

router.get(
  "/surveys/:surveyId/results",
  authorize("superadmin"),
  validateParams(responseSurveyIdParamSchema),
  controller.getResults,
);
router.get(
  "/surveys/:surveyId",
  validateParams(responseSurveyIdParamSchema),
  controller.getSurveyToAnswer,
);
router.post(
  "/surveys/:surveyId",
  validateParams(responseSurveyIdParamSchema),
  validate(submitResponseSchema),
  controller.submit,
);

export default router;
