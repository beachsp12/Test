import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import NewOffer from './pages/NewOffer';
import OfferHistory from './pages/OfferHistory';
import OfferDetail from './pages/OfferDetail';
import Templates from './pages/Templates';
import FormTemplates from './pages/FormTemplates';

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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
