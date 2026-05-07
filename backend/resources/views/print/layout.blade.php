<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ $title ?? 'Breco System' }}</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after {
      box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* ── Base ── */
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
      font-size: 12px;
      color: #1e293b;
      background: #f1f5f9;
    }

    /* ── Page wrapper ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 12mm auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    }

    /* ── Header band ── */
    .doc-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%);
      padding: 22px 28px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .doc-header::before {
      content: '';
      position: absolute;
      right: -40px; top: -40px;
      width: 160px; height: 160px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
    }
    .doc-header::after {
      content: '';
      position: absolute;
      right: 60px; bottom: -50px;
      width: 120px; height: 120px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
    }

    .brand { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
    .brand-icon {
      width: 42px; height: 42px;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 900; color: #fff;
      box-shadow: 0 4px 12px rgba(99,102,241,0.4);
      flex-shrink: 0;
    }
    .brand-name { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.5px; line-height: 1; }
    .brand-sub  { font-size: 10px; color: rgba(255,255,255,0.55); margin-top: 3px; letter-spacing: 0.03em; }

    .doc-meta { text-align: right; position: relative; z-index: 1; }
    .doc-meta .doc-title {
      font-size: 16px; font-weight: 700; color: #fff;
      background: rgba(255,255,255,0.12);
      padding: 5px 14px; border-radius: 20px;
      display: inline-block;
    }
    .doc-meta .doc-date { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 6px; }

    /* ── Content area ── */
    .content { padding: 24px 28px; }

    /* ── Section title ── */
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6366f1;
      margin-bottom: 10px;
      margin-top: 22px;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 3px; height: 12px;
      background: linear-gradient(180deg, #6366f1, #3b82f6);
      border-radius: 2px;
      flex-shrink: 0;
    }
    .section-title:first-child { margin-top: 0; }

    /* ── Summary cards grid ── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: #f8faff;
      border: 1px solid #e0e7ff;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .summary-card .sc-label { font-size: 9.5px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
    .summary-card .sc-value { font-size: 15px; font-weight: 800; color: #1e293b; }
    .summary-card .sc-value.green  { color: #059669; }
    .summary-card .sc-value.red    { color: #dc2626; }
    .summary-card .sc-value.purple { color: #7c3aed; }
    .summary-card .sc-value.blue   { color: #2563eb; }

    /* ── Info grid (key-value pairs) ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      background: #f8faff;
      border: 1px solid #e0e7ff;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 18px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 10.5px; font-weight: 500; }
    .info-value { font-weight: 700; color: #1e293b; font-size: 11px; text-align: right; }
    .info-value.mono { font-family: 'Courier New', monospace; }

    /* ── Amount hero ── */
    .amount-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%);
      border-radius: 10px;
      padding: 16px 20px;
      color: #fff;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 18px;
      position: relative;
      overflow: hidden;
    }
    .amount-hero::after {
      content: '';
      position: absolute;
      right: -20px; top: -20px;
      width: 100px; height: 100px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
    }
    .amount-hero .amt-label { font-size: 9.5px; color: rgba(255,255,255,0.55); margin-bottom: 4px; font-weight: 500; }
    .amount-hero .amt-value { font-size: 18px; font-weight: 800; }
    .amount-hero .amt-value.green  { color: #6ee7b7; }
    .amount-hero .amt-value.red    { color: #fca5a5; }

    /* ── Progress bar ── */
    .progress-wrap { margin-bottom: 18px; }
    .progress-bar-bg { height: 8px; background: #e0e7ff; border-radius: 99px; overflow: hidden; }
    .progress-bar-fill {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #34d399, #10b981);
    }
    .progress-label { font-size: 10px; color: #64748b; text-align: right; margin-top: 4px; font-weight: 600; }

    /* ── Status badges ── */
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 99px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .badge-paid    { background: #d1fae5; color: #065f46; }
    .badge-partial { background: #fef3c7; color: #92400e; }
    .badge-unpaid  { background: #fee2e2; color: #991b1b; }
    .badge-pending { background: #fff7ed; color: #92400e; }
    .badge-settled { background: #d1fae5; color: #065f46; }

    /* ── Due date status ── */
    .due-status {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px;
      font-size: 10.5px; font-weight: 600;
      margin-bottom: 18px;
    }
    .due-status.early   { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .due-status.ontime  { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .due-status.late    { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
    .due-status.overdue { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .due-status.pending { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .due-status.today   { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }

    /* ── Table ── */
    .table-wrap {
      border: 1px solid #e0e7ff;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: linear-gradient(135deg, #f0f4ff, #f8faff); }
    th {
      padding: 9px 11px;
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6366f1;
      border-bottom: 1.5px solid #e0e7ff;
      white-space: nowrap;
    }
    th.right  { text-align: right; }
    th.center { text-align: center; }
    td {
      padding: 8px 11px;
      font-size: 11px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
      white-space: normal;
      word-break: break-word;
    }
    td.right  { text-align: right; white-space: nowrap; }
    td.center { text-align: center; white-space: nowrap; }
    td.mono   { font-family: 'Courier New', monospace; font-size: 10.5px; white-space: nowrap; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafbff; }

    .txn-id {
      font-family: 'Courier New', monospace;
      font-size: 10px; font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px; border-radius: 5px;
      white-space: nowrap;
    }
    .amount-total   { font-weight: 700; color: #1e293b; }
    .amount-paid    { font-weight: 700; color: #059669; }
    .amount-balance { font-weight: 700; color: #dc2626; }

    .pay-num {
      width: 22px; height: 22px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      border-radius: 5px;
      color: #fff; font-size: 10px; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
    }

    .totals-row td {
      font-weight: 700;
      background: linear-gradient(135deg, #f0f4ff, #eef2ff) !important;
      border-top: 2px solid #c7d2fe;
      color: #1e293b;
    }

    /* ── Notes box ── */
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 11px;
      color: #78350f;
      margin-bottom: 18px;
    }
    .notes-box strong {
      display: block; font-size: 9.5px;
      text-transform: uppercase; letter-spacing: 0.07em;
      margin-bottom: 3px; color: #92400e;
    }

    /* ── Divider between sections ── */
    .section-divider {
      height: 1px;
      background: linear-gradient(90deg, #e0e7ff, transparent);
      margin: 20px 0;
    }

    /* ── Footer ── */
    .doc-footer {
      background: #f8faff;
      border-top: 1px solid #e0e7ff;
      padding: 12px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #94a3b8;
    }
    .doc-footer span { display: flex; align-items: center; gap: 5px; }

    /* ── Print ── */
    @media print {
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      @page {
        size: A4;
        margin: 12mm 10mm;
      }
      body { background: #fff; }
      .page {
        margin: 0;
        border-radius: 0;
        box-shadow: none;
        width: 100%;
      }
      .content { padding: 12px 16px; }
      .doc-header { padding: 14px 16px; }
      .no-print { display: none !important; }

      /* Keep table headers on every page */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }

      /* Prevent rows from splitting across pages */
      tr { page-break-inside: avoid; break-inside: avoid; }

      /* Allow sections to break across pages */
      .table-wrap { page-break-inside: auto; break-inside: auto; }
      .section-title { page-break-after: avoid; break-after: avoid; }
    }

    /* ── Print button (screen only) ── */
    .print-btn {
      position: fixed; top: 16px; right: 16px;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #fff; border: none; cursor: pointer;
      padding: 10px 22px; border-radius: 10px;
      font-size: 13px; font-weight: 700;
      box-shadow: 0 4px 16px rgba(99,102,241,0.4);
      z-index: 999;
      display: flex; align-items: center; gap: 7px;
      transition: opacity 0.15s;
    }
    .print-btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨&nbsp; Print / Save PDF</button>

  <div class="page">
    <!-- Header -->
    <div class="doc-header">
      <div class="brand">
        <div class="brand-icon">B</div>
        <div>
          <div class="brand-name">Breco</div>
          <div class="brand-sub">Business Records System</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">{{ $title ?? 'Document' }}</div>
        <div class="doc-date">Printed: {{ now()->format('F d, Y  ·  h:i A') }}</div>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      @yield('content')
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      <span>&#9679; Breco Business Records System &mdash; Confidential</span>
      <span>Generated {{ now()->format('M d, Y  H:i:s') }}</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 500));
  </script>
</body>
</html>
