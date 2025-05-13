import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { registerJsonValidationProvider } from './json/validation';
import { JsonStatusItem } from './json/StatusItem';
import { JsonOptionsMenu } from './json/JsonOptionsMenu';
import * as monaco from 'monaco-editor';

// Lazy-loaded faker instance
let fakerInstance: any = null;

// Themes for JSON generation
type JsonTheme = 
  | 'user'
  | 'product'
  | 'blog'
  | 'weather'
  | 'event'
  | 'restaurant';

const themes: JsonTheme[] = [
  'user',
  'product',
  'blog',
  'weather',
  'event',
  'restaurant'
];

// Async function to load faker
async function loadFaker() {
  if (fakerInstance) return fakerInstance;
  
  try {
    const { faker } = await import('@faker-js/faker');
    fakerInstance = faker;
    return faker;
  } catch (error) {
    console.error('Failed to load faker:', error);
    throw new Error('Failed to load faker library');
  }
}

// Generate a random number within a range
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random array of items
async function generateArray(
  itemGenerator: () => Promise<any>, 
  minLength = 3, 
  maxLength = 7
): Promise<any[]> {
  const length = randomInt(minLength, maxLength);
  const result = [];
  
  for (let i = 0; i < length; i++) {
    result.push(await itemGenerator());
  }
  
  return result;
}

// Generate a random theme-based JSON object
async function generateThemeBasedJson(): Promise<string> {
  const faker = await loadFaker();
  const theme = themes[randomInt(0, themes.length - 1)];
  
  switch (theme) {
    case 'user':
      return generateUserProfiles(faker);
    case 'product':
      return generateProductCatalog(faker);
    case 'blog':
      return generateBlogPosts(faker);
    case 'weather':
      return generateWeatherForecast(faker);
    case 'event':
      return generateEventSchedule(faker);
    case 'restaurant':
      return generateRestaurantMenu(faker);
    default:
      return generateUserProfiles(faker);
  }
}

// Generate user profiles JSON
async function generateUserProfiles(faker: any): Promise<string> {
  const users = await generateArray(async () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      id: faker.string.uuid(),
      name: {
        first: firstName,
        last: lastName,
        full: `${firstName} ${lastName}`
      },
      email: faker.internet.email({ firstName, lastName }),
      avatar: faker.image.avatar(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode()
      },
      phone: faker.phone.number(),
      company: {
        name: faker.company.name(),
        position: faker.person.jobTitle(),
        department: faker.person.jobArea()
      },
      subscription: {
        plan: faker.helpers.arrayElement(['free', 'basic', 'premium', 'enterprise']),
        status: faker.helpers.arrayElement(['active', 'pending', 'canceled']),
        startDate: faker.date.past().toISOString(),
        endDate: faker.date.future().toISOString()
      },
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
        notifications: faker.datatype.boolean(),
        newsletter: faker.datatype.boolean()
      },
      metadata: {
        lastLogin: faker.date.recent().toISOString(),
        registeredAt: faker.date.past().toISOString(),
        loginCount: faker.number.int({ min: 1, max: 100 })
      }
    };
  });

  return JSON.stringify({
    users,
    total: users.length,
    page: 1,
    limit: users.length,
    timestamp: new Date().toISOString()
  }, null, 2);
}

// Generate product catalog JSON
async function generateProductCatalog(faker: any): Promise<string> {
  const categories = await generateArray(async () => {
    const categoryName = faker.commerce.department();
    
    const products = await generateArray(async () => {
      const productName = faker.commerce.productName();
      return {
        id: faker.string.uuid(),
        name: productName,
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price()),
        currency: faker.finance.currencyCode(),
        sku: faker.string.alphanumeric(8).toUpperCase(),
        inStock: faker.datatype.boolean(),
        attributes: {
          color: faker.color.human(),
          weight: `${faker.number.float({ min: 0.1, max: 10, precision: 0.1 })} kg`,
          dimensions: {
            width: `${faker.number.int({ min: 5, max: 50 })} cm`,
            height: `${faker.number.int({ min: 5, max: 50 })} cm`,
            depth: `${faker.number.int({ min: 5, max: 50 })} cm`
          }
        },
        images: await generateArray(async () => faker.image.url(), 2, 4),
        ratings: {
          average: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
          count: faker.number.int({ min: 0, max: 500 })
        },
        tags: faker.helpers.arrayElements(
          [
            'new', 'sale', 'popular', 'limited', 'exclusive', 
            'eco-friendly', 'handmade', 'organic', 'vegan'
          ], 
          { min: 1, max: 3 }
        )
      };
    });
    
    return {
      id: faker.string.uuid(),
      name: categoryName,
      slug: faker.helpers.slugify(categoryName).toLowerCase(),
      products,
      image: faker.image.url()
    };
  });

  return JSON.stringify({
    store: {
      name: faker.company.name(),
      website: faker.internet.url(),
      categories
    },
    metadata: {
      totalProducts: categories.reduce((sum, category) => sum + category.products.length, 0),
      lastUpdated: new Date().toISOString()
    }
  }, null, 2);
}

