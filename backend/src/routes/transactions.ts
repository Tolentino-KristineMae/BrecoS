import express from "express";
import db from "../db";

const router = express.Router();

// ── POST /api/transactions  — manual entry ──────────────────────────────────
router.post("/transactions", async (req, res) => {
  try {
    const { sender_name, amount, type, account, reference_number, transaction_date, note } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ success: false, error: "Amount is required and must be a number." });
    }
    if (!transaction_date) {
      return res.status(400).json({ success: false, error: "Transaction date is required." });
    }
    if (!["credit", "deduction"].includes(type)) {
      return res.status(400).json({ success: false, error: "Type must be 'credit' or 'deduction'." });
    }

    // Check for duplicate reference_number with same amount
    if (reference_number && reference_number.trim()) {
      const [existing] = await db.query(
        "SELECT id FROM transactions WHERE reference_number = ? AND amount = ?",
        [reference_number.trim(), parseFloat(amount)]
      ) as any;
      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: `Duplicate reference number "${reference_number.trim()}" with the same amount already exists.` 
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO transactions (sender_name, amount, type, account, reference_number, transaction_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sender_name?.trim() || null,
        parseFloat(amount),
        type,
        account?.trim() || null,
        reference_number?.trim() || null,
        new Date(transaction_date),
        note?.trim() || null,
      ]
    ) as any;

    const [rows] = await db.query("SELECT * FROM transactions WHERE id = ?", [result.insertId]) as any;
    const tx = rows[0];

    return res.json({
      success: true,
      transaction: { ...tx, amount: parseFloat(tx.amount) },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to save transaction." });
  }
});

// ── GET /api/transactions ───────────────────────────────────────────────────
router.get("/transactions", async (req, res) => {
  try {
    const { account } = req.query;
    let query = "SELECT * FROM transactions";
    const params: any[] = [];
    if (account && account !== "all") {
      query += " WHERE account = ?";
      params.push(account);
    }
    query += " ORDER BY transaction_date DESC, created_at DESC";
    const [rows] = await db.query(query, params) as any;
    const data = rows.map((row: any) => ({
      ...row,
      amount: parseFloat(row.amount),
      batch_number: row.batch_number ?? null,
      account: row.account ?? null,
    }));
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Unable to load transactions." });
  }
});

// ── DELETE /api/transactions/:id ────────────────────────────────────────────
router.delete("/transactions/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM transactions WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to delete transaction." });
  }
});

