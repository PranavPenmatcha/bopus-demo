// Deterministic fake data. Names/phones are synthetic; order shapes follow the
// "Download Results" sheet in the requirements workbook.
import type { ItemStatus, OrderDetail, OrderItem, OrderNote, OrderStatus, OrderType } from '../api/types'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(24)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
function weighted<T>(pairs: [T, number][]): T {
  let r = rand() * pairs.reduce((s, [, w]) => s + w, 0)
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v
  return pairs[0][0]
}

const FIRST = ['Sarah', 'Joe', 'Dave', 'Mary', 'Ben', 'Gale', 'Mark', 'Faye', 'Desiree', 'George', 'Linda', 'Tom', 'Kim', 'Bill', 'Susan', 'Paul', 'Amy', 'Eric', 'Janet', 'Kurt', 'Lisa', 'Ryan', 'Nora', 'Dan', 'Carla', 'Greg', 'Holly', 'Ken', 'Megan', 'Scott']
const LAST = ['Miller', 'Johnson', 'Schmidt', 'Olson', 'Hansen', 'Peterson', 'Larson', 'Nelson', 'Becker', 'Weber', 'Meyer', 'Krause', 'Schultz', 'Hoffman', 'Wagner', 'Fischer', 'Lange', 'Brandt', 'Koch', 'Vogel', 'Zimmer', 'Keller', 'Huber', 'Frank', 'Graf', 'Roth', 'Baker', 'Fox', 'Stone', 'Wolfe']
const STREETS = ['Main St', 'Oak Ave', 'County Rd K', 'Lakeview Dr', 'Elm St', 'Prairie Ln', 'Hwy 12', 'Mill Rd']
const AREA = ['608', '608', '608', '715', '414', '262', '630']

export const ASSOCIATES = ['ALEX MORGAN', 'JORDAN LEE', 'CASEY BROOKS', 'TAYLOR REED', 'RILEY HANSEN', 'MORGAN SCHULTZ', 'JAMIE NELSON', 'DREW OLSON', 'SAM KOWALSKI', 'PAT LARSON']

const BRANCHES = [
  { branch: '03 - JVL', fulfill: '03-JVL', city: 'Janesville', code: '00003' },
  { branch: '28 - BAR', fulfill: '28-BAR', city: 'Baraboo', code: '00028' },
  { branch: '08 - RLK', fulfill: '08-RLK', city: 'Rice Lake', code: '00008' },
]

type Product = [mfg: string, vendor: string, desc: string, blain: string, price: number]
const PRODUCTS: Product[] = [
  ['2500', 'Morton', '40# Morton Clean and Protect Yellow', '752866', 6.99],
  ['476-103-15', 'Blue Buffalo', '30# Blue Buffalo Adult Chix/Brn Rice', '675093', 67.98],
  ['BSDOD', 'White Flyer', '135 pk Orange Dome Blackout Targets', '1577559', 18.99],
  ['5344D', 'Agrimaster', '50# Agrimaster Cracked Corn', '354343', 8.99],
  ['M922', 'Victor', '10ct Fast-Kill Rflbl Mouse Bait Station', '1269537', 8.99],
  ['425IEHV', 'Komelon', '25\' x 1" Chrome Prof. In/Engnr Scale', '774744', 8.99],
  ['K87', 'Carhartt', 'Men\'s K87 Workwear Pocket Tee', '1022345', 24.99],
  ['51-163', 'Stanley', '16 oz Fiberglass Claw Hammer', '220418', 19.99],
  ['L10SK3', 'Lodge', '12" Cast Iron Skillet', '640022', 34.99],
  ['T1', 'Kong', 'Classic Dog Toy Large', '318870', 14.99],
  ['32150', 'Scotts', 'Turf Builder Lawn Food 12.5M', '905511', 54.99],
  ['2620', 'Rubbermaid', '32 gal Brute Trash Can', '118406', 39.99],
  ['2801-22', 'Milwaukee', 'M18 Compact Drill/Driver Kit', '1440987', 199.0],
  ['MN1500', 'Duracell', 'AA Alkaline Batteries 24 pk', '450091', 21.99],
  ['100033', 'Kaytee', '20# Wild Bird Food', '503318', 17.99],
  ['44683', 'Igloo', '48 qt Marine Cooler', '881245', 44.99],
  ['BPF2', 'Little Giant', '2 gal Plastic Poultry Fountain', '271190', 19.99],
  ['VV177', 'Valvoline', '5W-30 Motor Oil 5 qt', '660734', 27.99],
]
const ANIMALS: Product[] = [
  ['CHK-RIR', 'Hatchery', 'Rhode Island Red Pullet Chick', '1600101', 4.99],
  ['CHK-BO', 'Hatchery', 'Buff Orpington Pullet Chick', '1600102', 4.99],
  ['DCK-PK', 'Hatchery', 'Pekin Duckling Straight Run', '1600110', 6.49],
]

const DAY = 86_400_000

function phone() {
  return pick(AREA) + String(int(200, 999)) + String(int(0, 9999)).padStart(4, '0')
}
function location() {
  const p = () => String(int(1, 5)).padStart(2, '0')
  return `60-${p()}-${p()}-0${int(1, 3)}-0${int(1, 4)}`
}

