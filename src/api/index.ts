import { mockApi } from './mockApi'
import type { BopusApi } from './types'

// When the real API is ready, add an implementation of BopusApi (e.g. httpApi.ts)
// and return it here. Every screen talks to the backend only through `api`.
export const api: BopusApi = mockApi

export * from './types'
