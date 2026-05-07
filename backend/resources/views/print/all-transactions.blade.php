@extends('print.layout')
@php
  $title = 'All Transactions Report';

  $billTotal   = $bills->sum('total_amount');
  $billPaid    = $bills->sum('amount_paid');
  $billBalance = $billTotal - $billPaid;

  $cashInAmt  = $cashTransactions->where('type', 'cash_in')->sum('amount');
  $cashOutAmt = $cashTransactions->where('type', 'cash_out')->sum('amount');
  $totalTubo  = $cashTransactions->sum('tubo');
@endphp

@section('content')

  {{-- ── Overall Summary ── --}}
  <div class="section-title">Summary</div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="sc-label">Total Bills</div>
      <div class="sc-value blue">{{ $bills->count() }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Billed</div>
      <div class="sc-value">₱{{ number_format($billTotal, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Bills Balance</div>
      <div class="sc-value red">₱{{ number_format($billBalance, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Cash In Total</div>
      <div class="sc-value green">₱{{ number_format($cashInAmt, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Cash Out Total</div>
      <div class="sc-value red">₱{{ number_format($cashOutAmt, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Net Tubo (Cash)</div>
      <div class="sc-value {{ $totalTubo >= 0 ? 'green' : 'red' }}">₱{{ number_format($totalTubo, 2) }}</div>
    </div>
  </div>

  {{-- ── Bills ── --}}
  <div class="section-title">Bills ({{ $bills->count() }})</div>

  @if($bills->isEmpty())
    <p style="color:#94a3b8; font-size:11px; padding: 6px 0 16px;">No bills found.</p>
  @else
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Transaction ID</th>
          <th>Category</th>
          <th>Biller</th>
          <th class="right">Total</th>
          <th class="right">Paid</th>
          <th class="right">Balance</th>
          <th>Due Date</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>
        @foreach($bills as $i => $bill)
        @php
          $bal = $bill->total_amount - $bill->amount_paid;
          $sc  = match($bill->status) { 'paid' => 'badge-paid', 'partial' => 'badge-partial', default => 'badge-unpaid' };
        @endphp
        <tr>
          <td style="color:#94a3b8;font-size:10px;">{{ $i + 1 }}</td>
          <td><span class="txn-id">{{ $bill->transaction_id }}</span></td>
          <td>{{ $bill->category->name ?? '—' }}</td>
          <td>{{ $bill->biller_name ?: '—' }}</td>
          <td class="right amount-total">₱{{ number_format($bill->total_amount, 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($bill->amount_paid, 2) }}</td>
          <td class="right amount-balance">₱{{ number_format($bal, 2) }}</td>
          <td>{{ $bill->due_date ? \Carbon\Carbon::parse($bill->due_date)->format('M d, Y') : '—' }}</td>
          <td class="center"><span class="badge {{ $sc }}">{{ ucfirst($bill->status) }}</span></td>
        </tr>
        @endforeach
        <tr class="totals-row">
          <td colspan="4" style="text-align:right;">Totals</td>
          <td class="right amount-total">₱{{ number_format($billTotal, 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($billPaid, 2) }}</td>
          <td class="right amount-balance">₱{{ number_format($billBalance, 2) }}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>
  @endif

  <div class="section-divider"></div>

  {{-- ── Cash Transactions ── --}}
  <div class="section-title">Cash Transactions ({{ $cashTransactions->count() }})</div>

  @if($cashTransactions->isEmpty())
    <p style="color:#94a3b8; font-size:11px; padding: 6px 0 16px;">No cash transactions found.</p>
  @else
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Code</th>
          <th>Type</th>
          <th>Person</th>
          <th class="right">Amount</th>
          <th class="right">Fee</th>
          <th class="right">Tubo</th>
          <th>Date</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>
        @foreach($cashTransactions as $i => $txn)
        @php
          $sc = match($txn->status) { 'settled' => 'badge-settled', 'paid' => 'badge-partial', default => 'badge-pending' };
          $tuboColor = $txn->tubo >= 0 ? '#059669' : '#dc2626';
        @endphp
        <tr>
          <td style="color:#94a3b8;font-size:10px;">{{ $i + 1 }}</td>
          <td><span class="txn-id">{{ $txn->transaction_code }}</span></td>
          <td>
            <span class="badge" style="background:{{ $txn->type === 'cash_in' ? '#d1fae5' : '#fee2e2' }};color:{{ $txn->type === 'cash_in' ? '#065f46' : '#991b1b' }};">
              {{ $txn->type === 'cash_in' ? '↓ Cash In' : '↑ Cash Out' }}
            </span>
          </td>
          <td style="font-weight:600;">{{ $txn->person_name }}</td>
          <td class="right amount-total">₱{{ number_format($txn->amount, 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($txn->fee_amount, 2) }}</td>
          <td class="right" style="font-weight:700;color:{{ $tuboColor }};">₱{{ number_format($txn->tubo, 2) }}</td>
          <td>{{ \Carbon\Carbon::parse($txn->transaction_date)->format('M d, Y') }}</td>
          <td class="center"><span class="badge {{ $sc }}">{{ ucfirst($txn->status) }}</span></td>
        </tr>
        @endforeach
        <tr class="totals-row">
          <td colspan="4" style="text-align:right;">Totals</td>
          <td class="right amount-total">₱{{ number_format($cashTransactions->sum('amount'), 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($cashTransactions->sum('fee_amount'), 2) }}</td>
          <td class="right" style="font-weight:700;color:{{ $totalTubo >= 0 ? '#059669' : '#dc2626' }};">₱{{ number_format($totalTubo, 2) }}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>
  @endif

@endsection