function itemsFor(status: OrderStatus, type: OrderType, fulfill: string): OrderItem[] {
  const pool = type.startsWith('Live Animal') ? ANIMALS : PRODUCTS
  const n = type === 'Raincheck' ? 1 : int(1, 5)
  const packedCount = status === 'PICKING' ? int(0, n - 1) : 0
  return Array.from({ length: n }, (_, i) => {
    const [mfgPart, vendor, description, blainNumber, price] = pick(pool)
    const qtyTotal = type.startsWith('Live Animal') ? int(3, 12) : weighted([[1, 6], [2, 3], [3, 1]])
    let itemStatus: ItemStatus = 'Incomplete'
    if (status === 'PICKING') itemStatus = i < packedCount ? 'Packed' : 'Incomplete'
    else if (status === 'WAITING PICKUP') itemStatus = 'Awaiting Pickup'
    else if (status === 'CLOSED' || status === 'INVOICED') itemStatus = 'Picked Up'
    else if (status === 'CANCELLED') itemStatus = 'Cancelled'
    const ready = itemStatus === 'Packed' || itemStatus === 'Awaiting Pickup' || itemStatus === 'Picked Up'
    return {
      lineId: String(i + 1),
      mfgPart,
      vendor,
      description,
      blainNumber,
      status: itemStatus,
      qtyTotal,
      qtyReady: ready ? qtyTotal : 0,
      price: Math.round(price * qtyTotal * 100) / 100,
      fulfill,
      shipment: 'Parcel',
      location: ready ? location() : null,
    }
  })
}

function notesFor(status: OrderStatus, created: number, items: OrderItem[], branchCode: string): OrderNote[] {
  const notes: OrderNote[] = []
  let t = created + 3 * 60_000
  const add = (text: string, system = true) => {
    notes.push({ id: String(notes.length + 1), text, createdAt: new Date(t).toISOString(), system })
    t += int(5, 600) * 60_000
  }
  if (status === 'OPEN' || status === 'PENDING' || status === 'ON ORDER') {
    add(`ORDER HAS BEEN CREATED. BRANCH ${branchCode}`)
    return notes
  }
  add('PICKING LIST HAS BEEN PRINTED BY USER SYSTEM')
  add(`ORDER HAS BEEN UPDATED TO PICKING STATUS BY USER SYSTEM BRANCH ${branchCode}`)
  for (const it of items) if (it.location) add(`PACKED TO LOCATION ${it.location}`)
  if (status === 'CANCELLED') add(`ORDER HAS BEEN CANCELLED BY USER SYSTEM BRANCH ${branchCode}`)
  if (status === 'WAITING PICKUP' || status === 'CLOSED' || status === 'INVOICED') {
    add('ORDER HAS BEEN UPDATED TO WAITING PICKUP STATUS. CUSTOMER NOTIFIED.')
    if (rand() < 0.15) add('CUST CALLED - WILL PICK UP THIS WEEKEND', false)
  }
  if (status === 'CLOSED' || status === 'INVOICED') add('ORDER HAS BEEN PICKED UP BY CUSTOMER. ORDER CLOSED.')
  return notes
}

export function seedOrders(count = 140, now = Date.now()): OrderDetail[] {
  const drafts = Array.from({ length: count }, () => {
    const type = weighted<OrderType>([
      ['BOPUS', 60], ['Raincheck', 15], ['Easy Order', 10], ['Live Animal - Web', 4],
      ['Live Animal - Easy Order', 3], ['Roadie', 4], ['Special Order', 4],
    ])
    const status = weighted<OrderStatus>([
      ['PICKING', 30], ['WAITING PICKUP', 30], ['OPEN', 10], ['CLOSED', 12],
      ['CANCELLED', 6], ['INVOICED', 4], ['PENDING', 4], ['ON ORDER', 4],
    ])
    const longWait = type === 'Raincheck' || type === 'Special Order'
    const daysAgo =
      status === 'OPEN' ? int(0, 1)
      : status === 'PICKING' ? (longWait ? int(2, 45) : int(0, 2))
      : status === 'WAITING PICKUP' ? (longWait ? int(3, 60) : int(0, 10))
      : int(1, 40)
    return { type, status, created: now - daysAgo * DAY - int(0, 23 * 60) * 60_000 }
  })
  drafts.sort((a, b) => a.created - b.created)

  return drafts.map(({ type, status, created }, idx): OrderDetail => {
    const b = pick(BRANCHES)
    const firstName = pick(FIRST)
    const lastName = pick(LAST)
    const ph = phone()
    const items = itemsFor(status, type, b.fulfill)
    const prepaid = type === 'Raincheck' || type === 'Easy Order' || type.startsWith('Live Animal')
    const pickable = type === 'BOPUS' || type === 'Roadie' || type === 'Special Order' || type === 'Live Animal - Web'
    const assigned = pickable && status !== 'OPEN' && status !== 'PENDING' && status !== 'ON ORDER' && rand() < 0.8
    return {
      orderId: String(36_700_000 + idx * 2_900 + int(0, 2_800)),
      orderType: type,
      createdAt: new Date(created).toISOString(),
      firstName,
      lastName,
      phone: ph,
      status,
      branch: b.branch,
      daysOld: 0,
      assignedTo: assigned ? pick(ASSOCIATES) : null,
      itemCount: items.length,
      locations: [],
      purchaseOrder: type.startsWith('Live Animal') || type === 'Special Order' ? `PO${int(100000, 999999)}` : null,
      invoiceNumber: prepaid ? String(int(1_000_000, 9_999_999)) : null,
      orderMethod: type === 'Easy Order' || type === 'Raincheck' || type === 'Live Animal - Easy Order' ? 'In Store' : 'Web - In Store',
      customer: {
        firstName,
        lastName,
        company: '',
        email: `${firstName}.${lastName}${int(1, 99)}@example.com`.toLowerCase(),
        address1: `${int(100, 9999)} ${pick(STREETS)}`,
        address2: '',
        city: b.city,
        state: 'WI',
        zip: String(int(53500, 54899)),
        daytimePhone: ph,
        eveningPhone: '',
      },
      items,
      notes: notesFor(status, created, items, b.code),
      tracking: [],
    }
  })
}
