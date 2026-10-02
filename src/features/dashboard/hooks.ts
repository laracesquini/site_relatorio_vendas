import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { dashboardKeys, getOverview, getStockValue, listLowStock } from './api'

export const useOverview = (from: string | null, to: string | null) =>
  useQuery({
    queryKey: dashboardKeys.overview(from, to),
    queryFn: () => getOverview(from, to),
    // Keep the previous charts on screen while a new period loads.
    placeholderData: keepPreviousData,
  })

export const useLowStock = () => useQuery({ queryKey: dashboardKeys.lowStock(), queryFn: listLowStock })

export const useStockValue = () => useQuery({ queryKey: dashboardKeys.stockValue(), queryFn: getStockValue })
