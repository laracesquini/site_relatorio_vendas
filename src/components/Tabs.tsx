import type { IconType } from "react-icons";

interface TabsProps {
  items: {
    icon: IconType,
    type: string;
    label: string
  }[],
  activeTab: string;
  setActiveTab: (type: string) => void;
}
export default function Tabs({ items, activeTab, setActiveTab }: TabsProps) {
  return (
    <div className="flex flex-row rounded-3xl bg-card p-1 gap-3 items-center cursor-pointer">
      {items?.map((item, idx) => {
        const Icon = item?.icon
        const active = item?.type === activeTab
        return (
          <div key={idx} className={`flex rounded-3xl flex-row items-center gap-1 p-2 ${active && 'bg-card-foreground'}`} onClick={() => setActiveTab(item?.type)}>
            <Icon className={`w-5 h-5 ${active ? "text-muted font-bold" : 'text-card-foreground font-semibold'}`} />
            <p className={`text-sm ${active ? "text-muted font-bold" : 'text-card-foreground font-semibold'}`}>{item?.label}</p>
          </div>
        )
      })}
    </div>
  )
}