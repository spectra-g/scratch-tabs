import { DetectionResult, FormatModule  } from "./types"; // Ensure correct import
import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { registerJsonValidationProvider } from "./json/validation";
import { JsonStatusItem } from "./json/StatusItem";
import { JsonOptionsMenu } from "./json/JsonOptionsMenu";

// Lazy-loaded faker instance
let fakerInstance: any = null;

// Themes for JSON generation
type JsonTheme =
  | "user"
  | "product"
  | "blog"
  | "weather"
  | "event"
  | "restaurant";

const themes: JsonTheme[] = [
  "user",
  "product",
  "blog",
  "weather",
  "event",
  "restaurant",
];

// Async function to load faker
async function loadFaker() {
  if (fakerInstance) return fakerInstance;

  try {
    const { faker } = await import("@faker-js/faker");
    fakerInstance = faker;
    return faker;
  } catch (error) {
    console.error("Failed to load faker:", error);
    throw new Error("Failed to load faker library");
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
  maxLength = 7,
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
    case "user":
      return generateUserProfiles(faker);
    case "product":
      return generateProductCatalog(faker);
    case "blog":
      return generateBlogPosts(faker);
    case "weather":
      return generateWeatherForecast(faker);
    case "event":
      return generateEventSchedule(faker);
    case "restaurant":
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
        full: `${firstName} ${lastName}`,
      },
      email: faker.internet.email({ firstName, lastName }),
      avatar: faker.image.avatar(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode(),
      },
      phone: faker.phone.number(),
      company: {
        name: faker.company.name(),
        position: faker.person.jobTitle(),
        department: faker.person.jobArea(),
      },
      subscription: {
        plan: faker.helpers.arrayElement([
          "free",
          "basic",
          "premium",
          "enterprise",
        ]),
        status: faker.helpers.arrayElement(["active", "pending", "canceled"]),
        startDate: faker.date.past().toISOString(),
        endDate: faker.date.future().toISOString(),
      },
      preferences: {
        theme: faker.helpers.arrayElement(["light", "dark", "system"]),
        notifications: faker.datatype.boolean(),
        newsletter: faker.datatype.boolean(),
      },
      metadata: {
        lastLogin: faker.date.recent().toISOString(),
        registeredAt: faker.date.past().toISOString(),
        loginCount: faker.number.int({ min: 1, max: 100 }),
      },
    };
  });

  return JSON.stringify(
    {
      users,
      total: users.length,
      page: 1,
      limit: users.length,
      timestamp: new Date().toISOString(),
    },
    null,
    2,
  );
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
            depth: `${faker.number.int({ min: 5, max: 50 })} cm`,
          },
        },
        images: await generateArray(async () => faker.image.url(), 2, 4),
        ratings: {
          average: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
          count: faker.number.int({ min: 0, max: 500 }),
        },
        tags: faker.helpers.arrayElements(
          [
            "new",
            "sale",
            "popular",
            "limited",
            "exclusive",
            "eco-friendly",
            "handmade",
            "organic",
            "vegan",
          ],
          { min: 1, max: 3 },
        ),
      };
    });

    return {
      id: faker.string.uuid(),
      name: categoryName,
      slug: faker.helpers.slugify(categoryName).toLowerCase(),
      products,
      image: faker.image.url(),
    };
  });

  return JSON.stringify(
    {
      store: {
        name: faker.company.name(),
        website: faker.internet.url(),
        categories,
      },
      metadata: {
        totalProducts: categories.reduce(
          (sum, category) => sum + category.products.length,
          0,
        ),
        lastUpdated: new Date().toISOString(),
      },
    },
    null,
    2,
  );
}

