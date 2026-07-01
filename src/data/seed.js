'use strict';

/**
 * In-memory seed data for restaurants and menus.
 * Each restaurant has lat/lng for geo-sorting via the Haversine formula.
 * Replace with real DB queries in production.
 */

const RESTAURANTS = [
  {
    id          : 'rst_001',
    name        : 'The Spice Garden',
    cuisine     : 'Indian',
    description : 'Authentic North Indian curries and tandoor specials.',
    rating      : 4.7,
    deliveryTime: 30,
    priceRange  : '$$',
    imageUrl    : 'https://cdn.example.com/spice-garden.jpg',
    address     : '12 Curry Lane, Mumbai, MH 400001',
    lat         : 19.0760,
    lng         : 72.8777,
    isOpen      : true,
  },
  {
    id          : 'rst_002',
    name        : 'Pizza Republic',
    cuisine     : 'Italian',
    description : 'Wood-fired pizzas with a New York twist.',
    rating      : 4.3,
    deliveryTime: 25,
    priceRange  : '$$',
    imageUrl    : 'https://cdn.example.com/pizza-republic.jpg',
    address     : '88 Margherita Blvd, Bangalore, KA 560001',
    lat         : 12.9716,
    lng         : 77.5946,
    isOpen      : true,
  },
  {
    id          : 'rst_003',
    name        : 'Dragon Palace',
    cuisine     : 'Chinese',
    description : 'Traditional dim sum and Sichuan specialties.',
    rating      : 4.5,
    deliveryTime: 35,
    priceRange  : '$$$',
    imageUrl    : 'https://cdn.example.com/dragon-palace.jpg',
    address     : '5 Dragon Road, Delhi, DL 110001',
    lat         : 28.6139,
    lng         : 77.2090,
    isOpen      : true,
  },
  {
    id          : 'rst_004',
    name        : 'Burger Barn',
    cuisine     : 'American',
    description : 'Smash burgers, loaded fries, and thick shakes.',
    rating      : 4.1,
    deliveryTime: 20,
    priceRange  : '$',
    imageUrl    : 'https://cdn.example.com/burger-barn.jpg',
    address     : '22 Freedom Street, Hyderabad, TS 500001',
    lat         : 17.3850,
    lng         : 78.4867,
    isOpen      : true,
  },
  {
    id          : 'rst_005',
    name        : 'Sakura Sushi',
    cuisine     : 'Japanese',
    description : 'Fresh nigiri, sashimi, and creative maki rolls.',
    rating      : 4.8,
    deliveryTime: 40,
    priceRange  : '$$$',
    imageUrl    : 'https://cdn.example.com/sakura-sushi.jpg',
    address     : '3 Zen Garden, Chennai, TN 600001',
    lat         : 13.0827,
    lng         : 80.2707,
    isOpen      : true,
  },
  {
    id          : 'rst_006',
    name        : 'Casa Mexicana',
    cuisine     : 'Mexican',
    description : 'Tacos, enchiladas, and frozen margaritas.',
    rating      : 4.2,
    deliveryTime: 30,
    priceRange  : '$$',
    imageUrl    : 'https://cdn.example.com/casa-mexicana.jpg',
    address     : '9 Fiesta Road, Pune, MH 411001',
    lat         : 18.5204,
    lng         : 73.8567,
    isOpen      : false,
  },
  {
    id          : 'rst_007',
    name        : 'Le Petit Bistro',
    cuisine     : 'French',
    description : 'Classic French cuisine — croissants, quiches, and crème brûlée.',
    rating      : 4.6,
    deliveryTime: 45,
    priceRange  : '$$$',
    imageUrl    : 'https://cdn.example.com/le-petit-bistro.jpg',
    address     : '1 Boulevard Avenue, Kolkata, WB 700001',
    lat         : 22.5726,
    lng         : 88.3639,
    isOpen      : true,
  },
  {
    id          : 'rst_008',
    name        : 'Green Bowl',
    cuisine     : 'Healthy',
    description : 'Superfood bowls, smoothies, and plant-based meals.',
    rating      : 4.4,
    deliveryTime: 20,
    priceRange  : '$$',
    imageUrl    : 'https://cdn.example.com/green-bowl.jpg',
    address     : '77 Wellness Walk, Ahmedabad, GJ 380001',
    lat         : 23.0225,
    lng         : 72.5714,
    isOpen      : true,
  },
  {
    id          : 'rst_009',
    name        : 'Seoul Kitchen',
    cuisine     : 'Korean',
    description : 'Korean BBQ, bibimbap, and street food.',
    rating      : 4.5,
    deliveryTime: 35,
    priceRange  : '$$',
    imageUrl    : 'https://cdn.example.com/seoul-kitchen.jpg',
    address     : '14 K-Pop Street, Jaipur, RJ 302001',
    lat         : 26.9124,
    lng         : 75.7873,
    isOpen      : true,
  },
  {
    id          : 'rst_010',
    name        : 'Mediterranean Breeze',
    cuisine     : 'Mediterranean',
    description : 'Hummus, falafel, kebabs, and freshly baked pita.',
    rating      : 4.3,
    deliveryTime: 30,
    priceRange  : '$$',
    imageUrl    : 'https://cdn.example.com/mediterranean-breeze.jpg',
    address     : '55 Olive Street, Surat, GJ 395001',
    lat         : 21.1702,
    lng         : 72.8311,
    isOpen      : true,
  },
];