// ── POST /api/batch/preview — preview matches WITHOUT assigning batch ────────
router.post("/batch/preview", async (req, res) => {
  try {
    const claims: { amount: number; ref_note: string }[] = req.body.claims || [];

    if (!claims.length || claims.length > 5) {
      return res.status(400).json({ success: false, error: "Provide 1–5 claims." });
    }

    // Validate: both amount and ref_note are required
    for (const c of claims) {
      if (!c.amount || isNaN(parseFloat(String(c.amount))) || parseFloat(String(c.amount)) <= 0) {
        return res.status(400).json({ success: false, error: "Each claim must have a valid amount." });
      }
      if (!c.ref_note?.trim()) {
        return res.status(400).json({ success: false, error: "Each claim must have a reference or note." });
      }
    }

    // Get next batch number (for preview purposes only)
    const [batchRows] = await db.query(
      "SELECT COALESCE(MAX(batch_number), 0) + 1 AS next_batch FROM transactions"
    ) as any;
    const nextBatch: number = batchRows[0].next_batch;

    // Get all unmatched transactions
    const [unmatched] = await db.query(
      "SELECT * FROM transactions WHERE batch_number IS NULL ORDER BY transaction_date ASC, created_at ASC"
    ) as any;

    const matchedIds: number[] = [];
    const usedTxIds = new Set<number>();

    // Result per claim: matched tx or null
    const claimResults: Array<{
      claim: { amount: number; ref_note: string };
      matched: boolean;
      tx: any | null;
    }> = [];

    for (const claim of claims) {
      const claimAmount = parseFloat(String(claim.amount));
      const claimRef = claim.ref_note.trim().toLowerCase();
      let bestMatch: any = null;

      for (const tx of unmatched) {
        if (usedTxIds.has(tx.id)) continue;
        const txAmount = parseFloat(tx.amount);
        if (Math.abs(txAmount - claimAmount) > 0.001) continue;

        // Ref must match (partial is ok)
        const txRef = (tx.reference_number ?? tx.note ?? "").toLowerCase();
        if (txRef.includes(claimRef) || claimRef.includes(txRef)) {
          bestMatch = tx;
          break;
        }
      }

      if (bestMatch) {
        matchedIds.push(bestMatch.id);
        usedTxIds.add(bestMatch.id);
        claimResults.push({ claim, matched: true, tx: bestMatch });
      } else {
        claimResults.push({ claim, matched: false, tx: null });
      }
    }

    // NOTE: Batch number is NOT assigned yet - this is just a preview
    const unresolvedClaims = claimResults
      .filter(r => !r.matched)
      .map(r => r.claim);

    return res.json({
      success: true,
      batchNumber: nextBatch,
      matched: matchedIds.length,
      unresolved: unresolvedClaims.length,
      unresolvedClaims,
      matchedIds: matchedIds, // Return IDs for finalization
      claimResults: claimResults.map(r => ({
        claim: r.claim,
        matched: r.matched,
        tx: r.tx ? {
          id: r.tx.id,
          amount: parseFloat(r.tx.amount),
          type: r.tx.type,
          account: r.tx.account,
          reference_number: r.tx.reference_number,
          note: r.tx.note,
          transaction_date: r.tx.transaction_date,
          batch_number: nextBatch, // Show what batch number will be assigned
        } : null,
      })),
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── POST /api/batch/finalize — assign batch numbers to matched transactions ──
router.post("/batch/finalize", async (req, res) => {
  try {
    const { batchNumber, matchedIds }: { batchNumber: number; matchedIds: number[] } = req.body;

    if (!batchNumber || !matchedIds || !Array.isArray(matchedIds) || matchedIds.length === 0) {
      return res.status(400).json({ success: false, error: "Provide batchNumber and matchedIds." });
    }

    // Verify that the transactions are still unbatched
    const [existingRows] = await db.query(
      `SELECT id, batch_number FROM transactions WHERE id IN (${matchedIds.map(() => "?").join(",")})`,
      matchedIds
    ) as any;

    const stillUnbatched = existingRows.filter((row: any) => row.batch_number === null);
    if (stillUnbatched.length !== matchedIds.length) {
      return res.status(400).json({ 
        success: false, 
        error: "Some transactions have already been batched or modified. Please run check again." 
      });
    }

    // Assign batch number to matched transactions
    await db.query(
      `UPDATE transactions SET batch_number = ? WHERE id IN (${matchedIds.map(() => "?").join(",")})`,
      [batchNumber, ...matchedIds]
    );

    return res.json({
      success: true,
      batchNumber,
      finalized: matchedIds.length,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── POST /api/batch/check — match claims against unmatched transactions ──────
// DEPRECATED: Use /batch/preview for preview and /batch/finalize for finalizing
// Kept for backward compatibility
router.post("/batch/check", async (req, res) => {
  try {
    const claims: { amount: number; ref_note: string }[] = req.body.claims || [];

    if (!claims.length || claims.length > 5) {
      return res.status(400).json({ success: false, error: "Provide 1–5 claims." });
    }

    // Validate: both amount and ref_note are required
    for (const c of claims) {
      if (!c.amount || isNaN(parseFloat(String(c.amount))) || parseFloat(String(c.amount)) <= 0) {
        return res.status(400).json({ success: false, error: "Each claim must have a valid amount." });
      }
      if (!c.ref_note?.trim()) {
        return res.status(400).json({ success: false, error: "Each claim must have a reference or note." });
      }
    }

    // Get next batch number
    const [batchRows] = await db.query(
      "SELECT COALESCE(MAX(batch_number), 0) + 1 AS next_batch FROM transactions"
    ) as any;
    const nextBatch: number = batchRows[0].next_batch;

    // Get all unmatched transactions
    const [unmatched] = await db.query(
      "SELECT * FROM transactions WHERE batch_number IS NULL ORDER BY transaction_date ASC, created_at ASC"
    ) as any;

    const matchedIds: number[] = [];
    const usedTxIds = new Set<number>();

    // Result per claim: matched tx or null
    const claimResults: Array<{
      claim: { amount: number; ref_note: string };
      matched: boolean;
      tx: any | null;
    }> = [];

    for (const claim of claims) {
      const claimAmount = parseFloat(String(claim.amount));
      const claimRef = claim.ref_note.trim().toLowerCase();
      let bestMatch: any = null;

      for (const tx of unmatched) {
        if (usedTxIds.has(tx.id)) continue;
        const txAmount = parseFloat(tx.amount);
        if (Math.abs(txAmount - claimAmount) > 0.001) continue;

        // Ref must match (partial is ok)
        const txRef = (tx.reference_number ?? tx.note ?? "").toLowerCase();
        if (txRef.includes(claimRef) || claimRef.includes(txRef)) {
          bestMatch = tx;
          break;
        }
      }

      if (bestMatch) {
        matchedIds.push(bestMatch.id);
        usedTxIds.add(bestMatch.id);
        claimResults.push({ claim, matched: true, tx: bestMatch });
      } else {
        claimResults.push({ claim, matched: false, tx: null });
      }
    }

    // Assign batch number to matched transactions
    if (matchedIds.length > 0) {
      await db.query(
        `UPDATE transactions SET batch_number = ? WHERE id IN (${matchedIds.map(() => "?").join(",")})`,
        [nextBatch, ...matchedIds]
      );
    }

    const unresolvedClaims = claimResults
      .filter(r => !r.matched)
      .map(r => r.claim);

    return res.json({
      success: true,
      batchNumber: nextBatch,
      matched: matchedIds.length,
      unresolved: unresolvedClaims.length,
      unresolvedClaims,
      claimResults: claimResults.map(r => ({
        claim: r.claim,
        matched: r.matched,
        tx: r.tx ? {
          id: r.tx.id,
          amount: parseFloat(r.tx.amount),
          type: r.tx.type,
          reference_number: r.tx.reference_number,
          note: r.tx.note,
          transaction_date: r.tx.transaction_date,
          batch_number: nextBatch,
        } : null,
      })),
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── PATCH /api/transactions/:id — edit a transaction ────────────────────────
router.patch("/transactions/:id", async (req, res) => {
  try {
    const { amount, reference_number, note, transaction_date, type, account } = req.body;
    const id = parseInt(req.params.id);

    const fields: string[] = [];
    const values: any[] = [];

    if (amount !== undefined) { fields.push("amount = ?"); values.push(parseFloat(amount)); }
    if (reference_number !== undefined) { fields.push("reference_number = ?"); values.push(reference_number?.trim() || null); }
    if (note !== undefined) { fields.push("note = ?"); values.push(note?.trim() || null); }
    if (transaction_date !== undefined) { fields.push("transaction_date = ?"); values.push(new Date(transaction_date)); }
    if (type !== undefined) { fields.push("type = ?"); values.push(type); }
    if (account !== undefined) { fields.push("account = ?"); values.push(account?.trim() || null); }

    if (!fields.length) return res.status(400).json({ success: false, error: "Nothing to update." });

    values.push(id);
    await db.query(`UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`, values);

    const [rows] = await db.query("SELECT * FROM transactions WHERE id = ?", [id]) as any;
    return res.json({ success: true, transaction: { ...rows[0], amount: parseFloat(rows[0].amount) } });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── GET /api/batch/summary — list all batches with counts ───────────────────
router.get("/batch/summary", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        batch_number,
        COUNT(*) AS count,
        SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) AS net,
        MIN(transaction_date) AS earliest,
        MAX(transaction_date) AS latest
      FROM transactions
      WHERE batch_number IS NOT NULL
      GROUP BY batch_number
      ORDER BY batch_number ASC
    `) as any;

    const [unbatchedRow] = await db.query(
      "SELECT COUNT(*) AS count FROM transactions WHERE batch_number IS NULL"
    ) as any;

    return res.json({
      success: true,
      batches: rows.map((r: any) => ({
        batchNumber: r.batch_number,
        count: parseInt(r.count),
        net: parseFloat(r.net),
        earliest: r.earliest,
        latest: r.latest,
      })),
      unbatched: parseInt(unbatchedRow[0].count),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── DELETE /api/batch/:number — clear batch assignment (unbatch) ─────────────
router.delete("/batch/:number", async (req, res) => {
  try {
    await db.query(
      "UPDATE transactions SET batch_number = NULL WHERE batch_number = ?",
      [parseInt(req.params.number)]
    );
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── GET /api/settings/opening-balance ───────────────────────────────────────
router.get("/settings/opening-balance", async (req, res) => {
  try {
    const key = (req.query.key as string) || "opening_balance";
    const [rows] = await db.query("SELECT value FROM settings WHERE key_name = ?", [key]) as any;
    return res.json({ success: true, value: parseFloat(rows[0]?.value ?? "0") });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── PUT /api/settings/opening-balance ───────────────────────────────────────
router.put("/settings/opening-balance", async (req, res) => {
  try {
    const value = parseFloat(req.body.value);
    const key = req.body.key || "opening_balance";
    if (isNaN(value)) return res.status(400).json({ success: false, error: "Invalid value." });
    await db.query(
      "INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
      [key, value.toString(), value.toString()]
    );
    return res.json({ success: true, value });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ── GET /api/analytics ──────────────────────────────────────────────────────
router.get("/analytics", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_transactions,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount ELSE 0 END), 0) AS total_deductions,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) AS tx_total
      FROM transactions
    `) as any;
    const [settingRows] = await db.query("SELECT value FROM settings WHERE key_name = 'opening_balance'") as any;
    const openingBalance = parseFloat(settingRows[0]?.value ?? "0");
    const row = rows[0];
    return res.json({
      success: true,
      data: {
        totalTransactions: parseInt(row.total_transactions, 10),
        totalCredits: parseFloat(row.total_credits),
        totalDeductions: parseFloat(row.total_deductions),
        runningTotal: parseFloat(row.tx_total) + openingBalance,
        openingBalance,
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Unable to load analytics." });
  }
});

export default router;
