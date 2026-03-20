import React from 'react';
import { Link } from 'react-router-dom';

const Collection = () => {
  const categories = [
    {
      id: 1,
      name: "Crew Neck",
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768376336/4e7aba40995ac5e9dc35daaf26b76220_lq6uip.jpg',
      path: '/category/crew-neck'
    },
    {
      id: 2,
      name: "V Neck",
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768376888/15cca942-1f95-4406-bf62-d20c5dda6114.png',
      path: '/category/v-neck'
    },
    {
      id: 3,
      name: 'Polo',
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768377096/ed2ff93a-e0ee-4de3-aae3-03d0e5212693.png',
      path: '/category/polo'
    },
    {
      id: 4,
      name: 'Henley',
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768377277/822a1b4b1a5863b8d99a91bed9f67a38_qsgsdz.jpg',
      path: '/category/henley'
    },
    {
      id: 5,
      name: 'Long Sleeve',
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768377863/3d6055a6e75a43c48cb44afbee99c1a4_p4rsmx.jpg',
      path: '/category/long-sleeve'
    },
    {
      id: 6,
      name: 'Oversized',
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768377992/b86023dc4d82ff7be9c532b236321f06_iyul2v.jpg',
      path: '/category/oversized'
    },
    {
      id: 7,
      name: 'Pocket Tee',
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1768378133/7ec5690e7a384368628b6d8e864f32e3_d1bnov.jpg',
      path: '/category/pocket-tee'
    },
    {
      id: 8,
      name: 'Tshirt',
      image: 'https://res.cloudinary.com/dvkxgrcbv/image/upload/v1765270201/2bc21bba-d836-46f0-81a0-6e045d2b07fd.png',
      path: '/category/tshirts'
    }
  ];

  return (
    <div className="min-h-screen bg-white pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Our Collection
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Explore our wide range of products
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 sm:gap-y-12">
          {categories.map((category) => (
            <div key={category.id} className="group flex flex-col items-center text-center">
              <Link 
                to={category.path}
                className="block w-full"
              >
                {/* Image Container */}
                <div className="aspect-square bg-gray-100 overflow-hidden rounded-lg mb-4 transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300x300?text=Category';
                    }}
                  />
                </div>
              </Link>
              
              {/* Category Name */}
              <div>
                <p className="text-sm font-medium tracking-wide uppercase text-gray-800 group-hover:text-black transition-colors">
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

export default Collection;
