import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getPurchaseLines, listPurchaseLines, purchaseKeys } from './api'

export const usePurchaseList = (from: string | null, to: string | null) =>
  useQuery({
    queryKey: purchaseKeys.list(from, to),
    queryFn: () => listPurchaseLines(from, to),
    placeholderData: keepPreviousData,
  })

export const usePurchaseLines = (purchaseId: string | undefined) =>
  useQuery({
    queryKey: purchaseKeys.detail(purchaseId ?? ''),
    queryFn: () => getPurchaseLines(purchaseId!),
    enabled: Boolean(purchaseId),
  })
