@extends('print.layout')
@php
  $title = 'Bill Receipt — ' . $bill->transaction_id;

  $balance  = $bill->total_amount - $bill->amount_paid;
  $pct      = $bill->total_amount > 0
              ? min(100, ($bill->amount_paid / $bill->total_amount) * 100)
              : 0;

  // Due date status
  $dueStatus = null;
  if ($bill->due_date) {
    $due   = \Carbon\Carbon::parse($bill->due_date)->startOfDay();
    $today = \Carbon\Carbon::today();

    if ($bill->status === 'paid' && $bill->payments->count()) {
      $lastPaid = $bill->payments->sortByDesc('date_paid')->first();
      $paidOn   = \Carbon\Carbon::parse($lastPaid->date_paid)->startOfDay();
      $diff     = $due->diffInDays($paidOn, false); // negative = paid before due
      if ($diff > 0) {
        $dueStatus = ['class' => 'late',   'text' => "Paid {$diff} day(s) after due date"];
      } elseif ($diff === 0) {
        $dueStatus = ['class' => 'ontime', 'text' => 'Paid on the due date'];
      } else {
        $days = abs($diff);
        $dueStatus = ['class' => 'early',  'text' => "Paid {$days} day(s) before due date"];
      }
    } else {
      $diff = $today->diffInDays($due, false);
      if ($diff > 0) {
        $dueStatus = ['class' => 'pending', 'text' => "Due in {$diff} day(s)"];
      } elseif ($diff === 0) {
        $dueStatus = ['class' => 'today',   'text' => 'Due today!'];
      } else {
        $days = abs($diff);
        $dueStatus = ['class' => 'overdue', 'text' => "Overdue by {$days} day(s)"];
      }
    }
  }

  $statusClass = match($bill->status) {
    'paid'    => 'badge-paid',
    'partial' => 'badge-partial',
    default   => 'badge-unpaid',
  };
  $statusLabel = ucfirst($bill->status);
@endphp

@section('content')

  {{-- ── Amount Hero ── --}}
  <div class="amount-hero">
    <div>
      <div class="amt-label">Total Amount</div>
      <div class="amt-value">₱{{ number_format($bill->total_amount, 2) }}</div>
    </div>
    <div>
      <div class="amt-label">Amount Paid</div>
      <div class="amt-value green">₱{{ number_format($bill->amount_paid, 2) }}</div>
    </div>
    <div>
      <div class="amt-label">Balance</div>
      <div class="amt-value red">₱{{ number_format($balance, 2) }}</div>
    </div>
  </div>

  {{-- ── Progress ── --}}
  <div class="progress-wrap">
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: {{ $pct }}%"></div>
    </div>
    <div class="progress-label">{{ number_format($pct, 1) }}% paid</div>
  </div>

  {{-- ── Bill Info ── --}}
  <div class="section-title">Bill Information</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Transaction ID</span>
      <span class="info-value mono">{{ $bill->transaction_id }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Status</span>
      <span class="info-value"><span class="badge {{ $statusClass }}">{{ $statusLabel }}</span></span>
    </div>
    <div class="info-row">
      <span class="info-label">Category</span>
      <span class="info-value">{{ $bill->category->name ?? '—' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Due Date</span>
      <span class="info-value">{{ $bill->due_date ? \Carbon\Carbon::parse($bill->due_date)->format('M d, Y') : '—' }}</span>
    </div>
    @if($bill->biller_name)
    <div class="info-row">
      <span class="info-label">Biller Name</span>
      <span class="info-value">{{ $bill->biller_name }}</span>
    </div>
    @endif
    @if($bill->account_number)
    <div class="info-row">
      <span class="info-label">Account Number</span>
      <span class="info-value mono">{{ $bill->account_number }}</span>
    </div>
    @endif
    <div class="info-row">
      <span class="info-label">Date Created</span>
      <span class="info-value">{{ $bill->created_at->format('M d, Y') }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">No. of Payments</span>
      <span class="info-value">{{ $bill->payments->count() }}</span>
    </div>
  </div>

  {{-- ── Due Date Status ── --}}
  @if($dueStatus)
  <div class="due-status {{ $dueStatus['class'] }}">
    &#9679; {{ $dueStatus['text'] }}
  </div>
  @endif

  {{-- ── Notes ── --}}
  @if($bill->notes)
  <div class="notes-box">
    <strong>Notes</strong>
    {{ $bill->notes }}
  </div>
  @endif

  {{-- ── Payment History ── --}}
  <div class="section-title">Payment History</div>

  @if($bill->payments->isEmpty())
    <p style="color:#94a3b8; font-size:11px; padding: 10px 0;">No payments recorded yet.</p>
  @else
    <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="center">#</th>
          <th>Date Paid</th>
          <th>Payment Channel</th>
          <th class="right">Amount</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        @foreach($bill->payments as $i => $payment)
        <tr>
          <td class="center"><span class="pay-num">{{ $i + 1 }}</span></td>
          <td>{{ \Carbon\Carbon::parse($payment->date_paid)->format('M d, Y') }}</td>
          <td>{{ $payment->paymentChannel->name ?? '—' }}</td>
          <td class="right amount-paid">₱{{ number_format($payment->amount, 2) }}</td>
          <td style="color:#64748b;">{{ $payment->remarks ?: '—' }}</td>
        </tr>
        @endforeach
        <tr class="totals-row">
          <td colspan="3" style="text-align:right;">Total Paid</td>
          <td class="right amount-paid">₱{{ number_format($bill->amount_paid, 2) }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    </div>
  @endif

@endsection
