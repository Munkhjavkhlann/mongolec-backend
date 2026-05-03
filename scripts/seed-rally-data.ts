import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedRallyData() {
  try {
    console.log('🌱 Seeding Rally for Rangers sample data...\n');

    // Find rally-for-rangers tenant
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'rally-for-rangers' } });
    if (!tenant) {
      throw new Error('rally-for-rangers tenant not found. Run create-ngo-tenants.ts first.');
    }
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})`);

    // Find or create admin user for this tenant
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
      where: { email_tenantId: { email: 'admin@rally-for-rangers.org', tenantId: tenant.id } },
      update: {},
      create: {
        email: 'admin@rally-for-rangers.org',
        firstName: 'Rally',
        lastName: 'Admin',
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
        tenantId: tenant.id,
      },
    });
    console.log(`✅ Admin user ready: ${adminUser.email}`);

    // ── Rallies ────────────────────────────────────────────────────────────────

    const rallies = [
      {
        slug: 'mongolia-2026',
        title: { en: 'Mongolia 2026', mn: 'Монгол 2026' },
        description: {
          en: 'Ride across the vast Mongolian steppe and hand your motorcycle to a park ranger who will use it to protect Hustai National Park. This is 13 days of adventure, conservation, and genuine human connection — the kind that changes you.',
          mn: 'Монголын өргөн тал нутгаар аялж, мотоциклоо Хустайн Национал цэцэрлэгт хүрээлэнг хамгаалахад ашиглах цагдаад хүлээлгэн өгнө. 13 өдрийн адал явдал, байгаль хамгааллын ажил, жинхэнэ хүний холбоо.',
        },
        location: { en: 'Hustai National Park, Mongolia', mn: 'Хустайн Национал цэцэрлэгт хүрээлэн, Монгол' },
        startDate: new Date('2026-09-05'),
        endDate: new Date('2026-09-17'),
        duration: 13,
        status: 'UPCOMING' as const,
        maxParticipants: 18,
        currentParticipants: 11,
        isRecruiting: true,
        applicationDeadline: new Date('2026-07-01'),
        heroVideo: null,
        highlights: [
          'Ride through Orkhon Valley UNESCO site',
          'Hand your bike to a Hustai ranger',
          'Night under the stars in a ger camp',
          'Visit wild Przewalski horse herds',
          'Conservation patrol with rangers',
        ],
        impactOverview: {
          en: 'Your motorcycle becomes a ranger vehicle — extending patrol range from 15 km on horseback to 90 km per day. Past rallies have contributed 4 motorcycles to Hustai, directly reducing poaching incidents by 60%.',
          mn: 'Таны мотоцикл цагдаагийн транспорт болно — морьны 15 км-ийн патрулийн хүрээг өдөрт 90 км болгон тэлдэг.',
        },
        conservationActivities: [
          'Anti-poaching patrol ride-along',
          'Wildlife camera trap deployment',
          'Ranger station supply run',
          'Invasive plant removal session',
          'GPS trail mapping with head ranger',
        ],
        rangerPartnerships: {
          en: 'We work directly with Hustai National Park management and the Mongolian Protected Areas Administration. Each donated motorcycle undergoes a formal handover ceremony and is registered under the park fleet.',
          mn: 'Бид Хустайн Национал цэцэрлэгт хүрээлэнгийн удирдлага болон Монголын хамгаалалтын газартай шууд хамтарч ажилладаг.',
        },
        targetAudience: [
          'Experienced adventure motorcycle riders',
          'Conservation and wildlife enthusiasts',
          'Travelers seeking meaningful impact',
          'Professionals on sabbatical',
          'Retirees with riding experience',
        ],
        cost: { amount: 12000, currency: '$', includes: ['all accommodation', 'meals', 'support vehicle', 'guide', 'motorcycle donation'] },
      },
      {
        slug: 'peru-2026',
        title: { en: 'Peru 2026', mn: 'Перу 2026' },
        description: {
          en: 'From Lima to the Andean highlands — ride through cloud forest, high altitude plains, and ancient Incan trails. At the end, your motorcycle joins the fleet of Manu National Park rangers protecting one of the most biodiverse places on Earth.',
          mn: 'Лима хотоос Андын уулсын дагуу аялж, үүлэн ойгоор, өндөрлөг тал нутгаар, Инкийн эртний замаар дамжина.',
        },
        location: { en: 'Manu National Park, Peru', mn: 'Ману Национал Парк, Перу' },
        startDate: new Date('2026-06-12'),
        endDate: new Date('2026-06-24'),
        duration: 13,
        status: 'UPCOMING' as const,
        maxParticipants: 14,
        currentParticipants: 6,
        isRecruiting: true,
        applicationDeadline: new Date('2026-04-15'),
        heroVideo: null,
        highlights: [
          'Ride the legendary Abra Málaga pass (4,300m)',
          'Amazon rainforest entry point visit',
          'Macaw clay lick at dawn',
          'Quechua community homestay',
          'Motorcycle handover ceremony in Cusco',
        ],
        impactOverview: {
          en: 'Manu National Park rangers currently patrol 1.7 million hectares on foot and by river. A single motorcycle triples their land patrol coverage, enabling faster response to illegal logging and wildlife trafficking.',
          mn: 'Ману Национал Паркийн цагдаа нар одоо 1.7 сая га талбайг явган болон голоор патрулдаг. Нэг мотоцикл тэдний хуурай газрын патрулийн хамрах хүрээг гурав дахин нэмэгдүүлдэг.',
        },
        conservationActivities: [
          'Canopy wildlife survey',
          'Illegal logging checkpoint monitoring',
          'Butterfly transect counting',
          'Community conservation education session',
          'River otter census',
        ],
        rangerPartnerships: {
          en: 'In partnership with SERNANP (National Service of Natural Protected Areas of Peru) and local NGO Asociación para la Conservación de la Cuenca Amazónica.',
          mn: 'SERNANP болон орон нутгийн Амазоны сав газрыг хамгаалах холбоотой хамтран ажиллаж байна.',
        },
        targetAudience: [
          'High-altitude riding experience preferred',
          'Passionate about rainforest conservation',
          'Open to basic camping conditions',
          'Spanish language a bonus',
          'Strong physical fitness required',
        ],
        cost: { amount: 14500, currency: '$', includes: ['flights Lima–Cusco', 'all accommodation', 'meals', 'bilingual guide', 'motorcycle donation'] },
      },
      {
        slug: 'mongolia-2025',
        title: { en: 'Mongolia 2025', mn: 'Монгол 2025' },
        description: {
          en: 'The third edition of our flagship Mongolia rally. 16 riders from 9 countries crossed the steppe, delivered 4 motorcycles to Hustai rangers, and documented a record year for Przewalski horse births.',
          mn: 'Манай тэргүүлэх Монголын ралли. 9 орны 16 жолооч тал нутгыг туулж, Хустайн цагдаа нарт 4 мотоцикл хүлээлгэн өгч, тахийн тугалын тооллогод рекорд тогтоосон жилийг баримтжуулав.',
        },
        location: { en: 'Hustai National Park, Mongolia', mn: 'Хустайн Национал цэцэрлэгт хүрээлэн, Монгол' },
        startDate: new Date('2025-08-18'),
        endDate: new Date('2025-08-30'),
        duration: 13,
        status: 'COMPLETED' as const,
        maxParticipants: 18,
        currentParticipants: 16,
        isRecruiting: false,
        applicationDeadline: null,
        heroVideo: null,
        highlights: [
          '4 motorcycles donated to Hustai rangers',
          '16 riders from 9 countries',
          'Record Przewalski horse foal count',
          'New ranger station supply route mapped',
          'Covered 1,400 km across Mongolia',
        ],
        impactOverview: {
          en: 'The 2025 rally delivered 4 BMW F 800 GS motorcycles to Hustai National Park. Post-rally ranger reports show a 40% increase in patrol area coverage and zero poaching incidents in the eastern corridor since delivery.',
          mn: '2025 оны ралли Хустайд 4 BMW F 800 GS мотоцикл хүлээлгэн өгсөн. Ралличны дараах цагдаагийн тайлан патрулийн нутаг дэвсгэрийн хамрах хүрээ 40%-иар өссөнийг харуулж байна.',
        },
        conservationActivities: [
          'Anti-poaching patrol ride-along',
          'Wildlife survey support',
          'Ranger supply logistics',
          'Camera trap network expansion',
          'Ranger skills workshop',
        ],
        rangerPartnerships: {
          en: 'Full partnership with Hustai National Park Trust and Mongolian Protected Areas Administration. All donated vehicles were formally registered with the park and carry Hustai insignia.',
          mn: 'Хустайн Национал цэцэрлэгт хүрээлэн болон Монголын хамгаалалтын газартай бүрэн хамтын ажиллагаа. Бэлэглэсэн бүх машин цэцэрлэгт бүртгэгдсэн.',
        },
        targetAudience: ['Past participants', 'Conservation donors', 'Future rally applicants'],
        cost: { amount: 11500, currency: '$' },
      },
    ];

    for (const rallyData of rallies) {
      const rally = await prisma.rally.upsert({
        where: { slug_tenantId: { slug: rallyData.slug, tenantId: tenant.id } },
        update: {
          title: rallyData.title,
          description: rallyData.description,
          location: rallyData.location,
          startDate: rallyData.startDate,
          endDate: rallyData.endDate,
          duration: rallyData.duration,
          status: rallyData.status,
          maxParticipants: rallyData.maxParticipants,
          currentParticipants: rallyData.currentParticipants,
          isRecruiting: rallyData.isRecruiting,
          applicationDeadline: rallyData.applicationDeadline,
          highlights: rallyData.highlights,
          impactOverview: rallyData.impactOverview,
          conservationActivities: rallyData.conservationActivities,
          rangerPartnerships: rallyData.rangerPartnerships,
          targetAudience: rallyData.targetAudience,
          cost: rallyData.cost,
        },
        create: {
          slug: rallyData.slug,
          title: rallyData.title,
          description: rallyData.description,
          location: rallyData.location,
          startDate: rallyData.startDate,
          endDate: rallyData.endDate,
          duration: rallyData.duration,
          status: rallyData.status,
          maxParticipants: rallyData.maxParticipants,
          currentParticipants: rallyData.currentParticipants,
          isRecruiting: rallyData.isRecruiting,
          applicationDeadline: rallyData.applicationDeadline,
          highlights: rallyData.highlights,
          impactOverview: rallyData.impactOverview,
          conservationActivities: rallyData.conservationActivities,
          rangerPartnerships: rallyData.rangerPartnerships,
          targetAudience: rallyData.targetAudience,
          cost: rallyData.cost,
          tenantId: tenant.id,
          createdById: adminUser.id,
        },
      });
      console.log(`✅ Rally upserted: ${rally.slug} (${rally.status})`);
    }

    // ── Stories / Testimonials ──────────────────────────────────────────────────

    const stories = [
      {
        slug: 'michael-torres-mongolia-2025',
        title: { en: 'A Life-Changing 13 Days', mn: '13 өдрийн өөрчлөлт' },
        excerpt: { en: 'Mongolia 2025', mn: 'Монгол 2025' },
        content: {
          en: "This wasn't just a motorcycle trip — it was a life-changing experience. Handing over the bike to the ranger and seeing the hope in his eyes made every kilometer worth it.",
          mn: 'Энэ бол зөвхөн мотоциклийн аялал биш байсан — амьдралыг өөрчлөх туршлага байлаа.',
        },
        author: { en: 'Michael Torres', mn: 'Майкл Торрес' },
        role: 'Rider',
        type: 'TESTIMONIAL' as const,
        status: 'PUBLISHED' as const,
        featured: true,
        displayOrder: 1,
      },
      {
        slug: 'batbold-naran-ranger-story',
        title: { en: 'From Horseback to 90 km Per Day', mn: 'Морины нуруунаас өдрийн 90 км' },
        excerpt: { en: 'Hustai National Park', mn: 'Хустайн Национал цэцэрлэгт хүрээлэн' },
        content: {
          en: "Before Rally for Rangers, I patrolled on foot or horseback. Now I respond to poaching alerts in minutes instead of hours. The motorcycle changed everything about how we protect this land.",
          mn: 'Ралли фор Рэнжерсийн өмнө би явган эсвэл морьтой патрулддаг байсан. Одоо зөрчлийн дохиолол ирэхэд цагийн оронд минутын дотор хүрдэг.',
        },
        author: { en: 'Batbold Naran', mn: 'Батболд Наран' },
        role: 'Park Ranger',
        type: 'TESTIMONIAL' as const,
        status: 'PUBLISHED' as const,
        featured: true,
        displayOrder: 2,
      },
      {
        slug: 'sarah-kim-peru-preview',
        title: { en: 'Why I Applied for Peru 2026', mn: 'Перу 2026-д яагаад өргөдөл гаргасан' },
        excerpt: { en: 'Peru 2026 applicant', mn: 'Перу 2026 өргөдөл гаргагч' },
        content: {
          en: "I've done 14 countries on a motorcycle. None of it felt like this. Leaving the bike behind for a ranger — that's the kind of story I want to carry home.",
          mn: 'Би мотоциклоор 14 орноор явсан. Ганч нь ч ингэж мэдрэгдэхгүй байлаа. Мотоциклоо цагдаад үлдээх — тийм түүхийг авч явмаар байна.',
        },
        author: { en: 'Sarah Kim', mn: 'Сара Ким' },
        role: 'Rider',
        type: 'TESTIMONIAL' as const,
        status: 'PUBLISHED' as const,
        featured: false,
        displayOrder: 3,
      },
      {
        slug: 'hustai-2025-impact-report',
        title: { en: 'Hustai 2025: The Numbers', mn: 'Хустай 2025: Тоо баримт' },
        excerpt: { en: 'Post-rally impact summary', mn: 'Раллийн дараах нөлөөний дүгнэлт' },
        content: {
          en: "Four motorcycles. 16 riders. Nine countries. One park. The 2025 Mongolia rally delivered a 40% increase in patrol coverage to Hustai National Park — and zero poaching incidents in the eastern corridor since delivery.",
          mn: 'Дөрвөн мотоцикл. 16 жолооч. Есөн орон. Нэг парк.',
        },
        author: { en: 'Rally for Rangers Team', mn: 'Ралли фор Рэнжерс баг' },
        role: 'Impact Report',
        type: 'IMPACT' as const,
        status: 'PUBLISHED' as const,
        featured: true,
        displayOrder: 4,
      },
    ];

    for (const storyData of stories) {
      const story = await prisma.story.upsert({
        where: { slug_tenantId: { slug: storyData.slug, tenantId: tenant.id } },
        update: {
          title: storyData.title,
          excerpt: storyData.excerpt,
          content: storyData.content,
          author: storyData.author,
          role: storyData.role,
          type: storyData.type,
          status: storyData.status,
          featured: storyData.featured,
          displayOrder: storyData.displayOrder,
          publishedAt: new Date(),
        },
        create: {
          slug: storyData.slug,
          title: storyData.title,
          excerpt: storyData.excerpt,
          content: storyData.content,
          author: storyData.author,
          role: storyData.role,
          type: storyData.type,
          status: storyData.status,
          featured: storyData.featured,
          displayOrder: storyData.displayOrder,
          publishedAt: new Date(),
          tenantId: tenant.id,
          createdById: adminUser.id,
        },
      });
      console.log(`✅ Story upserted: ${story.slug} (${story.type})`);
    }

    console.log('\n🎉 Rally for Rangers sample data seeded successfully!');
    console.log('\nRallies created:');
    console.log('  • /rallies/mongolia-2026  (UPCOMING, 11/18 spots)');
    console.log('  • /rallies/peru-2026      (UPCOMING, 6/14 spots)');
    console.log('  • /rallies/mongolia-2025  (COMPLETED)');
    console.log('\nTestimonials: 3 rider/ranger stories + 1 impact report');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedRallyData().catch((error) => {
  console.error(error);
  process.exit(1);
});
