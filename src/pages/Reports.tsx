import { useState } from "react"
import { TbBox, TbPercentage, TbPlus } from "react-icons/tb"
import Tabs from "../components/Tabs"
import { FaRegChartBar } from "react-icons/fa"

export default function Reports() {
  const [activeTab, setActiveTab] = useState<string>('new_product')

  const tabItems = [
    {
      label: "Novo Produto",
      icon: TbPlus,
      type: "new_product"
    },
    {
      label: "Produtos",
      icon: TbBox,
      type: "products"
    },
    {
      label: "Taxas",
      icon: TbPercentage,
      type: "taxes"
    },
    {
      label: "Relatórios",
      icon: FaRegChartBar,
      type: "reports"
    },
  ]

  return (
    <div className="flex flex-1 bg-background">
      <div className="flex flex-col gap-2 p-10 w-full">
        <p className="text-base text-muted-foreground">Livro de vendas - Multicanal</p>
        <div className="flex flex-row justify-between w-full items-center">
          <p className="text-4xl font-bold">Painel de vendas</p>
          <Tabs
            items={tabItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
    </div>
  )
}