import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'cmopwmqsw0000s2k33wn72zsd';

const rangers = [
  {
    name: 'Bayaraa Gantulga',
    parkName: 'Hustai National Park',
    country: 'Mongolia',
    bio: 'Chief Ranger with 11 years of experience protecting the Hustai steppe. Bayaraa has overseen the Przewalski horse population grow from 16 to over 300 individuals.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    displayOrder: 0,
  },
  {
    name: 'Yesenia Huanca',
    parkName: 'Manu National Park',
    country: 'Peru',
    bio: "The first woman ranger from her community, Yesenia runs Manu's 84-camera jaguar monitoring programme across 200,000 hectares of Amazon and cloud forest.",
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
    displayOrder: 1,
  },
  {
    name: 'Tsogoo Davaasuren',
    parkName: 'Mongolian Altai Reserve',
    country: 'Mongolia',
    bio: 'Tsogoo manages a remote camera trap network in the high Altai. His team made the first confirmed snow leopard sighting in their territory since 2012.',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    displayOrder: 2,
  },
  {
    name: 'Carlos Quispe',
    parkName: 'Tambopata National Reserve',
    country: 'Peru',
    bio: "A former hunter turned conservationist, Carlos now trains community monitors and leads anti-poaching patrols in one of the Amazon's most biodiverse corridors.",
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    displayOrder: 3,
  },
  {
    name: 'Enkhjargal Dorj',
    parkName: 'Khustai National Park',
    country: 'Mongolia',
    bio: 'Enkhjargal specialises in wildlife veterinary care and has treated over 40 Przewalski horses over her six-year career at Khustai.',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    displayOrder: 4,
  },
  {
    name: 'Roberto Mamani',
    parkName: 'Madidi National Park',
    country: 'Bolivia',
    bio: "Roberto patrols one of the world's most biodiverse national parks. His territory spans from Andean glaciers at 6,000m down to Amazon lowland forest.",
    photo: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400',
    displayOrder: 5,
  },
];

const participants = [
  {
    firstName: 'James',
    lastName: "O'Connor",
    country: 'Ireland',
    bio: 'Veteran adventure rider with 34 countries under his belt. Rode Mongolia 2023 and Peru 2024, raising over €18,000 for ranger equipment.',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
    displayOrder: 0,
    rallyYears: [2023, 2024],
  },
  {
    firstName: 'Sofia',
    lastName: 'Marchetti',
    country: 'Italy',
    bio: 'Trauma surgeon and weekend rider. Set the all-time single-rider fundraising record at the 2024 Peru rally, raising €22,000 from 94 donors.',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    displayOrder: 1,
    rallyYears: [2024],
  },
  {
    firstName: 'Marcus',
    lastName: 'Webb',
    country: 'United Kingdom',
    bio: 'Adventure travel writer and rally rider. Brought four friends into the rally after his Mongolia experience changed how he thinks about purposeful travel.',
    photo: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400',
    displayOrder: 2,
    rallyYears: [2023, 2024],
  },
  {
    firstName: 'Aiko',
    lastName: 'Tanaka',
    country: 'Japan',
    bio: 'Environmental engineer and enduro rider who rode the full 1,400km Mongolia route solo. Raised ¥2.8 million for Hustai National Park.',
    photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    displayOrder: 3,
    rallyYears: [2023],
  },
  {
    firstName: 'Luca',
    lastName: 'Ferretti',
    country: 'Italy',
    bio: 'Retired pilot and passionate motorcyclist. At 67, Luca was the oldest rider in the 2024 Peru rally and finished every single stage.',
    photo: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400',
    displayOrder: 4,
    rallyYears: [2024],
  },
  {
    firstName: 'Amara',
    lastName: 'Diallo',
    country: 'France',
    bio: 'Wildlife photographer and motorcycle tourer. Amara documented the full Peru rally and her photos have been published in three international conservation magazines.',
    photo: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400',
    displayOrder: 5,
    rallyYears: [2024],
  },
  {
    firstName: 'Tomas',
    lastName: 'Novak',
    country: 'Czech Republic',
    bio: "Software engineer by day, enduro rider by weekend. Raised €9,500 for the Mongolian Altai Reserve through his company's matching gift programme.",
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    displayOrder: 6,
    rallyYears: [2023],
  },
  {
    firstName: 'Sarah',
    lastName: 'Oduya',
    country: 'Kenya',
    bio: 'Conservation biologist and adventure rider. Sarah brings a rare dual perspective — she has worked as a field researcher in national parks and now rides to fund the rangers who protect them.',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    displayOrder: 7,
    rallyYears: [2024],
  },
];

async function main() {
  console.log('Seeding rangers...');

  // Clear existing test records
  await prisma.ranger.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.participantRally.deleteMany({
    where: { participant: { tenantId: TENANT_ID } },
  });
  await prisma.participant.deleteMany({ where: { tenantId: TENANT_ID } });

  for (const ranger of rangers) {
    await prisma.ranger.create({
      data: { ...ranger, tenantId: TENANT_ID },
    });
    console.log(`  ✓ Ranger: ${ranger.name} — ${ranger.parkName}`);
  }

  console.log('\nSeeding participants...');

  for (const { rallyYears, ...p } of participants) {
    await prisma.participant.create({
      data: { ...p, tenantId: TENANT_ID },
    });
    console.log(
      `  ✓ Participant: ${p.firstName} ${p.lastName} — ${p.country} (${rallyYears.join(', ')})`
    );
  }

  console.log(`\nDone — ${rangers.length} rangers, ${participants.length} participants seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