// Generate blog posts JSON
async function generateBlogPosts(faker: any): Promise<string> {
  const authors = await generateArray(async () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      id: faker.string.uuid(),
      name: `${firstName} ${lastName}`,
      avatar: faker.image.avatar(),
      bio: faker.person.bio(),
      social: {
        twitter: `@${firstName.toLowerCase()}${faker.number.int(999)}`,
        website: faker.internet.url()
      }
    };
  }, 2, 5);
  
  const posts = await generateArray(async () => {
    const title = faker.lorem.sentence();
    const authorIndex = randomInt(0, authors.length - 1);
    
    const comments = await generateArray(async () => {
      return {
        id: faker.string.uuid(),
        author: {
          name: faker.person.fullName(),
          email: faker.internet.email()
        },
        content: faker.lorem.paragraph(),
        createdAt: faker.date.recent().toISOString(),
        likes: faker.number.int({ min: 0, max: 50 })
      };
    }, 0, 5);
    
    return {
      id: faker.string.uuid(),
      title,
      slug: faker.helpers.slugify(title).toLowerCase(),
      excerpt: faker.lorem.paragraph(),
      content: faker.lorem.paragraphs(5),
      featuredImage: faker.image.url(),
      author: authors[authorIndex],
      categories: faker.helpers.arrayElements(
        ['Technology', 'Health', 'Business', 'Travel', 'Food', 'Science', 'Art', 'Sports'],
        { min: 1, max: 3 }
      ),
      tags: faker.helpers.arrayElements(
        ['trending', 'featured', 'popular', 'recommended', 'editor-choice'],
        { min: 0, max: 2 }
      ),
      publishedAt: faker.date.past().toISOString(),
      status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
      comments,
      stats: {
        views: faker.number.int({ min: 10, max: 10000 }),
        likes: faker.number.int({ min: 0, max: 500 }),
        shares: faker.number.int({ min: 0, max: 100 })
      }
    };
  });

  return JSON.stringify({
    blog: {
      name: faker.company.name() + " Blog",
      description: faker.company.catchPhrase(),
      url: faker.internet.url(),
      posts,
      authors
    },
    metadata: {
      totalPosts: posts.length,
      lastUpdated: new Date().toISOString()
    }
  }, null, 2);
}

