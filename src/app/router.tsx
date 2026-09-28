import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import UpcomingPage from './UpcomingPage'
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
          { path: 'estoque', element: <UpcomingPage title="Estoque" stage={7} /> },
          { path: 'compras', element: <UpcomingPage title="Compras e despesas" stage={8} /> },
          { path: 'relatorios', element: <UpcomingPage title="Relatórios" stage={10} /> },
          { path: 'configuracoes', lazy: page(() => import('@/features/settings/pages/SettingsPage')) },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
