import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Offer } from '../types';
import { listOffers, createOffer } from '../api';

const STATUS_COLORS: Record<string, string> = {
  draft: 'badge-gray',
  review: 'badge-yellow',
  final: 'badge-green',
  signed: 'badge-green',
  archived: 'badge-gray',
};

export default function OfferHistory() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listOffers()
      .then(setOffers)
      .finally(() => setLoading(false));
  }, []);

  const handleDuplicate = async (offer: Offer) => {
    const dup = await createOffer({
      fields: { ...offer.fields, buyer: undefined, seller: undefined },
      status: 'draft',
    });
    navigate(`/offers/${dup.id}`);
  };

  const filtered = offers.filter(o =>
    !search ||
    (o.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (o.fields.property?.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offer History</h1>
        <Link to="/offers/new" className="btn-primary">+ New Offer</Link>
      </div>

      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by address or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm">No offers yet.</p>
          <Link to="/offers/new" className="btn-primary inline-flex mt-4">Create your first offer</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(offer => (
            <div key={offer.id} className="card px-4 py-3 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/offers/${offer.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-brand-700 block truncate"
                >
                  {offer.name ?? 'Untitled Offer'}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={STATUS_COLORS[offer.status] ?? 'badge-gray'}>
                    {offer.status}
                  </span>
                  <span className="text-xs text-gray-400">{offer.formType}</span>
                  {offer.fields.terms?.purchasePrice && (
                    <span className="text-xs text-gray-500 font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
                        .format(offer.fields.terms.purchasePrice)}
                    </span>
                  )}
                  {offer.fields.financing?.type && (
                    <span className="text-xs text-gray-400 uppercase">{offer.fields.financing.type}</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400 shrink-0 hidden sm:block">
                {new Date(offer.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/offers/${offer.id}`} className="btn-secondary text-xs">Open</Link>
                <button
                  onClick={() => handleDuplicate(offer)}
                  className="btn-secondary text-xs"
                  title="Duplicate offer (strips buyer/seller info)"
                >
                  Reuse
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
