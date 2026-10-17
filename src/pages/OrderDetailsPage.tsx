import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type OrderDetail, type OrderItem } from '../api'
import { formatDetailDate, formatMoney, formatNoteDate, formatPhone } from '../lib/format'
import { Modal } from '../lib/Modal'

type Confirm = 'cancelRemaining' | 'cancelOrder' | null

export function OrderDetailsPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'customer' | 'order'>('order')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  useEffect(() => {
    api.getOrder(orderId).then(setOrder).catch((e) => setError(String(e.message ?? e)))
  }, [orderId])

  async function run(action: () => Promise<OrderDetail>, done?: string) {
    setBusy(true)
    setFlash(null)
    try {
      setOrder(await action())
      if (done) setFlash(done)
    } catch (e) {
      setFlash(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
        <Link to="/">Back to search</Link>
      </div>
    )
  }
  if (!order) return <div className="container py-4 text-muted">Loading order {orderId}…</div>

  const isStorePickup = order.orderType !== 'Roadie'
  const prepaidRefundInStore = order.orderType === 'Easy Order' || order.orderType === 'Raincheck'

  return (
    <div className="container-fluid py-3 order-details">
      <div className="d-flex align-items-center mb-3">
        <h1 className="fw-light me-auto mb-0">Web Order Details</h1>
        <Link to="/" className="btn btn-sm btn-outline-secondary">← Back to results</Link>
      </div>

      <ul className="nav nav-tabs justify-content-center mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'customer' ? 'active' : ''}`} onClick={() => setTab('customer')}>Customer</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'order' ? 'active' : ''}`} onClick={() => setTab('order')}>Order Details</button>
        </li>
      </ul>

      {tab === 'customer' ? (
        <CustomerTab order={order} />
      ) : (
        <>
          <div className="row small mb-3 px-2">
            <div className="col-md-4">
              <Field label="Order ID" value={order.orderId} />
              <Field label="Create Date" value={formatDetailDate(order.createdAt)} />
            </div>
            <div className="col-md-4">
              <Field label="Order Type" value={<span className="order-type">{isStorePickup ? 'STORE PICKUP' : 'ROADIE DELIVERY'}</span>} />
              <Field label="Order Method" value={order.orderMethod} />
            </div>
            <div className="col-md-4">
              <Field label="Order Status" value={order.status} />
              <Field label="Dashboard Type" value={order.orderType} />
            </div>
          </div>

          <div className="d-flex gap-2 border-top border-bottom py-2 mb-3">
            {(order.status === 'OPEN' || order.status === 'PICKING') && (
              <button className="btn btn-sm btn-light border" disabled={busy}
                onClick={() => run(() => api.reprint(order.orderId, 'picklist'), 'Picklist sent to printer.')}>
                Re-Print Picklist
              </button>
            )}
            {(order.status === 'WAITING PICKUP' || order.status === 'CLOSED') && (
              <button className="btn btn-sm btn-light border" disabled={busy}
                onClick={() => run(() => api.reprint(order.orderId, 'confirmation'), 'Confirmation sheets sent to printer.')}>
                Re-Print Confirmation Sheets
              </button>
            )}
            {order.status === 'PICKING' && (
              <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => setConfirm('cancelRemaining')}>Cancel Remaining Items</button>
            )}
            {order.status === 'WAITING PICKUP' && (
              <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => setConfirm('cancelOrder')}>Cancel Entire Order</button>
            )}
            <button className="btn btn-sm btn-success" onClick={() => navigate('/')}>Save &amp; Exit</button>
          </div>

          {flash && <div className="alert alert-info py-2 small">{flash}</div>}

          <div className="section-title">Order Items</div>
          <div className="table-responsive mb-4">
            <table className="table table-sm table-bordered blain-table mb-0">
              <thead>
                <tr>
                  <th>Mfg Part #</th><th>Vendor</th><th>Description</th><th>Blain #</th><th>Status</th>
                  <th>Qty</th><th className="text-end">Price</th><th>Fulfill</th><th>Blain #</th><th>Shipment</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.lineId}>
                    <td>{it.mfgPart}</td>
                    <td>{it.vendor}</td>
                    <td>{it.description}</td>
                    <td>{it.blainNumber}</td>
                    <td className={`item-status-${it.status.replace(/\s/g, '')}`}>{it.status}</td>
                    <td><QtyCell item={it} /></td>
                    <td className="text-end">{formatMoney(it.price)}</td>
                    <td>{it.fulfill}</td>
                    <td>{it.blainNumber}</td>
                    <td>
                      {it.shipment}
                      <br />
                      <button className="btn btn-link btn-sm p-0" disabled={busy}
                        onClick={() => run(() => api.toggleShipment(order.orderId, it.lineId))}>
                        toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row g-4">
            <div className="col-lg-6">
              <form
                className="d-flex gap-2 mb-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (note.trim()) run(() => api.addNote(order.orderId, note)).then(() => setNote(''))
                }}
              >
                <input className="form-control form-control-sm" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="btn btn-sm btn-success text-nowrap" disabled={busy || !note.trim()}>+ Add Note</button>
              </form>
              <div className="section-title">Order Notes</div>
              <table className="table table-sm table-bordered blain-table">
                <thead><tr><th>Note</th><th style={{ width: 130 }}>Date</th></tr></thead>
                <tbody>
                  {order.notes.map((n) => (
                    <tr key={n.id}>
                      <td className={n.system ? '' : 'fw-bold'}>{n.text}</td>
                      <td>{formatNoteDate(n.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="col-lg-6">
              <div className="section-title">Tracking Numbers</div>
              <table className="table table-sm table-bordered blain-table">
                <thead><tr><th>Tracking #</th><th>Blain # / Product Name</th><th>Qty</th><th>Date</th></tr></thead>
                <tbody>
                  {order.tracking.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-3">No data to display</td></tr>
                  ) : order.tracking.map((t) => (
                    <tr key={t.number}>
                      <td><strong>{t.carrier}</strong><br />{t.number}</td>
                      <td>{t.blainNumber}<br />{t.productName}</td>
                      <td>{t.qty}</td>
                      <td>{formatNoteDate(t.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {confirm && (
        <Modal
          title={confirm === 'cancelRemaining' ? 'Cancel Remaining Items' : 'Cancel Entire Order'}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setConfirm(null)}>Back</button>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => run(
                  () => confirm === 'cancelRemaining' ? api.cancelRemainingItems(order.orderId) : api.cancelEntireOrder(order.orderId),
                  confirm === 'cancelRemaining' ? 'Remaining items cancelled.' : 'Order cancelled.',
                )}
              >
                Yes, cancel
              </button>
            </>
          }
        >
          {confirm === 'cancelRemaining' ? (
            <p className="mb-0">Cancel every line on order <strong>{order.orderId}</strong> that hasn't been packed yet?</p>
          ) : (
            <>
              <p>Cancel all of order <strong>{order.orderId}</strong>?</p>
              <p className="mb-0 small text-muted">
                {prepaidRefundInStore
                  ? `${order.orderType} orders must be refunded in store.`
                  : 'A message will be sent to BCC to refund the customer.'}
              </p>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

function QtyCell({ item }: { item: OrderItem }) {
  const second =
    item.status === 'Packed' || item.status === 'Awaiting Pickup' ? `Ready: ${item.qtyReady}`
    : item.status === 'Picked Up' ? `Picked Up: ${item.qtyReady}`
    : null
  return (
    <>
      Total: {item.qtyTotal}
      {second && <><br /><span className="text-primary">{second}</span></>}
    </>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="row mb-1">
      <div className="col-5 fw-bold">{label}:</div>
      <div className="col-7">{value || <span className="text-muted">Not Specified</span>}</div>
    </div>
  )
}

function CustomerTab({ order }: { order: OrderDetail }) {
  const c = order.customer
  return (
    <div className="row small px-2">
      <div className="col-md-4">
        <Field label="First Name" value={c.firstName} />
        <Field label="Company" value={c.company} />
        <Field label="City" value={c.city} />
        <Field label="Daytime Phone" value={formatPhone(c.daytimePhone)} />
      </div>
      <div className="col-md-4">
        <Field label="Last Name" value={c.lastName} />
        <Field label="Address" value={c.address1} />
        <Field label="State" value={c.state} />
        <Field label="Evening Phone" value={c.eveningPhone && formatPhone(c.eveningPhone)} />
      </div>
      <div className="col-md-4">
        <Field label="Email" value={<a href={`mailto:${c.email}`}>{c.email}</a>} />
        <Field label="Address (cont)" value={c.address2} />
        <Field label="ZIP" value={c.zip} />
      </div>
    </div>
  )
}
