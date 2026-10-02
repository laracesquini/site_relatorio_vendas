import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './auth-context'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-label="Carregando" />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
