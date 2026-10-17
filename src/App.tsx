import { HashRouter, Route, Routes } from 'react-router-dom'
import { OrderDetailsPage } from './pages/OrderDetailsPage'
import { SearchPage } from './pages/SearchPage'

export default function App() {
  return (
    <HashRouter>
      <div className="topbar">SL24 - Bopus Dashboard</div>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
      </Routes>
    </HashRouter>
  )
}
