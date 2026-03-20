import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Building2, MapPin, X } from 'lucide-react';

export default function TrustSelector({ trusts = [], selectedTrust, onSelectTrust }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter trusts based on query
  const filteredTrusts = useMemo(() => {
    if (!query.trim()) return trusts;
    const lower = query.toLowerCase();
    return trusts.filter(
      (t) =>
        t.trust_name.toLowerCase().includes(lower) ||
        t.trust_code.toLowerCase().includes(lower) ||
        (t.region && t.region.toLowerCase().includes(lower))
    );
  }, [trusts, query]);

  const handleSelect = (trust) => {
    onSelectTrust(trust);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelectTrust(null);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Searchable dropdown */}
          <div ref={containerRef} className="relative flex-1">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={isOpen ? query : selectedTrust?.trust_name || ''}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder="Search and select a trust..."
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {selectedTrust && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Dropdown list */}
            {isOpen && (
              <ul className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                {filteredTrusts.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    No trusts found
                  </li>
                ) : (
                  filteredTrusts.map((trust) => (
                    <li key={trust.trust_code}>
                      <button
                        type="button"
                        onClick={() => handleSelect(trust)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#2563EB]/10 dark:hover:bg-[#2563EB]/20 ${
                          selectedTrust?.trust_code === trust.trust_code
                            ? 'bg-[#2563EB]/5 dark:bg-[#2563EB]/10 text-[#2563EB] font-medium'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <span>{trust.trust_name}</span>
                        {trust.region && (
                          <span className="ml-2 text-gray-400 dark:text-gray-500">
                            &mdash; {trust.region}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Region badge */}
          {selectedTrust?.region && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-[#7C3AED]/20 dark:text-[#7C3AED] shrink-0">
              <MapPin className="w-3 h-3" />
              {selectedTrust.region}
            </span>
          )}
        </div>

        {/* Summary text */}
        {selectedTrust && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Showing data for{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {selectedTrust.trust_name}
            </span>{' '}
            (2020&ndash;2026)
          </p>
        )}
      </div>
    </div>
  );
}
