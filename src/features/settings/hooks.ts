import { useQuery } from '@tanstack/react-query'
import {
  listCategories,
  listChannels,
  listSuppliers,
  listUnits,
  listVariationTypes,
  settingsKeys,
  type CategoryKind,
} from './api'

export const useChannels = () => useQuery({ queryKey: settingsKeys.channels, queryFn: listChannels })

export const useCategories = () =>
  useQuery({ queryKey: settingsKeys.categories, queryFn: listCategories })

/** Active categories of one kind, for select fields. */
export function useCategoryOptions(kind: CategoryKind) {
  const query = useCategories()
  return {
    ...query,
    data: query.data?.filter((c) => c.kind === kind && !c.archived_at),
  }
}

export const useUnits = () => useQuery({ queryKey: settingsKeys.units, queryFn: listUnits })

export const useSuppliers = () => useQuery({ queryKey: settingsKeys.suppliers, queryFn: listSuppliers })

export const useVariationTypes = () =>
  useQuery({ queryKey: settingsKeys.variations, queryFn: listVariationTypes })
