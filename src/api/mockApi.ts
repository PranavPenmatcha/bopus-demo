import { ASSOCIATES, seedOrders } from '../mocks/seed'
import type { BopusApi, OrderDetail, OrderSummary, SearchCriteria } from './types'

const CURRENT_USER = 'DEMO USER'
const db = new Map(seedOrders().map((o) => [o.orderId, o]))

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms))
const digits = (s: string) => s.replace(/\D/g, '')

function withDerived(o: OrderDetail): OrderDetail {
  const copy = structuredClone(o)
  copy.daysOld = Math.max(0, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 86_400_000))
  copy.itemCount = o.items.length
  copy.locations = [...new Set(o.items.map((i) => i.location).filter((l): l is string => !!l))]
  return copy
}

function toSummary(o: OrderDetail): OrderSummary {
  const { orderMethod: _m, customer: _c, items: _i, notes: _n, tracking: _t, ...summary } = withDerived(o)
  return summary
}

function get(orderId: string): OrderDetail {
  const o = db.get(orderId)
  if (!o) throw new Error(`Order ${orderId} not found`)
  return o
}

function addNote(o: OrderDetail, text: string, system = true) {
  o.notes.push({ id: String(o.notes.length + 1), text, createdAt: new Date().toISOString(), system })
}

function matches(c: SearchCriteria, o: OrderDetail): boolean {
  const has = (field: string | null, q: string) => !q.trim() || (field ?? '').toLowerCase().includes(q.trim().toLowerCase())
  if (c.statuses.length && !c.statuses.includes(o.status)) return false
  if (c.types.length && !c.types.includes(o.orderType)) return false
  const created = new Date(o.createdAt).getTime()
  if (c.dateFrom && created < new Date(`${c.dateFrom}T00:00:00`).getTime()) return false
  if (c.dateTo && created > new Date(`${c.dateTo}T23:59:59.999`).getTime()) return false
  if (c.phone && !o.phone.includes(digits(c.phone))) return false
  return (
    has(o.orderId, c.webOrder) &&
    has(o.firstName, c.firstName) &&
    has(o.lastName, c.lastName) &&
    has(o.purchaseOrder, c.purchaseOrder) &&
    has(o.invoiceNumber, c.invoiceNumber)
  )
}

export const mockApi: BopusApi = {
  async searchOrders(criteria) {
    await delay()
    return [...db.values()].filter((o) => matches(criteria, o)).map(toSummary)
  },

  async getOrder(orderId) {
    await delay()
    return withDerived(get(orderId))
  },

  async listAssociates() {
    await delay(50)
    return [...ASSOCIATES].sort()
  },

  async assignOrders(orderIds, associate) {
    await delay()
    for (const id of orderIds) {
      const o = get(id)
      o.assignedTo = associate
      addNote(o, `ORDER ASSIGNED TO ${associate} BY USER ${CURRENT_USER}`)
    }
  },

  async unassignOrders(orderIds) {
    await delay()
    const result = { unassigned: [] as string[], skipped: [] as { orderId: string; reason: string }[] }
    for (const id of orderIds) {
      const o = get(id)
      if (!o.assignedTo) result.skipped.push({ orderId: id, reason: 'not assigned' })
      // Unassign only works before picking starts (requirements row 29).
      else if (o.items.some((i) => i.status !== 'Incomplete')) result.skipped.push({ orderId: id, reason: 'picking already started' })
      else {
        addNote(o, `ORDER UNASSIGNED FROM ${o.assignedTo} BY USER ${CURRENT_USER}`)
        o.assignedTo = null
        result.unassigned.push(id)
      }
    }
    return result
  },

  async addNote(orderId, text) {
    await delay()
    const o = get(orderId)
    addNote(o, text.trim(), false)
    return withDerived(o)
  },

  async cancelRemainingItems(orderId) {
    await delay()
    const o = get(orderId)
    if (o.status !== 'PICKING') throw new Error('Cancel Remaining Items is only allowed in PICKING status')
    let cancelled = 0
    for (const it of o.items) {
      if (it.status === 'Incomplete') {
        it.status = 'Cancelled'
        cancelled++
      } else if (it.status === 'Packed') {
        it.status = 'Awaiting Pickup'
      }
    }
    o.status = o.items.some((i) => i.status === 'Awaiting Pickup') ? 'WAITING PICKUP' : 'CANCELLED'
    addNote(o, `${cancelled} REMAINING ITEM(S) CANCELLED BY USER ${CURRENT_USER}. ORDER UPDATED TO ${o.status}.`)
    return withDerived(o)
  },

  async cancelEntireOrder(orderId) {
    await delay()
    const o = get(orderId)
    if (o.status !== 'WAITING PICKUP') throw new Error('Cancel Entire Order is only allowed in WAITING PICKUP status')
    for (const it of o.items) it.status = 'Cancelled'
    o.status = 'CANCELLED'
    const refund =
      o.orderType === 'Easy Order' || o.orderType === 'Raincheck'
        ? 'MUST BE REFUNDED IN STORE.'
        : 'REFUND MESSAGE SENT TO BCC.'
    addNote(o, `ORDER CANCELLED BY USER ${CURRENT_USER}. ${refund}`)
    return withDerived(o)
  },

  async toggleShipment(orderId, lineId) {
    await delay(100)
    const o = get(orderId)
    const it = o.items.find((i) => i.lineId === lineId)
    if (it) it.shipment = it.shipment === 'Parcel' ? 'LTL' : 'Parcel'
    return withDerived(o)
  },

  async reprint(orderId, doc) {
    await delay()
    const o = get(orderId)
    addNote(o, doc === 'picklist'
      ? `PICKING LIST HAS BEEN RE-PRINTED BY USER ${CURRENT_USER}`
      : `CONFIRMATION SHEETS HAVE BEEN RE-PRINTED BY USER ${CURRENT_USER}`)
    return withDerived(o)
  },
}
