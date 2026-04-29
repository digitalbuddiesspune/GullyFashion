import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// FaHeart is used for the favorite icon seen in the top right of the cards
import { FaHeart, FaRegHeart, FaStar, FaChevronLeft, FaChevronRight, FaSpinner, FaShoppingCart, FaFire } from 'react-icons/fa'; 
import { fetchSarees } from '../services/api';
import { getCachedProducts, setCachedProducts } from '../utils/cache';
import { useCart } from '../context/CartContext';

const FeaturedProducts = ({ category = 'shirts', layout = 'scroll', maxProducts = 8 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();
  const isGridLayout = layout === 'grid';
  const { addToCart } = useCart();

  // Get cache key for this category
  const getCacheKey = () => {
    const cat = category || 'all';
    return `featured_products_cache_${cat}`;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        const items = JSON.parse(saved);
        // Extract product IDs if items are objects, or use as-is if array of IDs
        const ids = Array.isArray(items) ? items.map(item => typeof item === 'object' ? item._id : item).filter(Boolean) : [];
        setWishlist(ids);
      }
    } catch (e) {
      console.error('Error loading wishlist:', e);
    }
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setLoadedFromCache(false);

        // Check cache first
        const cacheKey = getCacheKey();
        const cachedProducts = await getCachedProducts(cacheKey);
        
        if (cachedProducts && cachedProducts.length > 0) {
          // Use cached data
          const productList = isGridLayout ? (cachedProducts || []).slice(0, maxProducts) : (cachedProducts || []);
          setProducts(productList);
          setLoadedFromCache(true);
          setLoading(false);
          
          // Hide cache message after 3 seconds
          setTimeout(() => setLoadedFromCache(false), 3000);
          return;
        }

        // No cache, fetch from API
        const response = await fetchSarees(category || '');
        
        // Handle both old format (array) and new format (object with products and pagination)
        let data = [];
        if (Array.isArray(response)) {
          data = response;
        } else if (response.products) {
          data = response.products;
        } else {
          data = response;
        }
        
        // Cache the products
        await setCachedProducts(cacheKey, data);
        
        // Limit products for grid layout, show all for scroll layout
        const productList = isGridLayout ? (data || []).slice(0, maxProducts) : (data || []);
        setProducts(productList);
      } catch (error) {
        console.error('Error fetching products:', error);
        // Try to use cache even if API fails
        const cacheKey = getCacheKey();
        const cachedProducts = await getCachedProducts(cacheKey);
        if (cachedProducts && cachedProducts.length > 0) {
          const productList = isGridLayout ? (cachedProducts || []).slice(0, maxProducts) : (cachedProducts || []);
          setProducts(productList);
          setLoadedFromCache(true);
          setTimeout(() => setLoadedFromCache(false), 3000);
        } else {
        setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [category, isGridLayout, maxProducts]);

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.querySelector('.product-card')?.offsetWidth || 280;
      const gap = 16; // gap-4 = 16px
      const scrollAmount = cardWidth + gap;
      const currentScroll = container.scrollLeft;
      
      let newScroll;
      if (direction === 'left') {
        newScroll = Math.max(0, currentScroll - scrollAmount);
      } else {
        const maxScroll = container.scrollWidth - container.clientWidth;
        newScroll = Math.min(maxScroll, currentScroll + scrollAmount);
      }
      
      container.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [products]);

  // Inject CSS to hide scrollbar for webkit browsers
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .featured-products-scroll::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleProductClick = (productId) => {
    if (productId) {
      navigate(`/product/${productId}`);
    }
  };

  const toggleWishlist = (productId, e) => {
    e.stopPropagation();
    try {
      const saved = localStorage.getItem('wishlist');
      let items = saved ? JSON.parse(saved) : [];
      
      // Check if product is already in wishlist (handle both ID arrays and object arrays)
      const isInWishlist = items.some(item => {
        if (typeof item === 'object') {
          return item._id === productId;
        }
        return item === productId;
      });
      
      if (isInWishlist) {
        items = items.filter(item => {
          if (typeof item === 'object') {
            return item._id !== productId;
          }
          return item !== productId;
        });
      } else {
        // Find the product to add full details
        const product = products.find(p => (p._id || p.id) === productId);
        if (product) {
          items.push({
            _id: productId,
            title: product.title || product.name,
            images: product.images,
            price: product.price || product.mrp || 0,
            mrp: product.mrp,
            discountPercent: product.discountPercent || 0,
          });
        } else {
          items.push(productId);
        }
      }
      
      localStorage.setItem('wishlist', JSON.stringify(items));
      const ids = items.map(item => typeof item === 'object' ? item._id : item).filter(Boolean);
      setWishlist(ids);
      
      // Dispatch event for other components
      try { 
        window.dispatchEvent(new Event('wishlist:updated')); 
      } catch {}
    } catch (e) {
      console.error('Error updating wishlist:', e);
    }
  };

  if (loading) {
    return (
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-20 text-gray-600">
            <FaSpinner className="w-6 h-6 animate-spin mr-3 text-amber-700" />
            <span className="text-lg">Loading products...</span>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  // Grid Layout (2 rows)
  if (isGridLayout) {
    return (
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Grid Container - 2 rows, responsive columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => {
              const productId = product._id || product.id;
              const finalPrice = Math.round((product.price || product.mrp || 0) * (1 - (product.discountPercent || 0) / 100));
              const originalPrice = product.mrp || product.price || 0;
              const hasDiscount = product.discountPercent > 0;
              const rating = 4.3; // Default rating, can be replaced with product.rating if available
              
              return (
              <div 
                key={productId} 
                className="group bg-white overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300 rounded-lg"
                onClick={() => {
                  if (productId) {
                    handleProductClick(productId);
                  }
                }}
              >
                {/* Image Container */}
                <div className="relative pt-[130%] rounded-t-lg overflow-hidden">
                  <img 
                    src={product.images?.image1 || product.image || 'https://via.placeholder.com/400x500?text=No+Image'} 
                    alt={product.title || product.name} 
                    className="absolute inset-0 w-full h-full object-cover" 
                  />
                  
                  {/* TRENDING Badge (Top Left) */}
                  <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 md:top-2 md:left-2 bg-black text-white px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5 z-10">
                    <FaFire className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                    <span className="leading-tight">TRENDING</span>
                  </div>
                  
                  {/* Heart Icon (Top Right) - Keep as is */}
                  <button 
                    onClick={(e) => toggleWishlist(productId, e)}
                    className="absolute top-2 right-2 md:top-3 md:right-3 bg-white rounded-full p-1.5 md:p-2 shadow-sm hover:shadow-md transition-all z-10 border border-gray-200"
                  >
                    {wishlist.includes(productId) ? (
                      <FaHeart className="text-red-500 w-3 h-3 md:w-4 md:h-4" />
                    ) : (
                      <FaRegHeart className="text-gray-700 w-3 h-3 md:w-4 md:h-4" />
                    )}
                  </button>
                  
                  {/* Rating Badge (Bottom Left) */}
                  <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded-full text-xs font-semibold text-gray-900 flex items-center gap-1 shadow-sm z-10">
                    <FaStar className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span>{rating}</span>
                  </div>
                  
                  {/* Shopping Cart Icon (Bottom Right) */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const productId = product._id || product.id;
                      if (productId) {
                        try {
                          await addToCart(product, 1, null);
                          // Optional: Show a success message or notification
                        } catch (error) {
                          console.error('Error adding to cart:', error);
                        }
                      }
                    }}
                    className="absolute bottom-2 right-2 bg-black text-white rounded-full p-2 shadow-md hover:bg-gray-800 transition-all z-10"
                  >
                    <FaShoppingCart className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
                
                {/* Text Details */}
                <div className="flex-1 flex flex-col text-left bg-white">
                  {/* Product Title */}
                  <h3 className="text-sm font-semibold text-gray-800 leading-tight mb-1 truncate">
                    {product.title || product.name}
                  </h3>
                  
                  {/* Price with Discount */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      ₹{finalPrice.toLocaleString()}
                    </span>
                    {hasDiscount && originalPrice > finalPrice && (
                      <span className="text-xs text-gray-500 line-through">
                        ₹{originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
          
          {/* EXPLORE ALL LOOKS Button - Hidden for perfumes and shoes categories */}
          {category !== 'perfumes' && category !== 'Shoes' && category !== 'shoes' && (
          <div className="flex justify-center mt-8 mb-4">
            <Link
              to="/category/crew-neck"
              className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wide transition-all duration-300 transform hover:scale-105"
            >
              EXPLORE ALL LOOKS
            </Link>
          </div>
          )}
        </div>
      </section>
    );
  }

  // Horizontal Scroll Layout (default)
  return (
    // Section matches the main background of the image (usually white)
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Left Navigation Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
            aria-label="Scroll left"
          >
            <FaChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Horizontal Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="featured-products-scroll flex gap-4 overflow-x-auto scroll-smooth pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory'
          }}
          onScroll={checkScrollability}
        >
          {products.map((product) => (
            // Card: No shadow, white background, overflow hidden
            <div 
              key={product._id || product.id} 
              className="product-card group bg-white overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300 flex-shrink-0 w-[280px] md:w-[300px] rounded-lg"
              style={{ scrollSnapAlign: 'start' }}
              onClick={() => {
                const productId = product._id || product.id;
                if (productId) {
                  handleProductClick(productId);
                }
              }}
            >
              
              {/* Image Container */}
              <div className="relative pt-[130%] rounded-t-lg overflow-hidden">
                <img 
                  src={product.images?.image1 || product.image || 'https://via.placeholder.com/400x500?text=No+Image'} 
                  alt={product.title || product.name} 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
                
                {/* Heart Icon (Top Right) */}
                <button 
                  onClick={(e) => toggleWishlist(product._id || product.id, e)}
                  className="absolute top-2 right-2 md:top-3 md:right-3 bg-white rounded-full p-1 md:p-2 shadow-sm hover:shadow-md transition-all z-10"
                >
                  {wishlist.includes(product._id || product.id) ? (
                    <FaHeart className="text-red-500 w-3 h-3 md:w-4 md:h-4" />
                  ) : (
                    <FaRegHeart className="text-gray-700 w-3 h-3 md:w-4 md:h-4" />
                  )}
                </button>
              </div>
              
              {/* Text Details (matches simple layout below image) */}
              <div className="flex-1 flex flex-col text-left">
                {/* Product Name - bold, slightly smaller */}
                <h3 className="text-sm font-semibold text-gray-800 leading-tight mb-1 truncate">
                  {product.title || product.name}
                </h3>
                
                {/* Price - dark, bold, slightly smaller than name */}
                <div className="text-sm font-bold text-gray-900">
                  ₹ {Math.round((product.price || product.mrp || 0) * (1 - (product.discountPercent || 0) / 100)).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Navigation Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
            aria-label="Scroll right"
          >
            <FaChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;