// Generate blog posts JSON
async function generateBlogPosts(faker: any): Promise<string> {
  const authors = await generateArray(
    async () => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      return {
        id: faker.string.uuid(),
        name: `${firstName} ${lastName}`,
        avatar: faker.image.avatar(),
        bio: faker.person.bio(),
        social: {
          twitter: `@${firstName.toLowerCase()}${faker.number.int(999)}`,
          website: faker.internet.url(),
        },
      };
    },
    2,
    5,
  );

  const posts = await generateArray(async () => {
    const title = faker.lorem.sentence();
    const authorIndex = randomInt(0, authors.length - 1);

    const comments = await generateArray(
      async () => {
        return {
          id: faker.string.uuid(),
          author: {
            name: faker.person.fullName(),
            email: faker.internet.email(),
          },
          content: faker.lorem.paragraph(),
          createdAt: faker.date.recent().toISOString(),
          likes: faker.number.int({ min: 0, max: 50 }),
        };
      },
      0,
      5,
    );

    return {
      id: faker.string.uuid(),
      title,
      slug: faker.helpers.slugify(title).toLowerCase(),
      excerpt: faker.lorem.paragraph(),
      content: faker.lorem.paragraphs(5),
      featuredImage: faker.image.url(),
      author: authors[authorIndex],
      categories: faker.helpers.arrayElements(
        [
          "Technology",
          "Health",
          "Business",
          "Travel",
          "Food",
          "Science",
          "Art",
          "Sports",
        ],
        { min: 1, max: 3 },
      ),
      tags: faker.helpers.arrayElements(
        ["trending", "featured", "popular", "recommended", "editor-choice"],
        { min: 0, max: 2 },
      ),
      publishedAt: faker.date.past().toISOString(),
      status: faker.helpers.arrayElement(["draft", "published", "archived"]),
      comments,
      stats: {
        views: faker.number.int({ min: 10, max: 10000 }),
        likes: faker.number.int({ min: 0, max: 500 }),
        shares: faker.number.int({ min: 0, max: 100 }),
      },
    };
  });

  return JSON.stringify(
    {
      blog: {
        name: faker.company.name() + " Blog",
        description: faker.company.catchPhrase(),
        url: faker.internet.url(),
        posts,
        authors,
      },
      metadata: {
        totalPosts: posts.length,
        lastUpdated: new Date().toISOString(),
      },
    },
    null,
    2,
  );
}

