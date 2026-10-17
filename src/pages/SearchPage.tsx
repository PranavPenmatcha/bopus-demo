import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ORDER_STATUSES, ORDER_TYPES, type OrderSummary, type SearchCriteria } from '../api'
import { downloadResultsCsv } from '../lib/csv'
import { formatListDate, formatPhone, maskPhoneInput } from '../lib/format'
import { Modal } from '../lib/Modal'

const DEFAULT_CRITERIA: SearchCriteria = {
  statuses: ['OPEN', 'PICKING'],
  types: [...ORDER_TYPES],
  dateFrom: '',
  dateTo: '',
  webOrder: '',
  firstName: '',
  lastName: '',
  phone: '',
  purchaseOrder: '',
  invoiceNumber: '',
}

// Survives navigating to an order and back, so the results are still there.
const cache: { criteria: SearchCriteria; hasSearched: boolean; filtersOpen: boolean } = {
  criteria: DEFAULT_CRITERIA,
  hasSearched: false,
  filtersOpen: true,
}

type SortKey = 'orderId' | 'orderType' | 'createdAt' | 'customer' | 'phone' | 'status' | 'branch' | 'daysOld' | 'assignedTo'
const COLUMNS: [SortKey, string][] = [
  ['orderId', 'Order Number'], ['orderType', 'Order Type'], ['createdAt', 'Create Date'],
  ['customer', 'Customer'], ['phone', 'Phone Number'], ['status', 'Status'], ['branch', 'Branch'],
  ['daysOld', 'Days Old'], ['assignedTo', 'Assigned To'],
]
const sortValue = (o: OrderSummary, k: SortKey): string | number =>
  k === 'customer' ? `${o.lastName}, ${o.firstName}` : k === 'daysOld' ? o.daysOld : (o[k] ?? '')

const PAGE_SIZES = [25, 50, 100, 500]

