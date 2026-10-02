import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { SaleSheetProvider } from '@/features/sales/components/SaleSheetProvider'
import { useSaleSheet } from '@/features/sales/sale-sheet-context'
import { SidebarNav } from './SidebarNav'
import { UserMenu } from './UserMenu'

export function AppLayout() {
  return (
    <SaleSheetProvider>
      <Shell />
    </SaleSheetProvider>
  )
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { openNewSale } = useSaleSheet()

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-card lg:block">
        <SidebarNav />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal</SheetDescription>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={openNewSale}>
            <Plus /> Nova venda
          </Button>
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