// Generate weather forecast JSON
async function generateWeatherForecast(faker: any): Promise<string> {
  const city = faker.location.city();
  const country = faker.location.country();
  
  const forecast = await generateArray(async () => {
    const date = new Date();
    date.setDate(date.getDate() + randomInt(0, 6));
    
    const hourlyForecasts = await generateArray(async () => {
      const hour = randomInt(0, 23);
      return {
        time: `${hour.toString().padStart(2, '0')}:00`,
        temperature: faker.number.float({ min: -10, max: 40, precision: 0.1 }),
        feelsLike: faker.number.float({ min: -15, max: 45, precision: 0.1 }),
        humidity: faker.number.int({ min: 0, max: 100 }),
        windSpeed: faker.number.float({ min: 0, max: 30, precision: 0.1 }),
        windDirection: faker.helpers.arrayElement(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
        precipitation: faker.number.float({ min: 0, max: 100, precision: 0.1 }),
        condition: faker.helpers.arrayElement([
          'Clear', 'Partly Cloudy', 'Cloudy', 'Overcast', 
          'Rain', 'Thunderstorm', 'Snow', 'Fog', 'Drizzle'
        ]),
        icon: faker.helpers.arrayElement([
          'clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night',
          'cloudy', 'rain', 'sleet', 'snow', 'wind', 'fog'
        ])
      };
    }, 4, 8);
    
    return {
      date: date.toISOString().split('T')[0],
      summary: faker.lorem.sentence(),
      temperatureHigh: faker.number.float({ min: 0, max: 40, precision: 0.1 }),
      temperatureLow: faker.number.float({ min: -10, max: 30, precision: 0.1 }),
      sunrise: `0${randomInt(5, 7)}:${randomInt(0, 59).toString().padStart(2, '0')}`,
      sunset: `${randomInt(17, 21)}:${randomInt(0, 59).toString().padStart(2, '0')}`,
      condition: faker.helpers.arrayElement([
        'Clear', 'Partly Cloudy', 'Cloudy', 'Overcast', 
        'Rain', 'Thunderstorm', 'Snow', 'Fog', 'Drizzle'
      ]),
      chanceOfRain: faker.number.int({ min: 0, max: 100 }),
      hourly: hourlyForecasts
    };
  });

  return JSON.stringify({
    location: {
      city,
      country,
      coordinates: {
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude()
      },
      timezone: faker.location.timeZone()
    },
    current: {
      temperature: faker.number.float({ min: -10, max: 40, precision: 0.1 }),
      feelsLike: faker.number.float({ min: -15, max: 45, precision: 0.1 }),
      humidity: faker.number.int({ min: 0, max: 100 }),
      windSpeed: faker.number.float({ min: 0, max: 30, precision: 0.1 }),
      windDirection: faker.helpers.arrayElement(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
      pressure: faker.number.int({ min: 970, max: 1040 }),
      uvIndex: faker.number.int({ min: 0, max: 11 }),
      visibility: faker.number.float({ min: 0, max: 10, precision: 0.1 }),
      condition: faker.helpers.arrayElement([
        'Clear', 'Partly Cloudy', 'Cloudy', 'Overcast', 
        'Rain', 'Thunderstorm', 'Snow', 'Fog', 'Drizzle'
      ]),
      icon: faker.helpers.arrayElement([
        'clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night',
        'cloudy', 'rain', 'sleet', 'snow', 'wind', 'fog'
      ])
    },
    forecast,
    alerts: await generateArray(async () => {
      return {
        id: faker.string.uuid(),
        title: faker.helpers.arrayElement([
          'Severe Thunderstorm Warning',
          'Flood Watch',
          'High Wind Advisory',
          'Heat Advisory',
          'Winter Storm Warning',
          'Tornado Watch'
        ]),
        description: faker.lorem.paragraph(),
        severity: faker.helpers.arrayElement(['minor', 'moderate', 'severe', 'extreme']),
        time: {
          issued: faker.date.recent().toISOString(),
          expires: faker.date.soon().toISOString()
        }
      };
    }, 0, 2),
    units: {
      temperature: 'celsius',
      windSpeed: 'km/h',
      pressure: 'hPa',
      distance: 'km'
    },
    attribution: {
      source: "Weather API Example",
      license: "CC BY 4.0"
    }
  }, null, 2);
}

// Generate event schedule JSON
async function generateEventSchedule(faker: any): Promise<string> {
  const eventName = faker.company.name() + " " + faker.helpers.arrayElement([
    'Conference', 'Summit', 'Expo', 'Festival', 'Convention'
  ]);
  
  const startDate = faker.date.soon();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + randomInt(1, 5));
  
  const venues = await generateArray(async () => {
    return {
      id: faker.string.uuid(),
      name: faker.company.name() + " " + faker.helpers.arrayElement([
        'Center', 'Hall', 'Arena', 'Stadium', 'Theater', 'Auditorium'
      ]),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country()
      },
      capacity: faker.number.int({ min: 50, max: 5000 }),
      facilities: faker.helpers.arrayElements(
        ['Wi-Fi', 'Parking', 'Accessibility', 'Food Court', 'Restrooms', 'Charging Stations'],
        { min: 2, max: 6 }
      )
    };
  }, 1, 3);
  
  const speakers = await generateArray(async () => {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      title: faker.person.jobTitle(),
      company: faker.company.name(),
      bio: faker.lorem.paragraph(),
      image: faker.image.avatar(),
      social: {
        twitter: `@${faker.internet.username()}`,
        linkedin: `linkedin.com/in/${faker.internet.username()}`
      }
    };
  }, 5, 12);
  
  const tracks = await generateArray(async () => {
    const trackName = faker.helpers.arrayElement([
      'Main Track', 'Technical', 'Business', 'Design', 'Marketing', 
      'Development', 'Research', 'Innovation', 'Leadership'
    ]);
    
    const sessions = await generateArray(async () => {
      const sessionSpeakers = faker.helpers.arrayElements(
        speakers,
        { min: 1, max: 3 }
      );
      
      const sessionDate = new Date(startDate);
      sessionDate.setDate(sessionDate.getDate() + randomInt(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
      
      const startHour = randomInt(8, 17);
      const durationMinutes = faker.helpers.arrayElement([30, 45, 60, 90]);
      
      const sessionStart = new Date(sessionDate);
      sessionStart.setHours(startHour, 0, 0);
      
      const sessionEnd = new Date(sessionStart);
      sessionEnd.setMinutes(sessionStart.getMinutes() + durationMinutes);
      
      return {
        id: faker.string.uuid(),
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        speakers: sessionSpeakers.map((speaker: any) => ({
          id: speaker.id,
          name: speaker.name
        })),
        time: {
          start: sessionStart.toISOString(),
          end: sessionEnd.toISOString(),
          duration: `${durationMinutes} minutes`
        },
        venue: faker.helpers.arrayElement(venues),
        type: faker.helpers.arrayElement(['talk', 'workshop', 'panel', 'keynote']),
        tags: faker.helpers.arrayElements(
          ['beginner', 'intermediate', 'advanced', 'technical', 'business', 'case-study'],
          { min: 1, max: 3 }
        ),
        capacity: faker.number.int({ min: 20, max: 500 }),
        registrations: faker.number.int({ min: 0, max: 500 })
      };
    }, 3, 8);
    
    return {
      id: faker.string.uuid(),
      name: trackName,
      description: faker.lorem.sentence(),
      sessions,
      color: faker.color.rgb()
    };
  }, 2, 4);

  return JSON.stringify({
    event: {
      id: faker.string.uuid(),
      name: eventName,
      description: faker.lorem.paragraph(),
      website: faker.internet.url(),
      dates: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      location: {
        city: faker.location.city(),
        country: faker.location.country()
      },
      organizer: {
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number()
      },
      social: {
        twitter: `@${faker.internet.username()}`,
        facebook: `facebook.com/${faker.internet.username()}`,
        instagram: `instagram.com/${faker.internet.username()}`
      }
    },
    venues,
    speakers,
    schedule: {
      tracks
    },
    registration: {
      url: faker.internet.url(),
      deadline: faker.date.soon().toISOString(),
      fees: {
        early: faker.commerce.price({ min: 99, max: 299 }),
        regular: faker.commerce.price({ min: 199, max: 499 }),
        late: faker.commerce.price({ min: 299, max: 699 })
      }
    }
  }, null, 2);
}

// Generate restaurant menu JSON
async function generateRestaurantMenu(faker: any): Promise<string> {
  const cuisineType = faker.helpers.arrayElement([
    'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 
    'French', 'Thai', 'Mediterranean', 'American', 'Greek'
  ]);
  
  const restaurantName = faker.company.name() + " " + faker.helpers.arrayElement([
    'Restaurant', 'Bistro', 'Café', 'Eatery', 'Kitchen', 'Grill', 'Diner'
  ]);
  
  const categories = await generateArray(async () => {
    const categoryName = faker.helpers.arrayElement([
      'Appetizers', 'Soups', 'Salads', 'Main Courses', 'Pasta', 
      'Seafood', 'Steaks', 'Burgers', 'Sandwiches', 'Desserts', 
      'Beverages', 'Sides', 'Specials', 'Breakfast', 'Kids Menu'
    ]);
    
    const items = await generateArray(async () => {
      const isVegetarian = faker.datatype.boolean(0.3);
      const isVegan = isVegetarian && faker.datatype.boolean(0.5);
      const isGlutenFree = faker.datatype.boolean(0.2);
      
      const dietaryTags = [];
      if (isVegetarian) dietaryTags.push('vegetarian');
      if (isVegan) dietaryTags.push('vegan');
      if (isGlutenFree) dietaryTags.push('gluten-free');
      
      const spiceLevels = ['mild', 'medium', 'hot', 'extra hot'];
      
      return {
        id: faker.string.uuid(),
        name: faker.lorem.words(randomInt(2, 4)),
        description: faker.lorem.sentence(),
        price: parseFloat(faker.commerce.price({ min: 5, max: 30 })),
        image: faker.image.urlLoremFlickr({ category: 'food' }),
        ingredients: faker.helpers.arrayElements(
          [
            'tomato', 'cheese', 'lettuce', 'onion', 'garlic', 'chicken', 
            'beef', 'pork', 'fish', 'shrimp', 'rice', 'pasta', 'potato',
            'carrot', 'broccoli', 'spinach', 'mushroom', 'bell pepper',
            'olive oil', 'butter', 'cream', 'flour', 'sugar', 'salt'
          ],
          { min: 3, max: 8 }
        ),
        dietary: dietaryTags,
        spiceLevel: dietaryTags.length > 0 ? 
          faker.helpers.arrayElement(spiceLevels) : 
          undefined,
        calories: faker.number.int({ min: 100, max: 1200 }),
        prepTime: `${randomInt(5, 30)} minutes`,
        popular: faker.datatype.boolean(0.2)
      };
    }, 4, 10);
    
    return {
      id: faker.string.uuid(),
      name: categoryName,
      description: faker.lorem.sentence(),
      items
    };
  }, 3, 6);

  return JSON.stringify({
    restaurant: {
      id: faker.string.uuid(),
      name: restaurantName,
      cuisine: cuisineType,
      description: faker.lorem.paragraph(),
      established: faker.date.past().getFullYear(),
      location: {
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
        coordinates: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude()
        }
      },
      contact: {
        phone: faker.phone.number(),
        email: faker.internet.email(),
        website: faker.internet.url()
      },
      hours: {
        monday: faker.helpers.arrayElement(['Closed', '11:00 AM - 10:00 PM']),
        tuesday: '11:00 AM - 10:00 PM',
        wednesday: '11:00 AM - 10:00 PM',
        thursday: '11:00 AM - 10:00 PM',
        friday: '11:00 AM - 11:00 PM',
        saturday: '10:00 AM - 11:00 PM',
        sunday: faker.helpers.arrayElement(['Closed', '10:00 AM - 9:00 PM'])
      },
      rating: {
        average: faker.number.float({ min: 3.0, max: 5.0, precision: 0.1 }),
        count: faker.number.int({ min: 10, max: 1000 })
      },
      features: faker.helpers.arrayElements(
        [
          'Takeout', 'Delivery', 'Outdoor Seating', 'Reservations', 
          'Wheelchair Accessible', 'Full Bar', 'Wine List', 'Private Dining',
          'Live Music', 'Catering', 'Happy Hour', 'Family-Friendly'
        ],
        { min: 3, max: 8 }
      )
    },
    menu: {
      categories,
      specials: await generateArray(async () => {
        return {
          id: faker.string.uuid(),
          name: faker.lorem.words(randomInt(2, 4)),
          description: faker.lorem.sentence(),
          price: parseFloat(faker.commerce.price({ min: 10, max: 40 })),
          available: {
            from: faker.date.recent().toISOString(),
            to: faker.date.soon().toISOString()
          }
        };
      }, 0, 3)
    },
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: "1.0"
    }
  }, null, 2);
}