// Generate weather forecast JSON
async function generateWeatherForecast(faker: any): Promise<string> {
  const city = faker.location.city();
  const country = faker.location.country();

  const forecast = await generateArray(async () => {
    const date = new Date();
    date.setDate(date.getDate() + randomInt(0, 6));

    const hourlyForecasts = await generateArray(
      async () => {
        const hour = randomInt(0, 23);
        return {
          time: `${hour.toString().padStart(2, "0")}:00`,
          temperature: faker.number.float({
            min: -10,
            max: 40,
            precision: 0.1,
          }),
          feelsLike: faker.number.float({ min: -15, max: 45, precision: 0.1 }),
          humidity: faker.number.int({ min: 0, max: 100 }),
          windSpeed: faker.number.float({ min: 0, max: 30, precision: 0.1 }),
          windDirection: faker.helpers.arrayElement([
            "N",
            "NE",
            "E",
            "SE",
            "S",
            "SW",
            "W",
            "NW",
          ]),
          precipitation: faker.number.float({
            min: 0,
            max: 100,
            precision: 0.1,
          }),
          condition: faker.helpers.arrayElement([
            "Clear",
            "Partly Cloudy",
            "Cloudy",
            "Overcast",
            "Rain",
            "Thunderstorm",
            "Snow",
            "Fog",
            "Drizzle",
          ]),
          icon: faker.helpers.arrayElement([
            "clear-day",
            "clear-night",
            "partly-cloudy-day",
            "partly-cloudy-night",
            "cloudy",
            "rain",
            "sleet",
            "snow",
            "wind",
            "fog",
          ]),
        };
      },
      4,
      8,
    );

    return {
      date: date.toISOString().split("T")[0],
      summary: faker.lorem.sentence(),
      temperatureHigh: faker.number.float({ min: 0, max: 40, precision: 0.1 }),
      temperatureLow: faker.number.float({ min: -10, max: 30, precision: 0.1 }),
      sunrise: `0${randomInt(5, 7)}:${randomInt(0, 59).toString().padStart(2, "0")}`,
      sunset: `${randomInt(17, 21)}:${randomInt(0, 59).toString().padStart(2, "0")}`,
      condition: faker.helpers.arrayElement([
        "Clear",
        "Partly Cloudy",
        "Cloudy",
        "Overcast",
        "Rain",
        "Thunderstorm",
        "Snow",
        "Fog",
        "Drizzle",
      ]),
      chanceOfRain: faker.number.int({ min: 0, max: 100 }),
      hourly: hourlyForecasts,
    };
  });

  return JSON.stringify(
    {
      location: {
        city,
        country,
        coordinates: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
        },
        timezone: faker.location.timeZone(),
      },
      current: {
        temperature: faker.number.float({ min: -10, max: 40, precision: 0.1 }),
        feelsLike: faker.number.float({ min: -15, max: 45, precision: 0.1 }),
        humidity: faker.number.int({ min: 0, max: 100 }),
        windSpeed: faker.number.float({ min: 0, max: 30, precision: 0.1 }),
        windDirection: faker.helpers.arrayElement([
          "N",
          "NE",
          "E",
          "SE",
          "S",
          "SW",
          "W",
          "NW",
        ]),
        pressure: faker.number.int({ min: 970, max: 1040 }),
        uvIndex: faker.number.int({ min: 0, max: 11 }),
        visibility: faker.number.float({ min: 0, max: 10, precision: 0.1 }),
        condition: faker.helpers.arrayElement([
          "Clear",
          "Partly Cloudy",
          "Cloudy",
          "Overcast",
          "Rain",
          "Thunderstorm",
          "Snow",
          "Fog",
          "Drizzle",
        ]),
        icon: faker.helpers.arrayElement([
          "clear-day",
          "clear-night",
          "partly-cloudy-day",
          "partly-cloudy-night",
          "cloudy",
          "rain",
          "sleet",
          "snow",
          "wind",
          "fog",
        ]),
      },
      forecast,
      alerts: await generateArray(
        async () => {
          return {
            id: faker.string.uuid(),
            title: faker.helpers.arrayElement([
              "Severe Thunderstorm Warning",
              "Flood Watch",
              "High Wind Advisory",
              "Heat Advisory",
              "Winter Storm Warning",
              "Tornado Watch",
            ]),
            description: faker.lorem.paragraph(),
            severity: faker.helpers.arrayElement([
              "minor",
              "moderate",
              "severe",
              "extreme",
            ]),
            time: {
              issued: faker.date.recent().toISOString(),
              expires: faker.date.soon().toISOString(),
            },
          };
        },
        0,
        2,
      ),
      units: {
        temperature: "celsius",
        windSpeed: "km/h",
        pressure: "hPa",
        distance: "km",
      },
      attribution: {
        source: "Weather API Example",
        license: "CC BY 4.0",
      },
    },
    null,
    2,
  );
}

