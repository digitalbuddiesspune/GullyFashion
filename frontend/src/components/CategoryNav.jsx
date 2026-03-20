import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const CategoryNav = () => {
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState('');

  const categories = [
    { name: 'All Categories', path: '/' },
    { name: 'Crew Neck', path: '/category/crew-neck' },
    { name: 'V Neck', path: '/category/v-neck' },
    { name: 'Polo', path: '/category/polo' },
    { name: 'Henley', path: '/category/henley' },
    { name: 'Long Sleeve', path: '/category/long-sleeve' },
    { name: 'Oversized', path: '/category/oversized' },
    { name: 'Pocket Tee', path: '/category/pocket-tee' },
    { name: 'Tshirt', path: '/category/tshirts' },
  ];

  // Determine active category based on current path
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-1.5">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-2 md:gap-3 min-w-max md:min-w-0 md:flex-wrap">
            {categories.map((category) => {
              const active = isActive(category.path);
              return (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setActiveCategory(category.path)}
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0
                    ${
                      active
                        ? 'bg-yellow-400 text-black shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryNav;
