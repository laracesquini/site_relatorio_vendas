import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'

// Each area is loaded on demand so the first load stays small.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
})

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, lazy: page(() => import('@/features/dashboard/pages/DashboardPage')) },
          { path: 'vendas', lazy: page(() => import('@/features/sales/pages/SalesPage')) },
          { path: 'produtos', lazy: page(() => import('@/features/products/pages/ProductsPage')) },
          { path: 'produtos/novo', lazy: page(() => import('@/features/products/pages/ProductFormPage')) },
          { path: 'produtos/:id', lazy: page(() => import('@/features/products/pages/ProductFormPage')) },
          { path: 'produtos/:id/ficha', lazy: page(() => import('@/features/products/pages/CostSheetPage')) },
          { path: 'estoque', lazy: page(() => import('@/features/inventory/pages/InventoryPage')) },
          { path: 'compras', lazy: page(() => import('@/features/purchases/pages/PurchasesPage')) },
          { path: 'relatorios', lazy: page(() => import('@/features/reports/pages/ReportsPage')) },
          { path: 'configuracoes', lazy: page(() => import('@/features/settings/pages/SettingsPage')) },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
