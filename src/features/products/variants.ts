// Pure helpers for building product variants from selected variation values.

export type ValueRef = { id: string; value: string; typeId: string }

/** Every combination picking one value per type, keeping the types' order. */
export function combine(groups: ValueRef[][]): ValueRef[][] {
  const nonEmpty = groups.filter((g) => g.length > 0)
  if (nonEmpty.length === 0) return []
  return nonEmpty.reduce<ValueRef[][]>(
    (acc, group) => acc.flatMap((combo) => group.map((v) => [...combo, v])),
    [[]],
  )
}

/** Stable key for a set of value ids, independent of order. */
export const comboKey = (valueIds: string[]) => [...valueIds].sort().join('|')

/** "Roxo/Dourado" → "ROXODOURADO", "Pequeno" → "PEQUENO" (no accents or spaces). */
export function skuPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

/** PET + [Azul, Pequeno] → PET-AZUL-PEQUENO */
export function suggestSku(baseSku: string, values: string[]) {
  return [baseSku.trim().toUpperCase(), ...values.map(skuPart)].filter(Boolean).join('-')
}

export const variantLabel = (values: string[]) => values.join(' / ')

type ExistingVariant = { valueIds: string[] }

/**
 * Merges generated combinations into the current rows: existing rows are kept
 * as they are (with their SKU, price and ids), new combinations are appended.
 */
export function mergeCombinations<T extends ExistingVariant>(
  current: T[],
  combos: ValueRef[][],
  create: (combo: ValueRef[]) => T,
): T[] {
  const existing = new Set(current.map((v) => comboKey(v.valueIds)))
  const added = combos
    .filter((combo) => !existing.has(comboKey(combo.map((v) => v.id))))
    .map(create)
  return [...current, ...added]
}
