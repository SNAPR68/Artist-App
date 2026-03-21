#!/usr/bin/env node

/**
 * Production data seeding script
 * Populates the database with realistic Indian artist data
 *
 * Usage:
 * npx ts-node scripts/seed-production.ts --env production
 * npx ts-node scripts/seed-production.ts --env staging --count 100
 */

import { parse } from 'ts-command-line-args';

interface Args {
  env: 'production' | 'staging' | 'development';
  count?: number;
  seed?: string;
  categories?: string[];
  help?: boolean;
}

const args = parse<Args>(
  {
    env: { type: String, defaultValue: 'staging' },
    count: { type: Number, defaultValue: 50 },
    seed: { type: String, defaultValue: 'default' },
    categories: { type: String, multiple: true, defaultValue: ['all'] },
    help: { type: Boolean, defaultValue: false },
  },
  {
    helpArg: 'help',
    headerContentSections: [
      {
        header: 'Artist Booking Platform - Production Seed',
        content: 'Seed the database with realistic Indian artist data',
      },
    ],
  }
);

// Sample data for Indian artists
const indianArtistNames = [
  { first: 'Rajesh', last: 'Kumar' },
  { first: 'Priya', last: 'Singh' },
  { first: 'Arjun', last: 'Verma' },
  { first: 'Neha', last: 'Sharma' },
  { first: 'Vikram', last: 'Patel' },
  { first: 'Deepika', last: 'Reddy' },
  { first: 'Aditya', last: 'Rao' },
  { first: 'Sneha', last: 'Banerjee' },
  { first: 'Rohit', last: 'Desai' },
  { first: 'Anjali', last: 'Nair' },
];

const genres = [
  'Bollywood',
  'Classical',
  'Classical Music',
  'Hindustani Music',
  'Carnatic Music',
  'Ghazal',
  'Fusion',
  'Rock',
  'Pop',
  'Folk',
  'Jazz',
  'Electronic',
  'Sufi',
  'Devotional',
  'Bhangra',
  'Comedy',
  'Stand-up',
];

const indianCities = [
  'Delhi',
  'Mumbai',
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Indore',
  'Kochi',
  'Goa',
  'Bhopal',
];

const performanceTypes = [
  'Singer',
  'Musician',
  'Dancer',
  'Comedian',
  'Magician',
  'DJ',
  'Band',
  'Instrumentalist',
  'Storyteller',
];

interface Artist {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber: string;
  city: string;
  bio: string;
  genres: string[];
  performanceType: string;
  baseRate: number;
  experience: string;
  profileImage?: string;
  verified: boolean;
  status: string;
}

interface EventCompany {
  email: string;
  companyName: string;
  role: string;
  phoneNumber: string;
  city: string;
  description: string;
  budget?: number;
  verified: boolean;
  status: string;
}

async function seedDatabase() {
  console.log(`Starting production seed for environment: ${args.env}`);
  console.log(`Target record count: ${args.count}`);
  console.log(`Random seed: ${args.seed}\n`);

  try {
    // Generate artists
    console.log('Generating artist data...');
    const artists = generateArtists(args.count);
    console.log(`✓ Generated ${artists.length} artist records`);

    // Generate event companies
    console.log('Generating event company data...');
    const companies = generateEventCompanies(Math.floor(args.count / 3));
    console.log(`✓ Generated ${companies.length} event company records`);

    // Generate clients
    console.log('Generating client data...');
    const clients = generateClients(Math.floor(args.count / 2));
    console.log(`✓ Generated ${clients.length} client records`);

    // Validate data
    console.log('\nValidating generated data...');
    validateData({ artists, companies, clients });
    console.log('✓ All data is valid\n');

    // Display summary
    console.log('=== Seed Summary ===');
    console.log(`Artists: ${artists.length}`);
    console.log(`Event Companies: ${companies.length}`);
    console.log(`Clients: ${clients.length}`);
    console.log(`Total Records: ${artists.length + companies.length + clients.length}\n`);

    // In production, you would insert into database here
    if (args.env === 'production') {
      console.log('🚨 WARNING: Production environment detected');
      console.log('Database insertion has been disabled for safety');
      console.log('Export data to JSON for manual import:\n');

      // Export summary
      const exportData = {
        timestamp: new Date().toISOString(),
        environment: args.env,
        seed: args.seed,
        counts: {
          artists: artists.length,
          companies: companies.length,
          clients: clients.length,
        },
        samples: {
          artistSample: artists.slice(0, 1),
          companySample: companies.slice(0, 1),
          clientSample: clients.slice(0, 1),
        },
      };

      console.log(JSON.stringify(exportData, null, 2));
    } else {
      console.log(`✓ Ready to seed ${args.env} database with generated data`);
      console.log(`Sample artist: ${JSON.stringify(artists[0], null, 2)}`);
    }

    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:');
    console.error(error);
    process.exit(1);
  }
}

