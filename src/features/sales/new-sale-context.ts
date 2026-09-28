import { createContext, useContext } from 'react'

export const NewSaleContext = createContext<{ openNewSale: () => void } | null>(null)

/** Opens the "Nova venda" drawer from anywhere in the app. */
export function useNewSale() {
  const ctx = useContext(NewSaleContext)
  if (!ctx) throw new Error('useNewSale precisa estar dentro de <NewSaleProvider>')
  return ctx
}
