export type TransactionRecord = {
  id: number;
  sender_name: string | null;
  amount: number | null;
  reference_number: string | null;
  transaction_date: string | null;
  raw_text: string;
  created_at: string;
};
