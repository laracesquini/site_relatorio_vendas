import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  listRecentlySoldProductIds,
  listSaleLines,
  salesKeys,
  type SaleLineFilters,
} from './api'

export const useSaleLines = (filters: SaleLineFilters) =>
  useQuery({
    queryKey: salesKeys.list(filters),
    queryFn: () => listSaleLines(filters),
    // Keep showing the previous results while a new filter loads.
    placeholderData: keepPreviousData,
  })

export const useRecentlySoldProductIds = () =>
  useQuery({ queryKey: salesKeys.recentProducts(), queryFn: listRecentlySoldProductIds })
