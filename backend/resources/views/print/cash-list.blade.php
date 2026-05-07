@extends('print.layout')
@php
  $typeLabel = match($filters['type'] ?? 'all') {
    'cash_in'  => 'Cash In',
    'cash_out' => 'Cash Out',
    default    => 'Cash Transactions',
  };
  $title = $typeLabel . ' Report';

  $totalAmount = $transactions->sum('amount');
  $totalTubo   = $transactions->sum('tubo');
  $totalFee    = $transactions->sum('fee_amount');
  $totalDed    = $transactions->sum('deduction_amount');

  $countPending = $transactions->where('status', 'pending')->count();
  $countPaid    = $transactions->where('status', 'paid')->count();
  $countSettled = $transactions->where('status', 'settled')->count();
@endphp

@section('content')

  {{-- ── Summary ── --}}
  <div class="section-title">Summary</div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="sc-label">Total Records</div>
      <div class="sc-value blue">{{ $transactions->count() }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Amount</div>
      <div class="sc-value">₱{{ number_format($totalAmount, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Net Tubo</div>
      <div class="sc-value {{ $totalTubo >= 0 ? 'green' : 'red' }}">₱{{ number_format($totalTubo, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Fee</div>
      <div class="sc-value green">₱{{ number_format($totalFee, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Deduction</div>
      <div class="sc-value red">₱{{ number_format($totalDed, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Pending / Paid / Settled</div>
      <div class="sc-value" style="font-size:13px;">
        <span style="color:#d97706;">{{ $countPending }}</span>
        <span style="color:#94a3b8;font-weight:400;"> / </span>
        <span style="color:#2563eb;">{{ $countPaid }}</span>
        <span style="color:#94a3b8;font-weight:400;"> / </span>
        <span style="color:#059669;">{{ $countSettled }}</span>
      </div>
    </div>
  </div>

  {{-- ── Table ── --}}
  <div class="section-title">{{ $typeLabel }}</div>

  @if($transactions->isEmpty())
    <p style="color:#94a3b8; font-size:11px; padding: 10px 0;">No transactions found.</p>
  @else
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Code</th>
          @if(($filters['type'] ?? 'all') === 'all')
          <th>Type</th>
          @endif
          <th>Person</th>
          <th class="right">Amount</th>
          <th class="right">Fee</th>
          <th class="right">Deduction</th>
          <th class="right">Tubo</th>
          <th>Date</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>
        @foreach($transactions as $i => $txn)
        @php
          $statusClass = match($txn->status) {
            'settled' => 'badge-settled',
            'paid'    => 'badge-partial',
            default   => 'badge-pending',
          };
          $tuboColor = $txn->tubo >= 0 ? '#059669' : '#dc2626';
        @endphp
        <tr>
          <td style="color:#94a3b8;font-size:10px;">{{ $i + 1 }}</td>
          <td><span class="txn-id">{{ $txn->transaction_code }}</span></td>
          @if(($filters['type'] ?? 'all') === 'all')
          <td>
            <span class="badge" style="background:{{ $txn->type === 'cash_in' ? '#d1fae5' : '#fee2e2' }};color:{{ $txn->type === 'cash_in' ? '#065f46' : '#991b1b' }};">
              {{ $txn->type === 'cash_in' ? '↓ Cash In' : '↑ Cash Out' }}
            </span>
          </td>
          @endif
          <td style="font-weight:600;">{{ $txn->person_name }}</td>
          <td class="right amount-total">₱{{ number_format($txn->amount, 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($txn->fee_amount, 2) }}</td>
          <td class="right amount-balance">₱{{ number_format($txn->deduction_amount, 2) }}</td>
          <td class="right" style="font-weight:700;color:{{ $tuboColor }};">₱{{ number_format($txn->tubo, 2) }}</td>
          <td>{{ \Carbon\Carbon::parse($txn->transaction_date)->format('M d, Y') }}</td>
          <td class="center"><span class="badge {{ $statusClass }}">{{ ucfirst($txn->status) }}</span></td>
        </tr>
        @endforeach
        <tr class="totals-row">
          <td colspan="{{ ($filters['type'] ?? 'all') === 'all' ? 4 : 3 }}" style="text-align:right;">Totals</td>
          <td class="right amount-total">₱{{ number_format($totalAmount, 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($totalFee, 2) }}</td>
          <td class="right amount-balance">₱{{ number_format($totalDed, 2) }}</td>
          <td class="right" style="font-weight:700;color:{{ $totalTubo >= 0 ? '#059669' : '#dc2626' }};">₱{{ number_format($totalTubo, 2) }}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>
  @endif

@endsection
