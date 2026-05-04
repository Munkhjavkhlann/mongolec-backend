import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'cmopwmqsw0000s2k33wn72zsd';
const CREATED_BY_ID = 'cmopwmr7l004is2k3ym2tmcz1';

const stories = [
  // ── IMPACT ───────────────────────────────────────────────
  {
    slug: 'motorcycles-transform-patrol-in-mongolia',
    type: 'IMPACT',
    status: 'PUBLISHED',
    featured: true,
    displayOrder: 0,
    publishedAt: new Date('2024-08-15'),
    title: {
      en: 'How Motorcycles Transformed Patrol in Mongolia',
      mn: 'Мотоцикл Монголын хамгаалалтыг хэрхэн өөрчилсөн',
    },
    excerpt: {
      en: 'Before the rally, rangers in Hustai covered just 12km per patrol shift on horseback. Today they cover over 80km — catching poachers before they can disappear into the steppe.',
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: "Before the 2023 Rally for Rangers, the team at Hustai National Park relied entirely on horses for patrol. A single shift covered 12 kilometres — barely enough to check the park's eastern boundary.",
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'After receiving two trail motorcycles from the rally, patrol range jumped to 82km per shift. Response time to snare reports dropped from four hours to under forty minutes.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"The poachers know we can reach them now," says Chief Ranger Bayaraa. "In the first month we recovered three deer that had been caught in wire snares — animals we would never have reached in time before."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'The impact extends beyond patrol speed. Rangers can now reach remote watering holes to check water quality, carry medicine for injured wildlife, and document tracks in areas that were previously only visited once a season.',
          },
        },
      ],
    },
    author: { en: 'Bayaraa Gantulga', mn: 'Баяраа Гантулга' },
    role: 'Ranger',
    featuredImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200',
    beforeData: { motorcycles: 0, patrolKmPerShift: 12, responseTimeMinutes: 240 },
    afterData: { motorcycles: 2, patrolKmPerShift: 82, responseTimeMinutes: 38 },
    impactSummary: { en: '6.8× more ground covered per patrol. Response time cut by 84%.' },
    tags: ['impact', 'mongolia', 'patrol', 'wildlife'],
  },

  // ── IMPACT ───────────────────────────────────────────────
  {
    slug: 'peru-cloud-forest-rangers-receive-equipment',
    type: 'IMPACT',
    status: 'PUBLISHED',
    featured: false,
    displayOrder: 1,
    publishedAt: new Date('2024-11-02'),
    title: {
      en: 'Cloud Forest Rangers Finally Get the Equipment They Need',
      mn: 'Үүлэн ойн хамгаалагчид хэрэгцээтэй тоног төхөөрөмжөө авлаа',
    },
    excerpt: {
      en: 'The rangers of Manu National Park in Peru had been sharing one GPS unit between five people. Rally riders raised enough to give each ranger their own device — plus rain gear and medical kits for the wet season.',
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: 'Manu National Park spans 1.7 million hectares of Amazon and cloud forest — one of the most biodiverse places on Earth. Its 22 rangers share a single vehicle and, until recently, one GPS unit between five people.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'The 2024 Peru Rally raised $48,000 for Manu. With those funds, the park equipped every ranger with a personal GPS, waterproof boots, rain gear, and a field medical kit.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"We work in terrain where it rains nine months of the year," says Ranger Yesenia Huanca. "Before, my boots were falling apart. I was putting plastic bags inside them to keep my feet dry. That sounds small, but when you are twelve hours in the field, it is everything."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'The rally also funded a satellite communicator for the most remote ranger post — a three-day hike from the nearest road. For the first time, those rangers can call for evacuation if someone is injured.',
          },
        },
      ],
    },
    author: { en: 'Yesenia Huanca', mn: 'Есениа Хуанка' },
    role: 'Ranger',
    featuredImage: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=1200',
    beforeData: { gpsUnits: 1, rainGearSets: 0, medicalKits: 2 },
    afterData: { gpsUnits: 22, rainGearSets: 22, medicalKits: 22 },
    impactSummary: { en: '22 rangers fully equipped for the wet season for the first time.' },
    tags: ['impact', 'peru', 'equipment', 'amazon'],
  },

  // ── RANGER_PROFILE ────────────────────────────────────────
  {
    slug: 'ranger-profile-bayaraa-gantulga',
    type: 'RANGER_PROFILE',
    status: 'PUBLISHED',
    featured: true,
    displayOrder: 0,
    publishedAt: new Date('2024-03-20'),
    title: {
      en: 'Bayaraa Gantulga — Chief Ranger, Hustai National Park',
      mn: 'Баяраа Гантулга — Хустайн тусгай хамгаалалттай газрын ахлах хамгаалагч',
    },
    excerpt: {
      en: 'Bayaraa has patrolled the Hustai steppe for eleven years. He has watched Przewalski horse herds grow from 16 to over 300 animals — and he credits community trust as the real force behind that recovery.',
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: 'Bayaraa Gantulga grew up in a ger camp three kilometres from what is now Hustai National Park. His father was a herder; his grandfather too. The land he protects today is the land he played on as a child.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: "He joined the ranger force at 24, initially to earn a salary during a drought year when the family's livestock had died. He never left.",
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"The first few years were hard. The local community saw rangers as outsiders telling them what they could not do. I spent more time talking than patrolling. Explaining why the buffer zone matters. Why a healthy steppe feeds more livestock in the long run than an overgrazed one."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'Today, Bayaraa leads a team of eight. The Przewalski horse population — locally extinct until a 1992 reintroduction — has grown to over 300 individuals. Three former poachers now work as community monitors, paid by the park.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"Conservation is not about keeping people out," he says. "It is about showing people that protecting this place protects their future."',
          },
        },
      ],
    },
    author: { en: 'Bayaraa Gantulga', mn: 'Баяраа Гантулга' },
    role: 'Ranger',
    featuredImage: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200',
    tags: ['ranger-profile', 'mongolia', 'hustai', 'przewalski'],
  },

  // ── RANGER_PROFILE ────────────────────────────────────────
  {
    slug: 'ranger-profile-yesenia-huanca',
    type: 'RANGER_PROFILE',
    status: 'PUBLISHED',
    featured: false,
    displayOrder: 1,
    publishedAt: new Date('2024-09-10'),
    title: {
      en: 'Yesenia Huanca — Field Ranger, Manu National Park',
      mn: 'Есениа Хуанка — Талбайн хамгаалагч, Ману үндэсний цэцэрлэгт хүрээлэн',
    },
    excerpt: {
      en: "Yesenia was the first woman from her community to become a park ranger. Seven years later, she trains new recruits and runs the park's jaguar monitoring programme.",
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: 'When Yesenia Huanca applied to be a ranger at 21, her village thought she was making a mistake. "Women don\'t do that work," she was told. The park thought otherwise.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: "Seven years later, she runs Manu's camera trap network — 84 cameras spread across 200,000 hectares of cloud forest and lowland Amazon. The programme has confirmed breeding pairs of jaguars, giant otters, and giant anteaters.",
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"I tell the younger girls in my community: this forest is not somewhere to be afraid of. It is your classroom, your pharmacy, your water supply. Learn it. Protect it."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'The equipment funded by the 2024 Peru Rally has changed her daily work fundamentally. "Before, I was spending the first hour of every patrol worrying about whether my boots would survive the day. Now I can just think about the work."',
          },
        },
      ],
    },
    author: { en: 'Yesenia Huanca', mn: 'Есениа Хуанка' },
    role: 'Ranger',
    featuredImage: 'https://images.unsplash.com/photo-1548019671-e72f1e8e0165?w=1200',
    tags: ['ranger-profile', 'peru', 'manu', 'jaguar'],
  },

  // ── RIDER_PROFILE ─────────────────────────────────────────
  {
    slug: 'rider-profile-james-oconnor',
    type: 'RIDER_PROFILE',
    status: 'PUBLISHED',
    featured: true,
    displayOrder: 0,
    publishedAt: new Date('2024-07-05'),
    title: {
      en: "James O'Connor — Rider, Mongolia 2023 & Peru 2024",
      mn: "Жеймс О'Коннор — Жолооч, Монгол 2023 & Перу 2024",
    },
    excerpt: {
      en: '"I\'ve ridden in 34 countries. The Mongolia rally was the first time a ride felt like it actually mattered for something beyond the ride itself." James has now done two rallies and raised over $18,000.',
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: "James O'Connor bought his first motorcycle at 17. He has since ridden across six continents, documented in a blog that has accumulated a modest but loyal following of touring riders.",
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'He found Rally for Rangers through a forum post in 2022. "I was cynical at first. Lots of charity rides are really just vacations with a donation box. I did my research and this one seemed different — the money goes to rangers, not to running the organisation."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'He rode Mongolia 2023 across 1,400km of steppe and mountain. On the final day, riders met the rangers at Hustai and handed over the equipment in person.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"Shaking Bayaraa\'s hand and knowing that what I raised is going to help him do his job — that is not something you get from writing a cheque. You need to see the place. You need to understand what you\'re protecting."',
          },
        },
        {
          type: 'paragraph',
          text: { en: 'He returned for Peru 2024. He is already signed up for the next rally.' },
        },
      ],
    },
    author: { en: "James O'Connor", mn: "Жеймс О'Коннор" },
    role: 'Rider',
    featuredImage: 'https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4?w=1200',
    tags: ['rider-profile', 'mongolia', 'peru', 'fundraising'],
  },

  // ── RIDER_PROFILE ─────────────────────────────────────────
  {
    slug: 'rider-profile-sofia-marchetti',
    type: 'RIDER_PROFILE',
    status: 'PUBLISHED',
    featured: false,
    displayOrder: 1,
    publishedAt: new Date('2024-10-18'),
    title: { en: 'Sofia Marchetti — Rider, Peru 2024', mn: 'София Марчетти — Жолооч, Перу 2024' },
    excerpt: {
      en: 'A trauma surgeon by week and a rally rider by weekend, Sofia rode 900km through the Andes and raised $22,000 — the highest individual fundraising total in rally history.',
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: 'Sofia Marchetti spends her working week in a Milan operating theatre. On weekends, she rides. "Motorcycles are where I stop thinking about everything else," she says.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'A colleague who had ridden a previous rally sent her the application link with a single message: "This one is for you." She applied the same day.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'Her fundraising approach was surgical in its precision. "I made a list of everyone I knew who had ever said they cared about nature but did nothing about it. I sent each of them a personal message. Not a broadcast. Personal."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: "The result: €22,000 raised from 94 individual donors — the highest single-rider total in the rally's history.",
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"Meeting Yesenia in the field was extraordinary. She showed us a jaguar on a camera trap from the night before. A jaguar. In territory her team protects. That is what the money is for."',
          },
        },
      ],
    },
    author: { en: 'Sofia Marchetti', mn: 'София Марчетти' },
    role: 'Rider',
    featuredImage: 'https://images.unsplash.com/photo-1601758003122-53c40e686a19?w=1200',
    tags: ['rider-profile', 'peru', 'fundraising', 'record'],
  },

  // ── FIELD_MOMENT ──────────────────────────────────────────
  {
    slug: 'field-moment-first-snow-leopard-camera-trap',
    type: 'FIELD_MOMENT',
    status: 'PUBLISHED',
    featured: false,
    displayOrder: 0,
    publishedAt: new Date('2024-05-12'),
    title: {
      en: 'The Night a Camera Trap Changed Everything',
      mn: 'Камерын урхи бүгдийг өөрчилсөн тэр шөнө',
    },
    excerpt: {
      en: 'Three months after rally-funded cameras were installed in the Altai, ranger Tsogoo checked the memory card and found something no one had documented in this region for over a decade.',
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: 'Ranger Tsogoo Davaasuren had been checking camera traps every three weeks since October. Mostly ibex, some foxes, once a wolf. Good data, but nothing unexpected.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'On the morning of February 14th, he pulled the SD card from camera seven — positioned on a ledge at 3,100 metres — and rode two hours back to the ranger station to review the footage.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"I almost scrolled past it. Then I stopped. Rewound. Watched it again." The timestamp read 02:47. In the frame: a snow leopard. A large adult, moving west along the ridge line.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: 'The last confirmed snow leopard sighting in this section of the Mongolian Altai was in 2012. The camera programme — funded partly by the 2023 rally — had just confirmed a living individual in territory rangers had protected for a decade without knowing if anything was there to protect.',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"I called my supervisor. Then I sat outside the station for a while and just looked at the mountains."',
          },
        },
      ],
    },
    author: { en: 'Tsogoo Davaasuren', mn: 'Цогоо Давааcүрэн' },
    role: 'Ranger',
    featuredImage: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=1200',
    tags: ['field-moment', 'mongolia', 'snow-leopard', 'camera-trap'],
  },

  // ── TESTIMONIAL ───────────────────────────────────────────
  {
    slug: 'testimonial-why-i-keep-coming-back',
    type: 'TESTIMONIAL',
    status: 'PUBLISHED',
    featured: false,
    displayOrder: 0,
    publishedAt: new Date('2024-12-01'),
    title: {
      en: '"I\'ve Done a Lot of Rides. This One I\'ll Never Forget."',
      mn: '"Би олон уралдаанд оролцсон. Энэ нэгийг хэзээ ч мартахгүй."',
    },
    excerpt: {
      en: 'Rider Marcus Webb on why the Mongolia rally changed how he thinks about adventure travel — and why he is bringing four friends to Peru.',
    },
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: {
            en: '"Adventure travel has a problem. At some point you run out of new experiences. I had ridden the Pamir. I had done the Stelvio in winter. I was starting to feel like every trip was just a slightly different version of the last one."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"Rally for Rangers solved that. The route was extraordinary — but that was never the point. The point was Hustai. Sitting with the rangers after the ride. Hearing Bayaraa talk about the horses. Understanding that the equipment I helped pay for is going to outlast this trip by years."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"I have brought four friends into the Peru rally. Two of them had never done a charity event in their lives. They were sceptical. I told them: just come. You\'ll understand when you get there."',
          },
        },
        {
          type: 'paragraph',
          text: {
            en: '"That is the thing about this rally. You do not need to be an activist or an environmentalist. You just need to love riding and believe that some places are worth protecting."',
          },
        },
      ],
    },
    author: { en: 'Marcus Webb', mn: 'Маркус Вебб' },
    role: 'Rider',
    featuredImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200',
    tags: ['testimonial', 'mongolia', 'rider'],
  },
];

async function main() {
  console.log('Seeding stories...');

  for (const story of stories) {
    await prisma.story.upsert({
      where: { slug_tenantId: { slug: story.slug, tenantId: TENANT_ID } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        createdById: CREATED_BY_ID,
        slug: story.slug,
        type: story.type as any,
        status: story.status as any,
        featured: story.featured,
        displayOrder: story.displayOrder,
        publishedAt: story.publishedAt,
        title: story.title,
        excerpt: story.excerpt ?? undefined,
        content: story.content,
        author: story.author ?? undefined,
        role: story.role ?? undefined,
        featuredImage: story.featuredImage ?? undefined,
        tags: story.tags ?? [],
        beforeData: (story as any).beforeData ?? undefined,
        afterData: (story as any).afterData ?? undefined,
        impactSummary: (story as any).impactSummary ?? undefined,
      },
    });

    console.log(`  ✓ ${story.type}: ${(story.title as any).en}`);
  }

  console.log(`\nDone — ${stories.length} stories seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