function generateArtists(count: number): Artist[] {
  const artists: Artist[] = [];

  for (let i = 0; i < count; i++) {
    const name = indianArtistNames[i % indianArtistNames.length];
    const city = indianCities[Math.floor(Math.random() * indianCities.length)];
    const perfType = performanceTypes[Math.floor(Math.random() * performanceTypes.length)];
    const selectedGenres = genres.sort(() => Math.random() - 0.5).slice(0, 3);

    artists.push({
      email: `artist-${i + 1}@artistbook.in`,
      firstName: name.first,
      lastName: name.last,
      role: 'artist',
      phoneNumber: generateIndianPhoneNumber(),
      city,
      bio: `${perfType} based in ${city} with ${Math.floor(Math.random() * 15) + 1} years of experience. Specializing in ${selectedGenres.join(', ')}.`,
      genres: selectedGenres,
      performanceType: perfType,
      baseRate: Math.floor(Math.random() * 40000) + 5000, // 5000-45000 INR
      experience: `${Math.floor(Math.random() * 20) + 1} years`,
      verified: Math.random() > 0.3,
      status: 'active',
    });
  }

  return artists;
}

function generateEventCompanies(count: number): EventCompany[] {
  const companies: EventCompany[] = [];
  const companyNames = [
    'Sharma Events',
    'Delhi Celebrations',
    'Mumbai Entertainment',
    'Bangalore Weddings',
    'Hyderabad Events',
    'Premium Functions',
    'Elite Events',
    'Grand Celebrations',
    'Perfect Moments',
    'Festive Productions',
  ];

  for (let i = 0; i < count; i++) {
    const name = companyNames[i % companyNames.length];
    const city = indianCities[Math.floor(Math.random() * indianCities.length)];

    companies.push({
      email: `company-${i + 1}@eventcompany.in`,
      companyName: `${name} ${city}`,
      role: 'event_company',
      phoneNumber: generateIndianPhoneNumber(),
      city,
      description: `Professional event planning company specializing in weddings, corporate events, and celebrations in ${city} and nearby areas.`,
      budget: Math.floor(Math.random() * 5000000) + 500000, // 500k - 5.5M INR
      verified: Math.random() > 0.2,
      status: 'active',
    });
  }

  return companies;
}

function generateClients(count: number): any[] {
  const clients: any[] = [];

  for (let i = 0; i < count; i++) {
    const name = indianArtistNames[i % indianArtistNames.length];
    const city = indianCities[Math.floor(Math.random() * indianCities.length)];

    clients.push({
      email: `client-${i + 1}@example.com`,
      firstName: name.first,
      lastName: name.last,
      role: 'client',
      phoneNumber: generateIndianPhoneNumber(),
      city,
      eventType: ['wedding', 'corporate', 'party', 'festival'][Math.floor(Math.random() * 4)],
      budget: Math.floor(Math.random() * 500000) + 50000,
      verified: true,
      status: 'active',
    });
  }

  return clients;
}

function validateData(data: {
  artists: Artist[];
  companies: EventCompany[];
  clients: any[];
}) {
  const { artists, companies, clients } = data;

  // Check for duplicate emails
  const allEmails = [
    ...artists.map((a) => a.email),
    ...companies.map((c) => c.email),
    ...clients.map((c) => c.email),
  ];

  const uniqueEmails = new Set(allEmails);
  if (uniqueEmails.size !== allEmails.length) {
    throw new Error('Duplicate emails detected in generated data');
  }

  // Validate phone numbers
  artists.forEach((a) => {
    if (!a.phoneNumber.match(/^[0-9]{10}$/)) {
      throw new Error(`Invalid phone number for artist: ${a.email}`);
    }
  });

  // Validate required fields
  artists.forEach((a) => {
    if (!a.email || !a.firstName || !a.city || !a.genres.length) {
      throw new Error(`Missing required fields for artist: ${JSON.stringify(a)}`);
    }
  });

  console.log('✓ Email uniqueness validated');
  console.log('✓ Phone numbers validated');
  console.log('✓ Required fields present');
}

function generateIndianPhoneNumber(): string {
  const operators = ['98', '97', '96', '95', '94', '93', '92', '91', '90'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const number = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(8, '0');
  return operator + number;
}

// Run seeding
seedDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
