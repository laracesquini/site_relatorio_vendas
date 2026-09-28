import { useQuery } from '@tanstack/react-query'
import { listRecentlySoldProductIds, listRecentSales, salesKeys } from './api'

export const useRecentSales = () =>
  useQuery({ queryKey: salesKeys.recent(), queryFn: () => listRecentSales() })

export const useRecentlySoldProductIds = () =>
  useQuery({ queryKey: salesKeys.recentProducts(), queryFn: listRecentlySoldProductIds })
