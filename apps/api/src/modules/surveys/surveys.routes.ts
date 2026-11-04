import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate, validateParams } from "../../middlewares/validate.middleware.js";
import { SurveysController } from "./surveys.controller.js";
import { SurveysRepository } from "./surveys.repository.js";
import { SurveysService } from "./surveys.service.js";
import {
  createSurveySchema,
  surveyIdParamSchema,
  surveyStatusSchema,
  surveyVersionParamSchema,
  updateSurveySchema,
} from "./surveys.validation.js";

const router = Router();
const service = new SurveysService(new SurveysRepository());
const controller = new SurveysController(service);

router.use(authenticate);

router.get("/", controller.list);
router.post("/", authorize("superadmin"), validate(createSurveySchema), controller.create);
router.get(
  "/:surveyId/versions",
  authorize("superadmin"),
  validateParams(surveyIdParamSchema),
  controller.listVersions,
);
router.get(
  "/:surveyId/versions/:version",
  authorize("superadmin"),
  validateParams(surveyVersionParamSchema),
  controller.getVersion,
);
router.get("/:surveyId", validateParams(surveyIdParamSchema), controller.getById);
router.put(
  "/:surveyId",
  authorize("superadmin"),
  validateParams(surveyIdParamSchema),
  validate(updateSurveySchema),
  controller.update,
);
router.patch(
  "/:surveyId/status",
  authorize("superadmin"),
  validateParams(surveyIdParamSchema),
  validate(surveyStatusSchema),
  controller.setActive,
);

export default router;
