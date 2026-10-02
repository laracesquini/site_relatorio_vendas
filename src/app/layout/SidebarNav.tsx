import { NavLink } from 'react-router-dom'
import { Box } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Box className="size-4" />
        </div>
        <span className="font-heading font-semibold">Gestão 3D</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
