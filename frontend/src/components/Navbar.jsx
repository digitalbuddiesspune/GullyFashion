import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { searchProducts } from '../services/api';
import { api } from '../utils/api';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchWrapRefMobile = useRef(null);
  const searchWrapRefDesktop = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [navbarLogo, setNavbarLogo] = useState('https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768217365/Black_White_Minimal_Initial_G_Letter_Logo_Design_dxdto9.png');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const readWishlistCount = () => {
      try {
        const raw = localStorage.getItem('wishlist');
        const list = raw ? JSON.parse(raw) : [];
        setWishlistCount(Array.isArray(list) ? list.length : 0);
      } catch {
        setWishlistCount(0);
      }
    };
    readWishlistCount();
    const onStorage = (e) => {
      if (!e || e.key === 'wishlist') readWishlistCount();
    };
    const onCustom = () => readWishlistCount();
    window.addEventListener('storage', onStorage);
    window.addEventListener('wishlist:updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('wishlist:updated', onCustom);
    };
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('auth_token');
        setIsAuthenticated(Boolean(token));
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    const onStorage = (e) => {
      if (!e || e.key === 'auth_token') {
        checkAuth();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const data = await api.getLogo();
        if (data.navbarLogo) {
          setNavbarLogo(data.navbarLogo);
        }
      } catch (err) {
        console.error('Failed to load navbar logo:', err);
        // Keep default logo on error
      }
    };
    loadLogo();
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('auth_token');
    } catch {}
    setIsAuthenticated(false);
    navigate('/signin');
  };

  const handleLogin = () => {
    navigate('/signin');
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchProducts(q);
        const items = data?.results || [];
        setSearchResults(items);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const onClick = (e) => {
      const inMobile = searchWrapRefMobile.current && searchWrapRefMobile.current.contains(e.target);
      const inDesktop = searchWrapRefDesktop.current && searchWrapRefDesktop.current.contains(e.target);
      if (!inMobile && !inDesktop) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileMenuOpen && !e.target.closest('nav')) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  // Policy pages for mobile menu
  const policyLinks = [
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Terms of Service', path: '/terms' },
    { name: 'Shipping Policy', path: '/shipping' },
    { name: 'Return Policy', path: '/returns' },
  ];

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToNewArrival = () => {
    setIsCategoriesOpen(false);
    if (location.pathname === '/') {
      // If already on home page, scroll to the section
      setTimeout(() => {
        const element = document.getElementById('new-arrival');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // If not on home page, navigate first then scroll
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById('new-arrival');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  };

  return (
    <nav className="relative z-[70] bg-white border-b border-gray-200 border-t-0">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between h-16 sm:h-14 md:h-16 gap-4">
          {/* Logo/Brand - Left */}
          <Link to="/" className="flex-shrink-0 z-10 flex items-center">
            <img 
              src="https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768217365/Black_White_Minimal_Initial_G_Letter_Logo_Design_dxdto9.png"
              alt="MARTVILL Logo"
              className="h-10 sm:h-8 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation Links - Center */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8 flex-1 justify-center">
            <Link
              to="/"
              onClick={scrollToTop}
              className="text-gray-900 hover:text-black transition-colors duration-200 text-sm xl:text-base uppercase tracking-wide whitespace-nowrap px-1 py-2 flex items-center gap-1"
            >
              Home
            </Link>
            <Link
              to="/shop"
              onClick={scrollToTop}
              className="text-gray-900 hover:text-black transition-colors duration-200 text-sm xl:text-base uppercase tracking-wide whitespace-nowrap px-1 py-2 flex items-center gap-1"
            >
              Shop
            </Link>
            
            {/* Categories Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsCategoriesOpen(true)}
              onMouseLeave={() => setIsCategoriesOpen(false)}
            >
              <button
                className="text-gray-900 hover:text-black transition-colors duration-200 text-sm xl:text-base uppercase tracking-wide whitespace-nowrap px-1 py-2 flex items-center gap-1"
              >
                Categories
                <svg className={`w-4 h-4 transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isCategoriesOpen && (
                <div 
                  className="absolute top-full left-0 mt-0 pt-4 w-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 pb-4"
                >
                  <div className="flex gap-6 px-4">
                    {/* Left Section - Categories in Columns */}
                    <div className="flex-1 grid grid-cols-2 gap-6">
                      {/* Column 1 */}
                      <div className="space-y-1">
                    <Link
                          to="/category/crew-neck"
                      onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                    >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Crew Neck</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                    </Link>
                    <Link
                          to="/category/v-neck"
                      onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                    >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">V Neck</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                    </Link>
                    <Link
                          to="/category/polo"
                      onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                    >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Polo</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                    </Link>
                    <Link
                          to="/category/henley"
                      onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                    >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Henley</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                      
                      {/* Column 2 */}
                      <div className="space-y-1">
                        <Link
                          to="/category/tshirts"
                          onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                        >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Tshirt</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <Link
                          to="/category/long-sleeve"
                      onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                    >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Long Sleeve</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                    </Link>
                    <Link
                          to="/category/oversized"
                      onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                    >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Oversized</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                    </Link>
                    <Link
                          to="/category/pocket-tee"
                      onClick={() => { setIsCategoriesOpen(false); scrollToTop(); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors group"
                    >
                          <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Pocket Tee</span>
                          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Right Section - Promotional Card */}
                    <div className="w-48 border-l border-gray-200 pl-4">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 h-full">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">New Arrivals</h3>
                        <p className="text-xs text-gray-600 mb-3">Discover our latest collection of premium t-shirts</p>
                    <button
                          onClick={scrollToNewArrival}
                          className="text-xs font-medium text-gray-900 hover:text-black transition-colors inline-flex items-center gap-1"
                        >
                          Shop Now
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Link
              to="/collection"
              onClick={scrollToTop}
              className="text-gray-900 hover:text-black transition-colors duration-200 text-sm xl:text-base uppercase tracking-wide whitespace-nowrap px-1 py-2 flex items-center gap-1"
            >
              Collection
            </Link>
          </div>

          {/* Search Bar - Center (Desktop) */}
          <div className="hidden lg:flex items-center relative flex-1 max-w-md mx-4" ref={searchWrapRefDesktop}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Type your product name.."
              value={searchQuery}
              onChange={(e) => { const v = e.target.value; setSearchQuery(v); setSearchOpen(v.trim().length >= 2); }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (searchQuery.trim().length >= 2) setSearchOpen(true); }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-900 placeholder-gray-400"
            />
            {searchOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 lg:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[80] p-3 sm:p-4">
                  {searchLoading && (
                    <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
                  )}
                  {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500">No products found</div>
                  )}
                  {!searchLoading && searchResults.length > 0 && (
                    <ul className="max-h-80 overflow-auto divide-y divide-gray-100 mt-2">
                      {searchResults.slice(0, 8).map((p) => (
                        <li key={p._id || p.id || p.slug}>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              navigate(`/product/${p._id || p.id || ''}`);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                          >
                            <img
                              src={p.images?.image1 || p.image || 'https://via.placeholder.com/60x80?text=No+Image'}
                              alt={p.title || p.name || 'Product'}
                              className="w-12 h-16 object-cover rounded-md border border-gray-100"
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/60x80?text=No+Image'; }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.title || p.name || 'Product'}</p>
                              {p.price && (
                                <p className="text-xs text-gray-600">₹{Number(p.price).toLocaleString()}</p>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Search - Responsive */}
            <div className="lg:hidden relative flex-1 max-w-[200px] sm:max-w-[250px] mx-2" ref={searchWrapRefMobile}>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Type your product name.."
                value={searchQuery}
                onChange={(e) => { const v = e.target.value; setSearchQuery(v); setSearchOpen(v.trim().length >= 2); }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => { if (searchQuery.trim().length >= 2) setSearchOpen(true); }}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-900 placeholder-gray-400"
              />
              {searchOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-[80] p-3 sm:p-4">
                  {searchLoading && (
                    <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
                  )}
                  {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500">No products found</div>
                  )}
                  {!searchLoading && searchResults.length > 0 && (
                    <ul className="max-h-80 overflow-auto divide-y divide-gray-100 mt-2">
                      {searchResults.slice(0, 8).map((p) => (
                        <li key={p._id || p.id || p.slug}>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              navigate(`/product/${p._id || p.id || ''}`);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                          >
                            <img
                              src={p.images?.image1 || p.image || 'https://via.placeholder.com/60x80?text=No+Image'}
                              alt={p.title || p.name || 'Product'}
                              className="w-12 h-16 object-cover rounded-md border border-gray-100"
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/60x80?text=No+Image'; }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.title || p.name || 'Product'}</p>
                              {p.price && (
                                <p className="text-xs text-gray-600">₹{Number(p.price).toLocaleString()}</p>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

          {/* Right Side Icons with Labels */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Account */}
            <div className="hidden lg:flex flex-col items-center">
              {isAuthenticated ? (
                <Link to="/profile" className="flex flex-col items-center">
                  <svg className="w-5 h-5 text-gray-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700 text-xs">Account</span>
                </Link>
              ) : (
                <button onClick={handleLogin} className="flex flex-col items-center">
                  <svg className="w-5 h-5 text-gray-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700 text-xs">Account</span>
                </button>
              )}
            </div>

            {/* Wishlist */}
            <Link to="/wishlist" className="hidden lg:flex flex-col items-center relative">
              <svg className="w-5 h-5 text-gray-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-gray-700 text-xs">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" className="hidden lg:flex flex-col items-center relative">
              <svg className="w-5 h-5 text-gray-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-gray-700 text-xs">Your Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* My Orders */}
            <Link to="/track-order" className="hidden lg:flex flex-col items-center">
              <svg className="w-5 h-5 text-gray-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-700 text-xs">My Orders</span>
            </Link>

            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden ml-0.5 sm:ml-1">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md text-gray-700 hover:text-black hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            id="mobile-menu" 
            className="lg:hidden py-4 sm:py-6 border-t border-gray-200 bg-white animate-in slide-in-from-top duration-200"
          >
            {/* Contact Information Section */}
            <div className="px-4 sm:px-6 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Contact Information</h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+918851489813" className="text-xs sm:text-sm text-gray-700 hover:text-black transition-colors">
                    +91 8851489813
                  </a>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:support@gullyfashion.in" className="text-xs sm:text-sm text-gray-700 hover:text-black transition-colors break-all">
                    support@gullyfashion.in
                  </a>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:kavyanshenterprisespl@outlook.com" className="text-xs sm:text-sm text-gray-700 hover:text-black transition-colors break-all">
                    kavyanshenterprisespl@outlook.com
                  </a>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-700">
                    Address: 184 Main Rd E, St Albans, Australia
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links Section */}
            <div className="px-4 sm:px-6 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Quick Links</h3>
              <nav className="flex flex-col gap-2">
                <Link
                  to="/about"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    scrollToTop();
                  }}
                  className="text-xs sm:text-sm text-gray-700 hover:text-black hover:bg-gray-50 py-2 sm:py-2.5 px-3 sm:px-4 rounded transition-colors"
                >
                  About Us
                </Link>
                <Link
                  to="/privacy"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    scrollToTop();
                  }}
                  className="text-xs sm:text-sm text-gray-700 hover:text-black hover:bg-gray-50 py-2 sm:py-2.5 px-3 sm:px-4 rounded transition-colors"
                >
                  Privacy Policy
                </Link>
              </nav>
            </div>

            {/* Policy Links Section */}
            <nav className="flex flex-col gap-2 px-2">
              {policyLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    scrollToTop();
                  }}
                  className="text-gray-700 hover:text-black hover:bg-gray-50 py-2 sm:py-2.5 px-3 sm:px-4 rounded transition-colors text-xs sm:text-sm"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
            {isAuthenticated ? (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 px-2">
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 sm:py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 px-2">
                <button
                  onClick={() => {
                    handleLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 sm:py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
