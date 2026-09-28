type ErrorLike = { message?: string; code?: string }

// Postgres error codes that deserve a friendlier message. Business-rule errors
// raised by our RPCs are already written in Portuguese and pass through.
const MESSAGES: Record<string, string> = {
  '23505': 'Já existe um registro com esse nome ou SKU.',
  '23503': 'Este registro está em uso e não pode ser excluído. Arquive-o em vez disso.',
  '23514': 'Algum valor informado é inválido.',
  '42501': 'Você não tem permissão para esta ação.',
}

export function toErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido.'
  const e = error as ErrorLike
  if (e.code && e.code in MESSAGES) return MESSAGES[e.code]
  if (e.message === 'Failed to fetch') return 'Sem conexão com o servidor. Verifique sua internet.'
  if (e.message === 'Invalid login credentials') return 'E-mail ou senha incorretos.'
  return e.message || 'Erro desconhecido.'
}