export function SearchPage() {
  const navigate = useNavigate()
  const [criteria, setCriteria] = useState(cache.criteria)
  const [filtersOpen, setFiltersOpen] = useState(cache.filtersOpen)
  const [results, setResults] = useState<OrderSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'warning' | 'danger' } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'createdAt', dir: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(500)
  const [modal, setModal] = useState<'assign' | 'unassign' | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [scrollToken, setScrollToken] = useState(0)

  // After a Search click, bring the results (rendered below the filters) into view.
  useEffect(() => {
    const el = resultsRef.current
    if (scrollToken && el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 8, behavior: 'instant' })
  }, [scrollToken])

  async function runSearch(c: SearchCriteria, resetPage = true) {
    cache.criteria = c
    cache.hasSearched = true
    setLoading(true)
    try {
      const rows = await api.searchOrders(c)
      setResults(rows)
      setSelected((prev) => new Set([...prev].filter((id) => rows.some((r) => r.orderId === id))))
      if (resetPage) setPage(1)
    } catch (e) {
      setMessage({ text: String(e), kind: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  // Coming back from an order: re-run the last search so changes show up.
  useEffect(() => {
    if (cache.hasSearched) runSearch(cache.criteria, false)
  }, [])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    runSearch(criteria).then(() => setScrollToken((n) => n + 1))
  }

  const sorted = useMemo(() => {
    if (!results) return []
    return [...results].sort((a, b) => {
      const x = sortValue(a, sort.key), y = sortValue(b, sort.key)
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [results, sort])
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.orderId))

  const set = <K extends keyof SearchCriteria>(k: K, v: SearchCriteria[K]) => setCriteria((c) => ({ ...c, [k]: v }))
  const toggleSelected = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  function openModal(kind: 'assign' | 'unassign') {
    if (selected.size === 0) setMessage({ text: 'Select one or more orders first.', kind: 'warning' })
    else setModal(kind)
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center mb-3 gap-2">
        <h2 className="me-auto mb-0">Search Bopus Orders</h2>
        <button className="btn btn-danger opacity-75" onClick={() => openModal('unassign')}>Unassign</button>
        <button className="btn btn-success opacity-75" onClick={() => openModal('assign')}>Assign</button>
        <button
          className="btn btn-outline-primary"
          onClick={() => results?.length ? downloadResultsCsv(sorted) : setMessage({ text: 'Run a search first.', kind: 'warning' })}
        >
          Download all results
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.kind} alert-dismissible py-2`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      <div className="card mb-3">
        <button
          type="button"
          className="card-header d-flex justify-content-between bg-light border-0 text-start"
          onClick={() => setFiltersOpen((cache.filtersOpen = !filtersOpen))}
        >
          <span>Filters</span>
          <span>{filtersOpen ? '▴' : '▾'}</span>
        </button>
        {filtersOpen && (
          <form className="card-body" onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <MultiSelect label="Order Status" options={ORDER_STATUSES} value={criteria.statuses} onChange={(v) => set('statuses', v)} />
              </div>
              <div className="col-md-3">
                <MultiSelect label="Order Types" options={ORDER_TYPES} value={criteria.types} onChange={(v) => set('types', v)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Create Date Range</label>
                <div className="input-group">
                  <input type="date" className="form-control" value={criteria.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
                  <span className="input-group-text">to</span>
                  <input type="date" className="form-control" value={criteria.dateTo} onChange={(e) => set('dateTo', e.target.value)} />
                </div>
              </div>
              <div className="col-md-3">
                <TextField label="Web Order" value={criteria.webOrder} onChange={(v) => set('webOrder', v)} />
              </div>
              <div className="col-md-3"><TextField label="First Name" value={criteria.firstName} onChange={(v) => set('firstName', v)} /></div>
              <div className="col-md-3"><TextField label="Last Name" value={criteria.lastName} onChange={(v) => set('lastName', v)} /></div>
              <div className="col-md-3">
                <TextField label="Phone Number" placeholder="xxx xxx-xxxx" value={criteria.phone} onChange={(v) => set('phone', maskPhoneInput(v))} />
              </div>
              <div className="col-md-3"><TextField label="Purchase Order" value={criteria.purchaseOrder} onChange={(v) => set('purchaseOrder', v)} /></div>
              <div className="col-md-3"><TextField label="Invoice Number" value={criteria.invoiceNumber} onChange={(v) => set('invoiceNumber', v)} /></div>
            </div>
            <div className="text-center mt-3 d-flex gap-2 justify-content-center">
              <button type="button" className="btn btn-link" onClick={() => setCriteria(DEFAULT_CRITERIA)}>Reset</button>
              <button type="submit" className="btn btn-outline-primary px-4" disabled={loading}>
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>
        )}
      </div>

      {results && (
        <div ref={resultsRef}>
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle results-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={allOnPageSelected}
                      onChange={() => setSelected((s) => {
                        const n = new Set(s)
                        pageRows.forEach((r) => (allOnPageSelected ? n.delete(r.orderId) : n.add(r.orderId)))
                        return n
                      })}
                    />
                  </th>
                  {COLUMNS.map(([key, label]) => (
                    <th
                      key={key}
                      className={`sortable ${key === 'orderId' ? 'text-end' : ''}`}
                      onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}
                    >
                      {label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={COLUMNS.length + 2} className="text-center text-muted py-4">No orders match these filters.</td></tr>
                )}
                {pageRows.map((o) => (
                  <tr key={o.orderId} onClick={() => navigate(`/orders/${o.orderId}`)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="form-check-input" checked={selected.has(o.orderId)} onChange={() => toggleSelected(o.orderId)} />
                    </td>
                    <td className="text-end">{o.orderId}</td>
                    <td>{o.orderType}</td>
                    <td>{formatListDate(o.createdAt)}</td>
                    <td>{o.lastName}, {o.firstName}</td>
                    <td>{formatPhone(o.phone)}</td>
                    <td>{o.status}</td>
                    <td>{o.branch}</td>
                    <td>{o.daysOld}</td>
                    <td>{o.assignedTo}</td>
                    <td><button className="btn btn-sm btn-outline-primary">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="input-group" style={{ maxWidth: 220 }}>
              <span className="input-group-text">Page Size</span>
              <select className="form-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                {PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="btn-group">
              <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              <span className="btn btn-outline-secondary disabled">{page} of {pageCount}</span>
              <button className="btn btn-outline-secondary" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>›</button>
            </div>
            <span className="text-muted">{sorted.length} orders · {selected.size} selected</span>
          </div>
        </div>
      )}

      {modal === 'assign' && (
        <AssignModal
          orderIds={[...selected]}
          onClose={() => setModal(null)}
          onDone={async (associate) => {
            setModal(null)
            setMessage({ text: `Assigned ${selected.size} order(s) to ${associate}.`, kind: 'success' })
            setSelected(new Set())
            await runSearch(cache.criteria, false)
          }}
        />
      )}
      {modal === 'unassign' && (
        <Modal
          title="Unassign Orders"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn btn-outline-danger"
                onClick={async () => {
                  const r = await api.unassignOrders([...selected])
                  setModal(null)
                  const skipped = r.skipped.map((s) => `${s.orderId} (${s.reason})`).join(', ')
                  setMessage({
                    text: `Unassigned ${r.unassigned.length} order(s).${skipped ? ` Skipped: ${skipped}.` : ''}`,
                    kind: r.skipped.length ? 'warning' : 'success',
                  })
                  setSelected(new Set())
                  await runSearch(cache.criteria, false)
                }}
              >
                Confirm
              </button>
            </>
          }
        >
          <OrderBadges ids={[...selected]} />
          <p className="mb-0 mt-3 small text-muted">Orders can only be unassigned before picking has started.</p>
        </Modal>
      )}
    </div>
  )
}

function AssignModal({ orderIds, onClose, onDone }: { orderIds: string[]; onClose: () => void; onDone: (associate: string) => void }) {
  const [associates, setAssociates] = useState<string[]>([])
  const [associate, setAssociate] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { api.listAssociates().then(setAssociates) }, [])

  return (
    <Modal
      title="Assign Associate"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-outline-success"
            disabled={!associate || saving}
            onClick={async () => {
              setSaving(true)
              await api.assignOrders(orderIds, associate)
              onDone(associate)
            }}
          >
            Confirm
          </button>
        </>
      }
    >
      <OrderBadges ids={orderIds} />
      <label className="form-label mt-3">Pick an Associate to Assign</label>
      <select className="form-select" value={associate} onChange={(e) => setAssociate(e.target.value)}>
        <option value="">Select…</option>
        {associates.map((a) => <option key={a}>{a}</option>)}
      </select>
    </Modal>
  )
}

function OrderBadges({ ids }: { ids: string[] }) {
  return (
    <div className="d-flex align-items-center flex-wrap gap-2">
      <strong className="fs-5">Web Orders:</strong>
      {ids.map((id) => <span key={id} className="badge text-bg-warning fs-6">{id}</span>)}
    </div>
  )
}

function MultiSelect<T extends string>({ label, options, value, onChange }: {
  label: string
  options: readonly T[]
  value: T[]
  onChange: (v: T[]) => void
}) {
  const all = value.length === options.length
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span>{label}</span>
        <input
          type="checkbox"
          className="form-check-input m-0"
          title="Select all"
          checked={all}
          onChange={() => onChange(all ? [] : [...options])}
        />
      </div>
      <div className="listbox">
        {options.map((o) => (
          <div
            key={o}
            className={`listbox-option ${value.includes(o) ? 'selected' : ''}`}
            onClick={() => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o])}
          >
            {o}
          </div>
        ))}
      </div>
    </>
  )
}

function TextField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <>
      <label className="form-label">{label}</label>
      <input className="form-control" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </>
  )
}
