import type { OrderSummary } from '../api/types'

const HEADERS = ['OrderId', 'Order Type', 'CreatedOn', 'Customer', 'Phone Number', 'Status', 'Branch', 'Days Old', 'Assignee', 'Number of Items', 'Location']

const cell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Same columns as the "Download Results" sheet; opens in Excel. */
export function downloadResultsCsv(rows: OrderSummary[]) {
  const lines = [HEADERS, ...rows.map((r) => [
    r.orderId, r.orderType, r.createdAt, `${r.lastName}, ${r.firstName}`, r.phone, r.status,
    r.branch, r.daysOld, r.assignedTo ?? '', r.itemCount, r.locations.join(', '),
  ])].map((row) => row.map(cell).join(','))
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bopus-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
