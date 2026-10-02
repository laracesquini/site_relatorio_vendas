import { useQuery } from '@tanstack/react-query'
import { getProduct, listProducts, productKeys } from './api'

export const useProducts = () => useQuery({ queryKey: productKeys.list(), queryFn: listProducts })

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => getProduct(id!),
    enabled: Boolean(id),
  })
