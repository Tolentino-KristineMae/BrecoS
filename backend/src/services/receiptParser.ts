export type ParsedReceipt = {
  sender_name: string | null;
  amount: number | null;
  reference_number: string | null;
  transaction_date: string | null;
  raw_text: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize OCR noise: collapse whitespace, fix common misreads */
const normalize = (text: string): string =>
  text
    .replace(/[|l](?=\d)/g, "1")   // OCR misreads | or l as 1 before digits
    .replace(/O(?=\d)/g, "0")       // O misread as 0
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

/** Try to parse a date string into ISO, returns null if invalid */
const toISO = (raw: string): string | null => {
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// ─── Amount ─────────────────────────────────────────────────────────────────

const parseAmount = (text: string): number | null => {
  const t = normalize(text);

  // Ordered from most specific to least specific
  const patterns: RegExp[] = [
    // "Amount Paid PHP 1,700.00" / "Amount PHP 500.00"
    /(?:Amount\s*Paid|Total\s*Amount|Amount)[:\s]*(?:PHP|Php|₱)?\s*([\d,]+\.\d{2})/i,
    // "PHP 1,700.00" or "Php500.00"
    /(?:PHP|Php)\s*([\d,]+\.\d{2})/,
    // "₱ 1,700.00" or "₱1700.00"
    /₱\s*([\d,]+(?:\.\d{1,2})?)/,
    // "GCash Amount: 500.00"
    /GCash\s*(?:Amount|Payment)[:\s]*([\d,]+\.\d{2})/i,
    // "Total: 500.00"
    /Total[:\s]*([\d,]+\.\d{2})/i,
    // Standalone decimal number that looks like money (last resort)
    /\b([\d,]{1,10}\.\d{2})\b/,
  ];

  const seen = new Set<number>();

  for (const regex of patterns) {
    // Reset lastIndex for global flags
    regex.lastIndex = 0;
    const match = regex.exec(t);
    if (match?.[1]) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(value) && value > 0 && !seen.has(value)) {
        seen.add(value);
        return value;
      }
    }
  }

  return null;
};

// ─── Reference Number ────────────────────────────────────────────────────────

const parseReferenceNumber = (text: string): string | null => {
  const t = normalize(text);

  const patterns: RegExp[] = [
    // "Ref. No. 1234567890123"  /  "Ref No: 1234567890"
    /Ref(?:erence)?\.?\s*No\.?[:\s#]*([A-Za-z0-9]{8,20})/i,
    // "Reference Number: 1234567890"
    /Reference\s*Number[:\s]*([A-Za-z0-9]{8,20})/i,
    // "Ref# 1234567890"
    /Ref\s*#\s*([A-Za-z0-9]{8,20})/i,
    // "Transaction ID: 1234567890"
    /(?:Transaction|Txn|Trans)\.?\s*(?:ID|No\.?|Number)[:\s#]*([A-Za-z0-9]{8,20})/i,
    // GCash-style 13-digit numeric reference
    /\b(\d{13})\b/,
    // GCash-style 12-digit numeric reference
    /\b(\d{12})\b/,
    // Alphanumeric ref like "GC1234567890"
    /\b(GC[A-Z0-9]{8,16})\b/i,
    // Fallback: any 10–16 digit number on its own line (common in GCash screenshots)
    /^\s*(\d{10,16})\s*$/m,
  ];

  for (const regex of patterns) {
    regex.lastIndex = 0;
    const match = regex.exec(t);
    if (match?.[1]) {
      const ref = match[1].trim();
      // Sanity check: skip if it looks like a phone number starting with 09
      if (/^09\d{9}$/.test(ref)) continue;
      return ref;
    }
  }

  return null;
};

// ─── Transaction Date ────────────────────────────────────────────────────────

const parseTransactionDate = (text: string): string | null => {
  const t = normalize(text);

  // Patterns paired with optional time capture
  const patterns: Array<{ date: RegExp; time?: RegExp }> = [
    // "Jan 30, 2024 3:45 PM"
    {
      date: /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i,
      time: /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))\b/i,
    },
    // "01/30/2024 3:45 PM" or "01-30-2024"
    {
      date: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
      time: /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\b/i,
    },
    // "2024-01-30" ISO style
    {
      date: /\b(\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/,
      time: /\b(\d{2}:\d{2}(?::\d{2})?)\b/,
    },
    // "30 January 2024"
    {
      date: /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i,
    },
    // "1/31/24" short year
    {
      date: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2})\b/,
      time: /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\b/i,
    },
  ];

  for (const { date: dateRegex, time: timeRegex } of patterns) {
    const dateMatch = dateRegex.exec(t);
    if (!dateMatch) continue;

    let combined = dateMatch[1];

    if (timeRegex) {
      const timeMatch = timeRegex.exec(t);
      if (timeMatch?.[1]) {
        combined += " " + timeMatch[1];
      }
    }

    const iso = toISO(combined);
    if (iso) return iso;
  }

  return null;
};

