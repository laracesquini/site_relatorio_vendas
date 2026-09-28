import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toErrorMessage } from './errors'

type Result<T> = { data: T; error: unknown }

/** Returns the data of a Supabase response or throws its error. */
export async function unwrap<T>(request: PromiseLike<Result<T>>): Promise<NonNullable<T>> {
  const { data, error } = await request
  if (error) throw error
  return data as NonNullable<T>
}

type AppMutationOptions<TVars, TResult> = {
  mutationFn: (vars: TVars) => Promise<TResult>
  /** Query keys to refetch after success. */
  invalidate?: QueryKey[]
  /** Toast shown on success; omit for silent mutations. */
  successMessage?: string | ((result: TResult, vars: TVars) => string)
  onSuccess?: (result: TResult, vars: TVars) => void
}

/** Mutation with the app's standard feedback: success/error toasts and cache refresh. */
export function useAppMutation<TVars = void, TResult = unknown>({
  mutationFn,
  invalidate = [],
  successMessage,
  onSuccess,
}: AppMutationOptions<TVars, TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (result, vars) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      if (successMessage) {
        toast.success(typeof successMessage === 'function' ? successMessage(result, vars) : successMessage)
      }
      onSuccess?.(result, vars)
    },
    onError: (error) => {
      toast.error(toErrorMessage(error))
    },
  })
}