// Generate event schedule JSON
async function generateEventSchedule(faker: any): Promise<string> {
  const eventName =
    faker.company.name() +
    " " +
    faker.helpers.arrayElement([
      "Conference",
      "Summit",
      "Expo",
      "Festival",
      "Convention",
    ]);

  const startDate = faker.date.soon();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + randomInt(1, 5));

  const venues = await generateArray(
    async () => {
      return {
        id: faker.string.uuid(),
        name:
          faker.company.name() +
          " " +
          faker.helpers.arrayElement([
            "Center",
            "Hall",
            "Arena",
            "Stadium",
            "Theater",
            "Auditorium",
          ]),
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          country: faker.location.country(),
        },
        capacity: faker.number.int({ min: 50, max: 5000 }),
        facilities: faker.helpers.arrayElements(
          [
            "Wi-Fi",
            "Parking",
            "Accessibility",
            "Food Court",
            "Restrooms",
            "Charging Stations",
          ],
          { min: 2, max: 6 },
        ),
      };
    },
    1,
    3,
  );

  const speakers = await generateArray(
    async () => {
      return {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        company: faker.company.name(),
        bio: faker.lorem.paragraph(),
        image: faker.image.avatar(),
        social: {
          twitter: `@${faker.internet.username()}`,
          linkedin: `linkedin.com/in/${faker.internet.username()}`,
        },
      };
    },
    5,
    12,
  );

  const tracks = await generateArray(
    async () => {
      const trackName = faker.helpers.arrayElement([
        "Main Track",
        "Technical",
        "Business",
        "Design",
        "Marketing",
        "Development",
        "Research",
        "Innovation",
        "Leadership",
      ]);

      const sessions = await generateArray(
        async () => {
          const sessionSpeakers = faker.helpers.arrayElements(speakers, {
            min: 1,
            max: 3,
          });

          const sessionDate = new Date(startDate);
          sessionDate.setDate(
            sessionDate.getDate() +
              randomInt(
                0,
                Math.floor(
                  (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                ),
              ),
          );

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
              name: speaker.name,
            })),
            time: {
              start: sessionStart.toISOString(),
              end: sessionEnd.toISOString(),
              duration: `${durationMinutes} minutes`,
            },
            venue: faker.helpers.arrayElement(venues),
            type: faker.helpers.arrayElement([
              "talk",
              "workshop",
              "panel",
              "keynote",
            ]),
            tags: faker.helpers.arrayElements(
              [
                "beginner",
                "intermediate",
                "advanced",
                "technical",
                "business",
                "case-study",
              ],
              { min: 1, max: 3 },
            ),
            capacity: faker.number.int({ min: 20, max: 500 }),
            registrations: faker.number.int({ min: 0, max: 500 }),
          };
        },
        3,
        8,
      );

      return {
        id: faker.string.uuid(),
        name: trackName,
        description: faker.lorem.sentence(),
        sessions,
        color: faker.color.rgb(),
      };
    },
    2,
    4,
  );

  return JSON.stringify(
    {
      event: {
        id: faker.string.uuid(),
        name: eventName,
        description: faker.lorem.paragraph(),
        website: faker.internet.url(),
        dates: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        location: {
          city: faker.location.city(),
          country: faker.location.country(),
        },
        organizer: {
          name: faker.company.name(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
        },
        social: {
          twitter: `@${faker.internet.username()}`,
          facebook: `facebook.com/${faker.internet.username()}`,
          instagram: `instagram.com/${faker.internet.username()}`,
        },
      },
      venues,
      speakers,
      schedule: {
        tracks,
      },
      registration: {
        url: faker.internet.url(),
        deadline: faker.date.soon().toISOString(),
        fees: {
          early: faker.commerce.price({ min: 99, max: 299 }),
          regular: faker.commerce.price({ min: 199, max: 499 }),
          late: faker.commerce.price({ min: 299, max: 699 }),
        },
      },
    },
    null,
    2,
  );
}

