// CSV export shaped for Excel in Portuguese: ";" separators, "," decimals,
// DD/MM/YYYY dates and a UTF-8 BOM so accents open correctly.

export type CsvValue = string | number | boolean | null | undefined

export type CsvColumn<T> = {
  label: string
  value: (row: T) => CsvValue
}

const number = new Intl.NumberFormat('pt-BR', { useGrouping: false, maximumFractionDigits: 6 })

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  let text: string
  if (typeof value === 'number') text = Number.isFinite(value) ? number.format(value) : ''
  else if (typeof value === 'boolean') text = value ? 'Sim' : 'Não'
  else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    text = `${d}/${m}/${y}`
  } else text = value
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [columns.map((c) => cell(c.label)).join(';')]
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(';'))
  return lines.join('\r\n')
}

/** Starts a download of the CSV in the browser. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
