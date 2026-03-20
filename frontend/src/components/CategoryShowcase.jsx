import React from 'react';
import { Link } from 'react-router-dom';

const categories = [
  {
    id: 1,
    name: "Crew Neck",
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/crew-neck'
  },
  {
    id: 2,
    name: "V Neck",
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/v-neck'
  },
  {
    id: 3,
    name: 'Polo',
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/polo'
  },
  {
    id: 4,
    name: 'Henley',
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/henley'
  },
   {
    id: 5,
    name: 'Long Sleeve',
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/long-sleeve'
  },
   {
    id: 6,
    name: 'Oversized',
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/oversized'
  },
   {
    id: 7,
    name: 'Pocket Tee',
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/pocket-tee'
  },
   {
    id: 8,
    name: 'Tshirt',
    image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
    path: '/category/tshirts'
  }
];

const CategoryShowcase = () => {
  return (
    // Outer Container: White background, tight vertical padding
    <div className="py-12 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto">
        
        {/* Header: Centered, simple, capitalized text */}
        <h2 className="text-xl font-medium tracking-widest uppercase text-gray-900 text-center mb-10 sm:mb-12">
          CATEGORIES
        </h2>
        
        {/* 🚀 Grid Layout: Set to 4 columns (lg:grid-cols-4) and 2 columns on mobile (sm:grid-cols-2) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-6 sm:gap-y-10">
          {categories.map((category) => (
            <div key={category.id} className="group flex flex-col items-center text-center">
              <Link 
                to={category.path}
                className="block w-full"
              >
                {/* Image Container: Simple square, light gray background */}
                <div 
                    className="aspect-square bg-gray-100 overflow-hidden" 
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-300"
                  />
                </div>
              </Link>
              
              {/* Text: Centered, capitalized, standard text style, small margin top */}
              <div className="mt-3">
                <p className="text-xs font-medium tracking-wider uppercase text-gray-800">
                  {category.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryShowcase;