import { z } from 'zod';

export const arkeselRequestSchema = z.object({
  sessionID: z.string().min(1).max(100),
  userID: z.string().min(1).max(100),
  newSession: z.boolean(),
  msisdn: z.string().min(7).max(20),
  userData: z.string().max(100),
  network: z.string().max(50),
});
export type ArkeselRequest = z.infer<typeof arkeselRequestSchema>;

export function arkeselResponse(
  request: ArkeselRequest,
  message: string,
  continueSession: boolean,
) {
  return {
    sessionID: request.sessionID,
    userID: request.userID,
    msisdn: request.msisdn,
    message,
    continueSession,
  };
}