// ─── Sender / Recipient Name ─────────────────────────────────────────────────

const parseSenderName = (text: string): string | null => {
  const t = normalize(text);
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);

  // Labeled field patterns — most reliable
  const labeledPatterns: RegExp[] = [
    /^(?:From|Sender(?:\s*Name)?|Paid\s*by|Received\s*from|Source)[:\s\-]+(.{3,60})$/im,
    /^(?:To|Recipient(?:\s*Name)?|Receiver|Received\s*by|Beneficiary)[:\s\-]+(.{3,60})$/im,
    /^(?:Account\s*Name|Account\s*Holder)[:\s\-]+(.{3,60})$/im,
    /^(?:Name)[:\s\-]+([A-Z][A-Za-z\s.'-]{2,50})$/im,
  ];

  for (const regex of labeledPatterns) {
    const match = regex.exec(t);
    if (match?.[1]) {
      const name = cleanName(match[1]);
      if (name) return name;
    }
  }

  // GCash-specific: line after "You sent" / "You paid" / "Send Money to"
  const actionPatterns = [
    /You\s+(?:sent|paid|transferred)\s+(?:money\s+)?(?:to\s+)?(.{3,60})/i,
    /Send\s+Money\s+to\s+(.{3,60})/i,
    /Cash\s+(?:In|Out)\s+(?:from|to)\s+(.{3,60})/i,
    /Transfer\s+to\s+(.{3,60})/i,
  ];

  for (const regex of actionPatterns) {
    const match = regex.exec(t);
    if (match?.[1]) {
      const name = cleanName(match[1]);
      if (name) return name;
    }
  }

  // Heuristic: find a line that looks like a full name (2+ capitalized words)
  // but skip lines that are clearly labels or amounts
  const skipWords = /^(gcash|amount|total|ref|date|time|php|transaction|payment|receipt|thank|dear|hi|hello|from|to|paid|send|transfer|cash|biller|fee|service|status|success|approved|completed)/i;
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}$/;

  for (const line of lines) {
    if (skipWords.test(line)) continue;
    if (namePattern.test(line) && line.length >= 5 && line.length <= 60) {
      return line;
    }
  }

  return null;
};

/** Strip trailing noise from a parsed name */
const cleanName = (raw: string): string | null => {
  const cleaned = raw
    .split(/\n/)[0]           // take only first line
    .replace(/[₱\d,\.]+.*$/, "") // strip trailing amounts
    .replace(/\s{2,}/g, " ")
    .trim();

  // Must have at least 2 chars and contain a letter
  if (cleaned.length < 2 || !/[A-Za-z]/.test(cleaned)) return null;
  return cleaned;
};

// ─── Main export ─────────────────────────────────────────────────────────────

export const parseReceiptText = (rawText: string): ParsedReceipt => {
  return {
    sender_name: parseSenderName(rawText),
    amount: parseAmount(rawText),
    reference_number: parseReferenceNumber(rawText),
    transaction_date: parseTransactionDate(rawText),
    raw_text: rawText,
  };
};
