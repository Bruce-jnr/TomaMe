export type PaymentInitialization = {
  reference: string;
  authorizationUrl: string;
};

export type VerifiedPayment = {
  reference: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  successful: boolean;
  paymentMethod?: string;
  paidAt?: Date;
};

export interface PaymentProvider {
  initializePayment(input: {
    reference: string;
    amount: number;
    currency: string;
    email?: string;
    phone: string;
    callbackUrl: string;
  }): Promise<PaymentInitialization>;
  verifyPayment(reference: string): Promise<VerifiedPayment>;
  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean;
}
