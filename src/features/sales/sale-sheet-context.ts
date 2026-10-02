import { createContext, useContext } from 'react'
import type { SaleLine } from './api'

export type SaleSheetState = {
  openNewSale: () => void
  openEditSale: (line: SaleLine) => void
}

export const SaleSheetContext = createContext<SaleSheetState | null>(null)

/** Opens the sale drawer (new or edit) from anywhere in the app. */
export function useSaleSheet() {
  const ctx = useContext(SaleSheetContext)
  if (!ctx) throw new Error('useSaleSheet precisa estar dentro de <SaleSheetProvider>')
  return ctx
}
