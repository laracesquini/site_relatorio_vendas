import type { ChannelResult, ReportDetails } from '../api'
import { marginOf, shareOf, sumFields } from '../totals'
import { ReportTable, type ReportColumn } from './ReportTable'

const COLUMNS: ReportColumn<ChannelResult>[] = [
  { label: 'Canal', value: (r) => r.name, strong: true },
  { label: 'Vendas', value: (r) => r.sales_count, format: 'number' },
  { label: 'Unidades', value: (r) => r.units, format: 'number' },
  { label: 'Bruto', value: (r) => r.gross, format: 'currency' },
  { label: 'Taxas', value: (r) => r.fees, format: 'currency' },
  { label: 'Taxa média', value: (r) => r.fee_percent, format: 'percent' },
  { label: 'Recebido', value: (r) => r.received, format: 'currency' },
  { label: 'Custo', value: (r) => r.cost, format: 'currency' },
  { label: 'Lucro', value: (r) => r.profit, format: 'currency', strong: true, signed: true },
  { label: 'Margem', value: (r) => r.margin, format: 'percent', signed: true },
]

export function ChannelsTab({ data }: { data: ReportDetails }) {
  const t = sumFields(data.by_channel, ['sales_count', 'units', 'gross', 'fees', 'received', 'cost', 'profit'])
  return (
    <ReportTable
      title="Canais de venda"
      description="Taxa média = taxas ÷ bruto. Mostra quanto cada marketplace fica de cada venda."
      columns={COLUMNS}
      rows={data.by_channel}
      rowKey={(r) => r.channel_id}
      filename={`canais_${data.from}_${data.to}`}
      totals={[
        'Total',
        t.sales_count,
        t.units,
        t.gross,
        t.fees,
        shareOf(t.fees, t.gross),
        t.received,
        t.cost,
        t.profit,
        marginOf(t.profit, t.received),
      ]}
    />
  )
}