/**
 * JSON language detector
 */
export class JsonLanguageDetector extends BaseLanguageDetector {
  id = 'json';
  name = 'JSON';
  extensions = ['json'];
  priority = 5; // Higher priority because JSON is unambiguous when valid
  
  // Added a property to store preloaded samples
  private preloadedSample: string | null = null;

  patterns = () => [
    /"[^"]*"\s*:/,                  // "key": pattern
    /\[\s*(?:"[^"]*"|[\d.]+|true|false|null|{)/,  // Array with valid JSON values
    /{\s*"[^"]*"\s*:/,              // Object with key
    /,\s*"[^"]*"\s*:/,              // Property separator pattern
    /"[^"]*"\s*:\s*(?:"[^"]*"|[\d.]+|true|false|null|\[|{)/  // Key-value pair with valid JSON value
  ];

  /**
   * Get sample content for JSON
   */
  sampleContent(): string {
    // Use preloaded sample if available
    if (this.preloadedSample) {
      const sample = this.preloadedSample;
      // Clear it so next time we'll get a fresh sample
      this.preloadedSample = null;
      // Start preloading the next sample
      this.preloadDynamicSample();
      return sample;
    }

    // If no preloaded sample, return a fallback and start preloading
    this.preloadDynamicSample();
    return `{
  "name": "Sample JSON",
  "description": "A sample JSON object with various data types",
  "isActive": true,
  "count": 42,
  "price": 19.99,
  "tags": ["sample", "json", "data"],
  "metadata": {
    "created": "${new Date().toISOString()}",
    "version": "1.0",
    "random": ${Math.random()}
  }
}`;
  }
  
  /**
   * Preload a dynamic sample in the background
   */
  async preloadDynamicSample(): Promise<void> {
    try {
      const dynamicJson = await generateThemeBasedJson();
      this.preloadedSample = dynamicJson;
    } catch (error) {
      console.error('Failed to preload dynamic JSON sample:', error);
    }
  }

/**
 * Check if content is valid JSON or matches JSON patterns
 * Works with both complete and partial content
 */
isMatch(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false; // Added empty check

  // Quick check for starting characters - Strong indicator
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
  }

  // If it looks complete, try parsing first (most reliable)
  if (this.looksLikeCompleteJson(trimmed)) {
      try {
          JSON.parse(trimmed);
          return true; // Valid JSON
      } catch {
          // Parsing failed, but it might still be partial JSON. Fall through.
      }
  }

  // --- NEW: Handle incomplete structures ---
  // If it starts with { or [ and isn't just the brace/bracket itself,
  // consider it a potential match, especially if other detectors fail.
  // This helps keep JSON selected while typing.
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 1) {
       // Check for things that are definitely NOT JSON within the first few lines
       const lines = content.split('\n').slice(0, 5); // Check first 5 lines
       const hasYamlIndicators = lines.some(line =>
          /^\s*-\s+\S/.test(line) || // Starts with `- `
          /^\s*[a-zA-Z_][a-zA-Z0-9_-]*\s*:/.test(line) // Starts with unquoted key:
       );
       if (!hasYamlIndicators) {
           // It starts like JSON and doesn't immediately contain obvious YAML block features
           return true; // Assume it's intended JSON for now
       }
  }
  // --- End NEW ---


  // Original pattern matching as a fallback (less critical now)
  return this.matchesJsonPatterns(content); // Keep this for slightly more complex partials
}

  
  /**
   * Check if content looks like it might be complete JSON
   * This helps avoid trying to parse obviously incomplete JSON
   */
  private looksLikeCompleteJson(content: string): boolean {
    const trimmed = content.trim();
    
    // Check if it starts with { or [ and ends with matching } or ]
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if content matches common JSON patterns
   * This works with partial content
   */
  private matchesJsonPatterns(content: string): boolean {
    const trimmed = content.trim();
    
    // Must start with { or [
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }
    
    // Count how many JSON patterns match
    const matchCount = this.patterns().reduce((count, pattern) => 
      count + (pattern.test(trimmed) ? 1 : 0), 0);
    
    // If at least 2 patterns match, consider it JSON
    return matchCount >= 2;
  }

  /**
   * Count Json-specific patterns (patterns that are unlikely to be in YAML)
   */
  countSpecificPatterns(content: string): number {
    return this.patterns().reduce((count, pattern) =>
        count + (pattern.test(content) ? 1 : 0), 0);
  }
  
  /**
   * Register JSON language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Register validation provider
    registerJsonValidationProvider(monaco);
  }

  /**
   * Get status item component for JSON
   */
  getStatusItem(): React.FC<{ content?: string }> {
    return JsonStatusItem;
  }

  /**
   * Get Options menu
   */
  getOptionsMenu(): any {
    return JsonOptionsMenu;
  }
}

// Create and register the detector
const jsonDetector = new JsonLanguageDetector();
languageRegistry.register(jsonDetector);

// Preload samples for future use
jsonDetector.preloadDynamicSample();

// Export for backward compatibility
export const registerJsonProvider = (monaco: any) => {
  jsonDetector.registerProvider(monaco);
};