// Generate restaurant menu JSON
async function generateRestaurantMenu(faker: any): Promise<string> {
  const cuisineType = faker.helpers.arrayElement([
    "Italian",
    "Mexican",
    "Chinese",
    "Japanese",
    "Indian",
    "French",
    "Thai",
    "Mediterranean",
    "American",
    "Greek",
  ]);

  const restaurantName =
    faker.company.name() +
    " " +
    faker.helpers.arrayElement([
      "Restaurant",
      "Bistro",
      "Café",
      "Eatery",
      "Kitchen",
      "Grill",
      "Diner",
    ]);

  const categories = await generateArray(
    async () => {
      const categoryName = faker.helpers.arrayElement([
        "Appetizers",
        "Soups",
        "Salads",
        "Main Courses",
        "Pasta",
        "Seafood",
        "Steaks",
        "Burgers",
        "Sandwiches",
        "Desserts",
        "Beverages",
        "Sides",
        "Specials",
        "Breakfast",
        "Kids Menu",
      ]);

      const items = await generateArray(
        async () => {
          const isVegetarian = faker.datatype.boolean(0.3);
          const isVegan = isVegetarian && faker.datatype.boolean(0.5);
          const isGlutenFree = faker.datatype.boolean(0.2);

          const dietaryTags = [];
          if (isVegetarian) dietaryTags.push("vegetarian");
          if (isVegan) dietaryTags.push("vegan");
          if (isGlutenFree) dietaryTags.push("gluten-free");

          const spiceLevels = ["mild", "medium", "hot", "extra hot"];

          return {
            id: faker.string.uuid(),
            name: faker.lorem.words(randomInt(2, 4)),
            description: faker.lorem.sentence(),
            price: parseFloat(faker.commerce.price({ min: 5, max: 30 })),
            image: faker.image.urlLoremFlickr({ category: "food" }),
            ingredients: faker.helpers.arrayElements(
              [
                "tomato",
                "cheese",
                "lettuce",
                "onion",
                "garlic",
                "chicken",
                "beef",
                "pork",
                "fish",
                "shrimp",
                "rice",
                "pasta",
                "potato",
                "carrot",
                "broccoli",
                "spinach",
                "mushroom",
                "bell pepper",
                "olive oil",
                "butter",
                "cream",
                "flour",
                "sugar",
                "salt",
              ],
              { min: 3, max: 8 },
            ),
            dietary: dietaryTags,
            spiceLevel:
              dietaryTags.length > 0
                ? faker.helpers.arrayElement(spiceLevels)
                : undefined,
            calories: faker.number.int({ min: 100, max: 1200 }),
            prepTime: `${randomInt(5, 30)} minutes`,
            popular: faker.datatype.boolean(0.2),
          };
        },
        4,
        10,
      );

      return {
        id: faker.string.uuid(),
        name: categoryName,
        description: faker.lorem.sentence(),
        items,
      };
    },
    3,
    6,
  );

  return JSON.stringify(
    {
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
            longitude: faker.location.longitude(),
          },
        },
        contact: {
          phone: faker.phone.number(),
          email: faker.internet.email(),
          website: faker.internet.url(),
        },
        hours: {
          monday: faker.helpers.arrayElement(["Closed", "11:00 AM - 10:00 PM"]),
          tuesday: "11:00 AM - 10:00 PM",
          wednesday: "11:00 AM - 10:00 PM",
          thursday: "11:00 AM - 10:00 PM",
          friday: "11:00 AM - 11:00 PM",
          saturday: "10:00 AM - 11:00 PM",
          sunday: faker.helpers.arrayElement(["Closed", "10:00 AM - 9:00 PM"]),
        },
        rating: {
          average: faker.number.float({ min: 3.0, max: 5.0, precision: 0.1 }),
          count: faker.number.int({ min: 10, max: 1000 }),
        },
        features: faker.helpers.arrayElements(
          [
            "Takeout",
            "Delivery",
            "Outdoor Seating",
            "Reservations",
            "Wheelchair Accessible",
            "Full Bar",
            "Wine List",
            "Private Dining",
            "Live Music",
            "Catering",
            "Happy Hour",
            "Family-Friendly",
          ],
          { min: 3, max: 8 },
        ),
      },
      menu: {
        categories,
        specials: await generateArray(
          async () => {
            return {
              id: faker.string.uuid(),
              name: faker.lorem.words(randomInt(2, 4)),
              description: faker.lorem.sentence(),
              price: parseFloat(faker.commerce.price({ min: 10, max: 40 })),
              available: {
                from: faker.date.recent().toISOString(),
                to: faker.date.soon().toISOString(),
              },
            };
          },
          0,
          3,
        ),
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: "1.0",
      },
    },
    null,
    2,
  );
}

