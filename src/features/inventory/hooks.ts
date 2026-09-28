import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAppMutation } from '@/lib/api'
import { dashboardKeys } from '@/features/dashboard/api'
import { productKeys } from '@/features/products/api'
import {
  inventoryKeys,
  listFinishedGoods,
  listInventoryItems,
  listMovements,
  type MovementFilters,
} from './api'

export const useInventoryItems = () =>
  useQuery({ queryKey: inventoryKeys.items(), queryFn: listInventoryItems })

export const useFinishedGoods = () =>
  useQuery({ queryKey: inventoryKeys.finished(), queryFn: listFinishedGoods })

export const useMovements = (filters: MovementFilters) =>
  useQuery({
    queryKey: inventoryKeys.movements(filters),
    queryFn: () => listMovements(filters),
    placeholderData: keepPreviousData,
  })

/** Everything that shows stock quantities or costs must refresh after a movement. */
export const STOCK_QUERIES = [inventoryKeys.all, dashboardKeys.all, productKeys.all]

export function useStockMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  successMessage: string | ((result: TResult, vars: TVars) => string),
  onSuccess?: () => void,
) {
  return useAppMutation({ mutationFn, invalidate: STOCK_QUERIES, successMessage, onSuccess })
}
