import { NavLink } from 'react-router-dom';

const links = [
  { to: '/offers/new',            label: 'New Offer' },
  { to: '/offers',                label: 'Offer History' },
  { to: '/templates',             label: 'My Templates' },
  { to: '/form-templates',        label: 'GBBREB Forms' },
  { to: '/market-reports',        label: 'Market Report' },
  { to: '/market-report-templates', label: 'MR Templates' },
];

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-brand-600 font-bold text-lg tracking-tight">GBBREB</span>
            <span className="text-gray-400 font-light">Offer Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
