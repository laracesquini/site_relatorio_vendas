import { Outlet, Route, Routes } from "react-router-dom";
import Reports from "./pages/Reports";

export default function Router() {
  return (
    <Routes>
      <Route element={<DefaultComp />}>
        <Route index element={<Reports />} />
      </Route>
    </Routes>
  )
}

const DefaultComp = () => {
  return (
    <Outlet />
  )
}