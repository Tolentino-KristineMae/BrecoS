@extends('print.layout')
@php
  $title = 'Bills Report';

  $totalBilled  = $bills->sum('total_amount');
  $totalPaid    = $bills->sum('amount_paid');
  $totalBalance = $totalBilled - $totalPaid;

  $countPaid    = $bills->where('status', 'paid')->count();
  $countPartial = $bills->where('status', 'partial')->count();
  $countUnpaid  = $bills->where('status', 'unpaid')->count();
@endphp

@section('content')

  {{-- ── Summary cards ── --}}
  <div class="section-title">Summary</div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="sc-label">Total Records</div>
      <div class="sc-value blue">{{ $bills->count() }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Billed</div>
      <div class="sc-value">₱{{ number_format($totalBilled, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Paid</div>
      <div class="sc-value green">₱{{ number_format($totalPaid, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Outstanding Balance</div>
      <div class="sc-value red">₱{{ number_format($totalBalance, 2) }}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Paid / Partial / Unpaid</div>
      <div class="sc-value" style="font-size:13px;">
        <span style="color:#059669;">{{ $countPaid }}</span>
        <span style="color:#94a3b8;font-weight:400;"> / </span>
        <span style="color:#d97706;">{{ $countPartial }}</span>
        <span style="color:#94a3b8;font-weight:400;"> / </span>
        <span style="color:#dc2626;">{{ $countUnpaid }}</span>
      </div>
    </div>
  </div>

  {{-- ── Bills Table ── --}}
  <div class="section-title">Bills Records</div>

  @if($bills->isEmpty())
    <p style="color:#94a3b8;font-size:11px;padding:10px 0;">No bills found.</p>
  @else
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:28px;">#</th>
          <th>Transaction ID</th>
          <th>Category</th>
          <th>Biller</th>
          <th>Account No.</th>
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
          $balance     = $bill->total_amount - $bill->amount_paid;
          $statusClass = match($bill->status) {
            'paid'    => 'badge-paid',
            'partial' => 'badge-partial',
            default   => 'badge-unpaid',
          };
        @endphp
        <tr>
          <td style="color:#94a3b8;font-size:10px;">{{ $i + 1 }}</td>
          <td><span class="txn-id">{{ $bill->transaction_id }}</span></td>
          <td>{{ $bill->category->name ?? '—' }}</td>
          <td>{{ $bill->biller_name ?: '—' }}</td>
          <td class="mono">{{ $bill->account_number ?: '—' }}</td>
          <td class="right amount-total">₱{{ number_format($bill->total_amount, 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($bill->amount_paid, 2) }}</td>
          <td class="right amount-balance">₱{{ number_format($balance, 2) }}</td>
          <td>{{ $bill->due_date ? \Carbon\Carbon::parse($bill->due_date)->format('M d, Y') : '—' }}</td>
          <td class="center"><span class="badge {{ $statusClass }}">{{ ucfirst($bill->status) }}</span></td>
        </tr>
        @endforeach
        <tr class="totals-row">
          <td colspan="5" style="text-align:right;">Totals</td>
          <td class="right amount-total">₱{{ number_format($totalBilled, 2) }}</td>
          <td class="right amount-paid">₱{{ number_format($totalPaid, 2) }}</td>
          <td class="right amount-balance">₱{{ number_format($totalBalance, 2) }}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>
  @endif

@endsection