const MENU_ITEMS = [
  // rst_001 — The Spice Garden
  { id: 'mnu_001', restaurantId: 'rst_001', name: 'Butter Chicken',       category: 'Main Course', price: 320, isVeg: false, description: 'Creamy tomato-based chicken curry.',          imageUrl: 'https://cdn.example.com/butter-chicken.jpg'  },
  { id: 'mnu_002', restaurantId: 'rst_001', name: 'Garlic Naan',          category: 'Bread',       price: 60,  isVeg: true,  description: 'Soft leavened bread with garlic butter.',    imageUrl: 'https://cdn.example.com/garlic-naan.jpg'     },
  { id: 'mnu_003', restaurantId: 'rst_001', name: 'Paneer Tikka',         category: 'Starter',     price: 280, isVeg: true,  description: 'Grilled cottage cheese with spices.',        imageUrl: 'https://cdn.example.com/paneer-tikka.jpg'    },
  { id: 'mnu_004', restaurantId: 'rst_001', name: 'Dal Makhani',          category: 'Main Course', price: 240, isVeg: true,  description: 'Slow-cooked black lentils.',                 imageUrl: 'https://cdn.example.com/dal-makhani.jpg'     },
  { id: 'mnu_005', restaurantId: 'rst_001', name: 'Gulab Jamun',          category: 'Dessert',     price: 120, isVeg: true,  description: 'Soft dumplings soaked in sugar syrup.',     imageUrl: 'https://cdn.example.com/gulab-jamun.jpg'     },

  // rst_002 — Pizza Republic
  { id: 'mnu_006', restaurantId: 'rst_002', name: 'Margherita Pizza',     category: 'Pizza',       price: 350, isVeg: true,  description: 'Classic tomato, mozzarella, and basil.',    imageUrl: 'https://cdn.example.com/margherita.jpg'      },
  { id: 'mnu_007', restaurantId: 'rst_002', name: 'BBQ Chicken Pizza',    category: 'Pizza',       price: 450, isVeg: false, description: 'Smoky BBQ sauce with grilled chicken.',     imageUrl: 'https://cdn.example.com/bbq-chicken-pizza.jpg' },
  { id: 'mnu_008', restaurantId: 'rst_002', name: 'Garlic Bread',         category: 'Sides',       price: 120, isVeg: true,  description: 'Toasted baguette with herb butter.',        imageUrl: 'https://cdn.example.com/garlic-bread.jpg'    },
  { id: 'mnu_009', restaurantId: 'rst_002', name: 'Caesar Salad',         category: 'Salad',       price: 220, isVeg: false, description: 'Romaine, croutons, parmesan, Caesar dressing.', imageUrl: 'https://cdn.example.com/caesar-salad.jpg' },
  { id: 'mnu_010', restaurantId: 'rst_002', name: 'Tiramisu',             category: 'Dessert',     price: 180, isVeg: true,  description: 'Classic Italian coffee dessert.',           imageUrl: 'https://cdn.example.com/tiramisu.jpg'        },

  // rst_003 — Dragon Palace
  { id: 'mnu_011', restaurantId: 'rst_003', name: 'Har Gow Dim Sum',      category: 'Dim Sum',     price: 260, isVeg: false, description: 'Steamed shrimp dumplings.',                 imageUrl: 'https://cdn.example.com/har-gow.jpg'         },
  { id: 'mnu_012', restaurantId: 'rst_003', name: 'Kung Pao Chicken',     category: 'Main Course', price: 380, isVeg: false, description: 'Spicy stir-fried chicken with peanuts.',    imageUrl: 'https://cdn.example.com/kung-pao.jpg'        },
  { id: 'mnu_013', restaurantId: 'rst_003', name: 'Vegetable Spring Rolls',category:'Starter',     price: 160, isVeg: true,  description: 'Crispy rolls with mixed vegetables.',       imageUrl: 'https://cdn.example.com/spring-rolls.jpg'    },
  { id: 'mnu_014', restaurantId: 'rst_003', name: 'Fried Rice',           category: 'Rice',        price: 220, isVeg: false, description: 'Wok-fried rice with eggs and vegetables.',  imageUrl: 'https://cdn.example.com/fried-rice.jpg'      },
  { id: 'mnu_015', restaurantId: 'rst_003', name: 'Mango Pudding',        category: 'Dessert',     price: 140, isVeg: true,  description: 'Chilled mango gelatin dessert.',            imageUrl: 'https://cdn.example.com/mango-pudding.jpg'   },

  // rst_004 — Burger Barn
  { id: 'mnu_016', restaurantId: 'rst_004', name: 'Classic Smash Burger', category: 'Burger',      price: 280, isVeg: false, description: 'Double smash patty with American cheese.',  imageUrl: 'https://cdn.example.com/smash-burger.jpg'    },
  { id: 'mnu_017', restaurantId: 'rst_004', name: 'Loaded Fries',         category: 'Sides',       price: 180, isVeg: true,  description: 'Fries topped with cheese sauce and jalapeños.', imageUrl: 'https://cdn.example.com/loaded-fries.jpg' },
  { id: 'mnu_018', restaurantId: 'rst_004', name: 'Veggie Burger',        category: 'Burger',      price: 240, isVeg: true,  description: 'Plant-based patty with fresh veggies.',    imageUrl: 'https://cdn.example.com/veggie-burger.jpg'   },
  { id: 'mnu_019', restaurantId: 'rst_004', name: 'Chocolate Shake',      category: 'Drinks',      price: 150, isVeg: true,  description: 'Thick creamy chocolate milkshake.',         imageUrl: 'https://cdn.example.com/choco-shake.jpg'     },
  { id: 'mnu_020', restaurantId: 'rst_004', name: 'Chicken Wings',        category: 'Starter',     price: 320, isVeg: false, description: 'Buffalo-style crispy chicken wings.',       imageUrl: 'https://cdn.example.com/chicken-wings.jpg'   },

  // rst_005 — Sakura Sushi
  { id: 'mnu_021', restaurantId: 'rst_005', name: 'Salmon Nigiri',        category: 'Nigiri',      price: 480, isVeg: false, description: 'Fresh Atlantic salmon over seasoned rice.', imageUrl: 'https://cdn.example.com/salmon-nigiri.jpg'   },
  { id: 'mnu_022', restaurantId: 'rst_005', name: 'Dragon Roll',          category: 'Maki',        price: 560, isVeg: false, description: 'Shrimp tempura, avocado, eel sauce.',       imageUrl: 'https://cdn.example.com/dragon-roll.jpg'     },
  { id: 'mnu_023', restaurantId: 'rst_005', name: 'Edamame',              category: 'Starter',     price: 120, isVeg: true,  description: 'Steamed salted edamame pods.',              imageUrl: 'https://cdn.example.com/edamame.jpg'         },
  { id: 'mnu_024', restaurantId: 'rst_005', name: 'Miso Soup',            category: 'Soup',        price: 100, isVeg: true,  description: 'Traditional Japanese miso with tofu.',     imageUrl: 'https://cdn.example.com/miso-soup.jpg'       },
  { id: 'mnu_025', restaurantId: 'rst_005', name: 'Matcha Ice Cream',     category: 'Dessert',     price: 160, isVeg: true,  description: 'Rich green tea flavored ice cream.',        imageUrl: 'https://cdn.example.com/matcha-ice-cream.jpg'},

  // rst_006 — Casa Mexicana
  { id: 'mnu_026', restaurantId: 'rst_006', name: 'Chicken Tacos',        category: 'Tacos',       price: 260, isVeg: false, description: 'Street-style tacos with grilled chicken.',  imageUrl: 'https://cdn.example.com/chicken-tacos.jpg'   },
  { id: 'mnu_027', restaurantId: 'rst_006', name: 'Veggie Burrito',       category: 'Burrito',     price: 300, isVeg: true,  description: 'Black beans, rice, salsa, and guacamole.',  imageUrl: 'https://cdn.example.com/veggie-burrito.jpg'  },
  { id: 'mnu_028', restaurantId: 'rst_006', name: 'Nachos',               category: 'Starter',     price: 200, isVeg: true,  description: 'Tortilla chips with cheese and pico de gallo.', imageUrl: 'https://cdn.example.com/nachos.jpg'       },
  { id: 'mnu_029', restaurantId: 'rst_006', name: 'Beef Enchiladas',      category: 'Main Course', price: 380, isVeg: false, description: 'Corn tortillas stuffed with beef and cheese.', imageUrl: 'https://cdn.example.com/beef-enchiladas.jpg' },
  { id: 'mnu_030', restaurantId: 'rst_006', name: 'Churros',              category: 'Dessert',     price: 140, isVeg: true,  description: 'Fried dough with cinnamon sugar and chocolate sauce.', imageUrl: 'https://cdn.example.com/churros.jpg' },

  // rst_007 — Le Petit Bistro
  { id: 'mnu_031', restaurantId: 'rst_007', name: 'Croissant',            category: 'Bakery',      price: 120, isVeg: true,  description: 'Buttery, flaky French croissant.',          imageUrl: 'https://cdn.example.com/croissant.jpg'       },
  { id: 'mnu_032', restaurantId: 'rst_007', name: 'French Onion Soup',    category: 'Soup',        price: 280, isVeg: true,  description: 'Caramelized onion broth topped with gruyère.', imageUrl: 'https://cdn.example.com/french-onion-soup.jpg' },
  { id: 'mnu_033', restaurantId: 'rst_007', name: 'Duck Confit',          category: 'Main Course', price: 680, isVeg: false, description: 'Slow-cooked duck leg with lentils.',        imageUrl: 'https://cdn.example.com/duck-confit.jpg'     },
  { id: 'mnu_034', restaurantId: 'rst_007', name: 'Quiche Lorraine',      category: 'Savory',      price: 320, isVeg: false, description: 'Pastry tart with bacon and cream.',         imageUrl: 'https://cdn.example.com/quiche-lorraine.jpg' },
  { id: 'mnu_035', restaurantId: 'rst_007', name: 'Crème Brûlée',        category: 'Dessert',     price: 220, isVeg: true,  description: 'Vanilla custard with caramelized sugar top.', imageUrl: 'https://cdn.example.com/creme-brulee.jpg'   },

  // rst_008 — Green Bowl
  { id: 'mnu_036', restaurantId: 'rst_008', name: 'Açaí Bowl',           category: 'Bowl',        price: 320, isVeg: true,  description: 'Açaí blend topped with granola and berries.', imageUrl: 'https://cdn.example.com/acai-bowl.jpg'      },
  { id: 'mnu_037', restaurantId: 'rst_008', name: 'Quinoa Salad',        category: 'Salad',       price: 280, isVeg: true,  description: 'Quinoa, chickpeas, cucumber, and lemon dressing.', imageUrl: 'https://cdn.example.com/quinoa-salad.jpg' },
  { id: 'mnu_038', restaurantId: 'rst_008', name: 'Green Detox Smoothie',category: 'Drinks',      price: 180, isVeg: true,  description: 'Spinach, banana, mango, and coconut water.', imageUrl: 'https://cdn.example.com/green-smoothie.jpg' },
  { id: 'mnu_039', restaurantId: 'rst_008', name: 'Avocado Toast',       category: 'Breakfast',   price: 220, isVeg: true,  description: 'Sourdough toast with smashed avocado and seeds.', imageUrl: 'https://cdn.example.com/avocado-toast.jpg' },
  { id: 'mnu_040', restaurantId: 'rst_008', name: 'Chia Pudding',        category: 'Dessert',     price: 160, isVeg: true,  description: 'Chia seeds soaked in almond milk with fruits.', imageUrl: 'https://cdn.example.com/chia-pudding.jpg'  },

  // rst_009 — Seoul Kitchen
  { id: 'mnu_041', restaurantId: 'rst_009', name: 'Korean BBQ Platter',  category: 'BBQ',         price: 780, isVeg: false, description: 'Assorted grilled meats with banchan.',      imageUrl: 'https://cdn.example.com/korean-bbq.jpg'      },
  { id: 'mnu_042', restaurantId: 'rst_009', name: 'Bibimbap',            category: 'Rice Bowl',   price: 340, isVeg: false, description: 'Mixed rice with vegetables, egg, and gochujang.', imageUrl: 'https://cdn.example.com/bibimbap.jpg'   },
  { id: 'mnu_043', restaurantId: 'rst_009', name: 'Tteokbokki',          category: 'Street Food', price: 220, isVeg: true,  description: 'Spicy rice cakes in gochujang sauce.',      imageUrl: 'https://cdn.example.com/tteokbokki.jpg'      },
  { id: 'mnu_044', restaurantId: 'rst_009', name: 'Japchae',             category: 'Noodles',     price: 280, isVeg: false, description: 'Glass noodles stir-fried with vegetables and beef.', imageUrl: 'https://cdn.example.com/japchae.jpg'    },
  { id: 'mnu_045', restaurantId: 'rst_009', name: 'Bingsu',              category: 'Dessert',     price: 200, isVeg: true,  description: 'Shaved ice with red bean and sweet toppings.', imageUrl: 'https://cdn.example.com/bingsu.jpg'        },

  // rst_010 — Mediterranean Breeze
  { id: 'mnu_046', restaurantId: 'rst_010', name: 'Hummus with Pita',    category: 'Starter',     price: 200, isVeg: true,  description: 'Creamy hummus served with warm pita bread.', imageUrl: 'https://cdn.example.com/hummus.jpg'          },
  { id: 'mnu_047', restaurantId: 'rst_010', name: 'Falafel Wrap',        category: 'Wraps',       price: 260, isVeg: true,  description: 'Crispy falafel with tahini and fresh veggies.', imageUrl: 'https://cdn.example.com/falafel-wrap.jpg'  },
  { id: 'mnu_048', restaurantId: 'rst_010', name: 'Lamb Kebab',          category: 'Grills',      price: 480, isVeg: false, description: 'Minced lamb skewers with Mediterranean spices.', imageUrl: 'https://cdn.example.com/lamb-kebab.jpg'   },
  { id: 'mnu_049', restaurantId: 'rst_010', name: 'Greek Salad',         category: 'Salad',       price: 240, isVeg: true,  description: 'Tomatoes, cucumbers, olives, and feta cheese.', imageUrl: 'https://cdn.example.com/greek-salad.jpg'  },
  { id: 'mnu_050', restaurantId: 'rst_010', name: 'Baklava',             category: 'Dessert',     price: 180, isVeg: true,  description: 'Layered filo pastry with honey and pistachios.', imageUrl: 'https://cdn.example.com/baklava.jpg'     },
];

module.exports = { RESTAURANTS, MENU_ITEMS };
