import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon }

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]
