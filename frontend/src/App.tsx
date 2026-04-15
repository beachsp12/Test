import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import NewOffer from './pages/NewOffer';
import OfferHistory from './pages/OfferHistory';
import OfferDetail from './pages/OfferDetail';
import Templates from './pages/Templates';
import FormTemplates from './pages/FormTemplates';
import MarketReport from './pages/MarketReport';
import MarketReportTemplates from './pages/MarketReportTemplates';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/offers/new" replace />} />
            <Route path="/offers/new" element={<NewOffer />} />
            <Route path="/offers" element={<OfferHistory />} />
            <Route path="/offers/:id" element={<OfferDetail />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/form-templates" element={<FormTemplates />} />
            <Route path="/market-reports" element={<MarketReport />} />
            <Route path="/market-report-templates" element={<MarketReportTemplates />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
