import { Router } from 'express';
import { AppError } from '../errors/app-error.js';
import { arkeselRequestSchema, arkeselResponse } from '../ussd/arkesel.js';
import { handleUssd } from '../ussd/ussd.service.js';

export const ussdRouter = Router();
ussdRouter.post('/arkesel', async (req, res, next) => {
  let request;
  try {
    request = arkeselRequestSchema.parse(req.body);
    const result = await handleUssd(request);
    res.json(arkeselResponse(request, result.message, result.continueSession));
  } catch (error) {
    if (request && error instanceof AppError) {
      res.status(error.statusCode).json(arkeselResponse(request, error.message, false));
      return;
    }
    next(error);
  }
});
