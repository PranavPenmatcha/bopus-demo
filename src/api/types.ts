export const ORDER_STATUSES = [
  'OPEN',
  'PICKING',
  'WAITING PICKUP',
  'CANCELLED',
  'CLOSED',
  'INVOICED',
  'PENDING',
  'ON ORDER',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_TYPES = [
  'BOPUS',
  'Easy Order',
  'Live Animal - Easy Order',
  'Live Animal - Web',
  'Raincheck',
  'Roadie',
  'Special Order',
] as const
export type OrderType = (typeof ORDER_TYPES)[number]

export type ItemStatus = 'Incomplete' | 'Packed' | 'Awaiting Pickup' | 'Picked Up' | 'Cancelled'
export type ShipmentType = 'Parcel' | 'LTL'

export interface Customer {
  firstName: string
  lastName: string
  company: string
  email: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  daytimePhone: string
  eveningPhone: string
}

export interface OrderItem {
  lineId: string
  mfgPart: string
  vendor: string
  description: string
  blainNumber: string
  status: ItemStatus
  qtyTotal: number
  qtyReady: number
  price: number
  fulfill: string
  shipment: ShipmentType
  location: string | null
}

export interface OrderNote {
  id: string
  text: string
  createdAt: string
  system: boolean
}

export interface TrackingNumber {
  carrier: string
  number: string
  blainNumber: string
  productName: string
  qty: number
  date: string
}

/** One row in the search results. */
export interface OrderSummary {
  orderId: string
  orderType: OrderType
  createdAt: string
  firstName: string
  lastName: string
  phone: string
  status: OrderStatus
  branch: string
  daysOld: number
  assignedTo: string | null
  itemCount: number
  locations: string[]
  purchaseOrder: string | null
  invoiceNumber: string | null
}

export interface OrderDetail extends OrderSummary {
  orderMethod: string
  customer: Customer
  items: OrderItem[]
  notes: OrderNote[]
  tracking: TrackingNumber[]
}

export interface SearchCriteria {
  statuses: OrderStatus[]
  types: OrderType[]
  dateFrom: string
  dateTo: string
  webOrder: string
  firstName: string
  lastName: string
  phone: string
  purchaseOrder: string
  invoiceNumber: string
}

export interface UnassignResult {
  unassigned: string[]
  skipped: { orderId: string; reason: string }[]
}

export type ReprintDoc = 'picklist' | 'confirmation'

/** Everything the UI needs from the backend. Swap the mock for the real API in api/index.ts. */
export interface BopusApi {
  searchOrders(criteria: SearchCriteria): Promise<OrderSummary[]>
  getOrder(orderId: string): Promise<OrderDetail>
  listAssociates(): Promise<string[]>
  assignOrders(orderIds: string[], associate: string): Promise<void>
  unassignOrders(orderIds: string[]): Promise<UnassignResult>
  addNote(orderId: string, text: string): Promise<OrderDetail>
  cancelRemainingItems(orderId: string): Promise<OrderDetail>
  cancelEntireOrder(orderId: string): Promise<OrderDetail>
  toggleShipment(orderId: string, lineId: string): Promise<OrderDetail>
  reprint(orderId: string, doc: ReprintDoc): Promise<OrderDetail>
}