/**
 * JSON language detector
 */
export class JsonFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "json";
  name = "JSON";
  extensions = ["json", "jsonc", "geojson", "tfstate", "topojson", "jsonl"];
  priority = 7; // High priority because valid JSON is very specific

  // Added a property to store preloaded samples
  private preloadedSample: string | null = null;

  patterns = () => [
    /"[^"]*"\s*:/, // "key": pattern
    /\[\s*(?:"[^"]*"|[\d.]+|true|false|null|{)/, // Array with valid JSON values
    /{\s*"[^"]*"\s*:/, // Object with key
    /,\s*"[^"]*"\s*:/, // Property separator pattern
    /"[^"]*"\s*:\s*(?:"[^"]*"|[\d.]+|true|false|null|\[|{)/, // Key-value pair with valid JSON value
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

    // If no preloaded sample, generate one synchronously and start preloading for next time
    this.preloadDynamicSample();
    return this.generateFallbackSample();
  }

  /**
   * Generate a random fallback sample that's different each time
   */
  private generateFallbackSample(): string {
    const themes = [
      { name: "API Response", type: "users" },
      { name: "Product Data", type: "products" },
      { name: "Configuration", type: "config" },
      { name: "Analytics Data", type: "analytics" },
      { name: "User Profile", type: "profile" }
    ];
    
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const randomId = Math.floor(Math.random() * 10000);
    const randomScore = (Math.random() * 100).toFixed(2);
    
    switch (theme.type) {
      case "users":
        return `{
  "users": [
    {
      "id": ${randomId},
      "name": "Sample User ${randomId}",
      "email": "user${randomId}@example.com",
      "active": ${Math.random() > 0.5},
      "score": ${randomScore}
    }
  ],
  "total": 1,
  "timestamp": "${new Date().toISOString()}"
}`;
      case "products":
        return `{
  "product": {
    "id": "prod-${randomId}",
    "name": "Sample Product ${randomId}",
    "price": ${(Math.random() * 100).toFixed(2)},
    "inStock": ${Math.random() > 0.3},
    "rating": ${(Math.random() * 5).toFixed(1)}
  },
  "generated": "${new Date().toISOString()}"
}`;
      case "config":
        return `{
  "version": "1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}",
  "settings": {
    "theme": "${Math.random() > 0.5 ? 'dark' : 'light'}",
    "autoSave": ${Math.random() > 0.3},
    "timeout": ${Math.floor(Math.random() * 5000 + 1000)}
  },
  "features": ["feature${randomId}"],
  "updated": "${new Date().toISOString()}"
}`;
      case "analytics":
        return `{
  "analytics": {
    "pageViews": ${Math.floor(Math.random() * 10000)},
    "uniqueVisitors": ${Math.floor(Math.random() * 1000)},
    "bounceRate": ${(Math.random() * 100).toFixed(2)}
  },
  "period": "last_30_days",
  "generated": "${new Date().toISOString()}"
}`;
      default:
        return `{
  "profile": {
    "id": "${randomId}",
    "username": "user${randomId}",
    "preferences": {
      "notifications": ${Math.random() > 0.5},
      "privacy": "${Math.random() > 0.5 ? 'public' : 'private'}"
    }
  },
  "lastLogin": "${new Date().toISOString()}"
}`;
    }
  }

  /**
   * Preload a dynamic sample in the background
   */
  async preloadDynamicSample(): Promise<void> {
    try {
      const dynamicJson = await generateThemeBasedJson();
      this.preloadedSample = dynamicJson;
    } catch (error) {
      console.error("Failed to preload dynamic JSON sample:", error);
    }
  }


  /**
   * Simplified JSON detection optimized for paste-based workflow
   * Three-step approach: bail-out, definitive parsing, pattern matching
   */
  detect(content: string): DetectionResult {
    const trimmed = content.trim();

    // --- Step 1: Quick Bail-Outs ---
    if (trimmed.length < 2) {
      return this.noMatch(); // Not enough content to be JSON
    }

    // Check for escaped JSON string (starts and ends with quotes, contains escaped JSON)
    const isEscapedJsonString = trimmed.startsWith('"') && trimmed.endsWith('"');
    if (isEscapedJsonString) {
      try {
        // Unescape the string and try to parse as JSON
        const unescaped = JSON.parse(trimmed);
        // Only consider it JSON if the unescaped content is also valid JSON structure
        if (typeof unescaped === 'string') {
          const innerTrimmed = unescaped.trim();
          if ((innerTrimmed.startsWith('{') && innerTrimmed.endsWith('}')) ||
              (innerTrimmed.startsWith('[') && innerTrimmed.endsWith(']'))) {
            try {
              JSON.parse(innerTrimmed);
              return { match: true, confidence: 0.99 }; // Very high confidence for double-escaped JSON
            } catch (e) {
              // Inner content looks like JSON structure but isn't valid - still give some confidence
              // but only if it has JSON-like patterns
              if (/"[^"]*"\s*:/.test(innerTrimmed) || /^\s*\[.*\]\s*$/.test(innerTrimmed)) {
                return { match: true, confidence: 0.85 };
              }
              // Not JSON-like, don't match
              return this.noMatch();
            }
          }
          // If it doesn't look like JSON structure, don't match
          return this.noMatch();
        }
        // If unescaped content is not a string, don't match
        return this.noMatch();
      } catch (e) {
        // Not a valid JSON string, continue with normal detection
      }
    }

    const startsWithBrace = trimmed.startsWith("{");
    const startsWithBracket = trimmed.startsWith("[");

    // If it doesn't start with a brace or bracket, it's definitively not JSON.
    if (!startsWithBrace && !startsWithBracket) {
      return this.noMatch();
    }

    // --- Step 2: The "Fast Path" for Valid, Complete JSON ---
    // Check if the content appears to be a complete object or array.
    const isPotentiallyComplete =
      (startsWithBrace && trimmed.endsWith("}")) ||
      (startsWithBracket && trimmed.endsWith("]"));

    if (isPotentiallyComplete) {
      try {
        JSON.parse(trimmed);
        // It's valid JSON. Return a very high confidence score to win against other detectors.
        return { match: true, confidence: 0.98 };
      } catch (e) {
        // It's not valid, but it still looks like JSON.
        // We'll fall through to the pattern matching below, but with a slight confidence boost.
      }
    }

    // --- Step 3: Pattern Matching for Partial or Malformed JSON ---
    // This is for content that is truncated or has syntax errors.

    let confidenceScore = 0.0;

    // If it looks like it was intended to be complete JSON, give it a head start.
    if (isPotentiallyComplete) {
      confidenceScore += 0.3;
    }

    // The most reliable indicator in partial JSON is the presence of quoted keys followed by a colon.
    const keyValueRegex = /"[^"\\]*(?:\\.[^"\\]*)*"\s*:/g;
    const keyValueMatches = trimmed.match(keyValueRegex);

    if (keyValueMatches) {
      // Add confidence for each key-value pair found, up to a limit.
      confidenceScore += 0.3; // Base confidence for finding at least one pair
      confidenceScore += Math.min(keyValueMatches.length, 10) * 0.05; // Add 0.05 for each pair up to 10
    }

    // Check for escaped JSON patterns (like \"key\":\"value\")
    const escapedJsonPattern = /\\"[^\\"]*\\"\s*:\s*(?:\\"[^\\"]*\\"|[\d.]+|true|false|null|\\\[|\\\{)/g;
    const escapedJsonMatches = trimmed.match(escapedJsonPattern);
    if (escapedJsonMatches) {
      confidenceScore += 0.4; // High confidence for escaped JSON patterns
      confidenceScore += Math.min(escapedJsonMatches.length, 5) * 0.1; // Add 0.1 for each match up to 5
    }

    // Check for other JSON structural elements, but give them less weight.
    const otherJsonChars = (trimmed.match(/[{}[\]:,]/g) || []).length;
    const nonWhitespaceChars = trimmed.replace(/\s/g, "").length;

    if (nonWhitespaceChars > 0) {
      const structuralCharRatio = otherJsonChars / nonWhitespaceChars;
      if (structuralCharRatio > 0.4) {
        confidenceScore += 0.1; // If >40% of chars are structural, that's a good sign.
      }
    }

    // --- Penalties for things that are NEVER in valid JSON ---
    // These help distinguish from JavaScript objects or other formats.
    if (trimmed.includes("//") || trimmed.includes("/*")) {
      confidenceScore -= 0.3; // JSON doesn't have comments.
    }
    // Handle single quotes (invalid JSON but common in JS)
    const singleQuoteMatches = trimmed.match(/'[^']*'\s*:/g);
    if (singleQuoteMatches) {
      confidenceScore += 0.2; // Give base confidence for quote-colon patterns
      confidenceScore += Math.min(singleQuoteMatches.length, 5) * 0.03; // Add for each match
      confidenceScore -= 0.1; // But penalize since it's not valid JSON
    }
    // Check for trailing commas, which are invalid in standard JSON.
    if (/,(\s*)}/g.test(trimmed) || /,(\s*)]/g.test(trimmed)) {
      confidenceScore -= 0.15;
    }
    // Check for unquoted keys (common in JS/YAML, invalid in JSON)
    // Give it some confidence but less than proper JSON
    const unquotedKeyMatches = trimmed.match(/^\s*[a-zA-Z_]\w*\s*:/gm);
    if (unquotedKeyMatches) {
      confidenceScore += 0.2; // Give some base confidence for JS-style objects
      confidenceScore += Math.min(unquotedKeyMatches.length, 5) * 0.03; // Add a bit for each unquoted key
      confidenceScore -= 0.15; // But apply a penalty since it's not valid JSON
    }

    // Special case: reject obvious non-JSON patterns early
    // This catches cases like "{{{{{" that shouldn't match
    if (!keyValueMatches && otherJsonChars > 0 && nonWhitespaceChars > 0) {
      const keyValueRatio = 0 / nonWhitespaceChars;
      const structuralRatio = otherJsonChars / nonWhitespaceChars;
      // If it's all structural chars with no key-value pairs, it's probably not JSON
      if (structuralRatio > 0.8 && keyValueRatio === 0) {
        return this.noMatch();
      }
    }

    // Clamp the score between 0 and 1.
    const finalConfidence = Math.min(1.0, Math.max(0.0, confidenceScore));

    // A match requires a reasonable confidence level after all checks.
    const isMatch = finalConfidence >= 0.3;

    return {
      match: isMatch,
      confidence: isMatch ? finalConfidence : 0.0,
    };
  }

  // getStatusItem, getOptionsMenu, registerProvider remain the same
  getStatusItem(): React.FC<{ content?: string }> {
    return JsonStatusItem;
  }

  getOptionsMenu(): any {
    return JsonOptionsMenu;
  }

  registerProvider(monaco: any): void {
    registerJsonValidationProvider(monaco);
    // Monaco has excellent built-in JSON support, including formatting,
    // so usually, no custom formatter or Monarch tokenizer is needed.
  }
}

// Create and register the detector
const jsonDetector = new JsonFormatDetector();
formatRegistry.register(jsonDetector);

// Preload samples for future use
jsonDetector.preloadDynamicSample();

// Export for backward compatibility
export const registerJsonProvider = (monaco: any) => {
  jsonDetector.registerProvider(monaco);
};
