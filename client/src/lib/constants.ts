// Payment modes that require a bank account
export const BANK_REQUIRED_MODES = ['Bank', 'UPI', 'Cheque'] as const;

// Type for bank required modes
export type BankRequiredMode = typeof BANK_REQUIRED_MODES[number];