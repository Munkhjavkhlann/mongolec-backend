import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'cmh4hw7vl0001hc87f9vk5h6q';
const ADMIN_USER_ID = 'cmon9it4d0001fim5c5e1injh';

async function seedTeamMembers() {
  const members = [
    {
      name: 'Sarah Mitchell',
      role: 'Founder & Executive Director',
      bio: 'Former wildlife ranger turned conservation advocate. Sarah spent 8 years patrolling protected areas in East Africa before founding Rally for Rangers to close the motorcycle gap for rangers worldwide.',
      displayOrder: 1,
    },
    {
      name: 'James Osei',
      role: 'Head of Operations',
      bio: 'Logistics expert with 12 years coordinating expedition routes across challenging terrain. James ensures every rally delivers motorcycles safely and on schedule.',
      displayOrder: 2,
    },
    {
      name: 'Amara Nkosi',
      role: 'Partnerships Director',
      bio: 'Amara builds relationships with national park authorities, ranger unions, and local NGOs across 14 countries to ensure our motorcycles reach the rangers who need them most.',
      displayOrder: 3,
    },
    {
      name: 'Tenzin Dorje',
      role: 'Lead Route Planner',
      bio: 'Himalayan expedition guide and motorcycle enthusiast. Tenzin has designed rally routes through Mongolia, Nepal, and Bhutan — balancing adventure with safety and community impact.',
      displayOrder: 4,
    },
    {
      name: 'Elena Vasquez',
      role: 'Community & Rider Relations',
      bio: 'Adventure rider and conservation educator. Elena manages our rider community, pre-rally briefings, and post-rally impact reports so every participant understands their contribution.',
      displayOrder: 5,
    },
    {
      name: 'Batbold Gantulga',
      role: 'Mongolia Country Lead',
      bio: 'Born in Övörkhangai, Batbold coordinates our Mongolia operations, working directly with rangers in Hustai National Park and the surrounding protected steppe landscapes.',
      displayOrder: 6,
    },
  ];

  for (const member of members) {
    await prisma.teamMember.upsert({
      where: {
        id: `team-rfr-${member.displayOrder}`,
      },
      update: {},
      create: {
        id: `team-rfr-${member.displayOrder}`,
        ...member,
        isActive: true,
        tenantId: TENANT_ID,
      },
    });
  }

  console.log(`✅ Created ${members.length} team members`);
}

async function seedTestimonials() {
  const testimonials = [
    {
      id: 'testimonial-rfr-1',
      slug: 'ranger-chinzorig-testimonial',
      title: { en: 'How a motorcycle changed my patrol coverage', mn: 'Мотоцикл миний эргүүлийг хэрхэн өөрчилсөн' },
      excerpt: { en: 'Before the rally, I covered 12km on foot each day. Now I patrol over 80km.', mn: 'Ралли хүрэхээс өмнө би өдөр бүр 12 км явган явдаг байсан. Одоо би 80 км илүү газрыг хамгаалдаг.' },
      content: {
        blocks: [
          {
            type: 'paragraph',
            data: { text: 'Before the Rally for Rangers delivered a motorcycle to our station, I spent 4 hours each morning just reaching the eastern border of the park on foot. Poachers knew our patrol schedule because we were so predictable — limited by how far our legs could carry us.' },
          },
          {
            type: 'paragraph',
            data: { text: 'The day the riders arrived, I remember feeling overwhelmed. These people had ridden thousands of kilometers just to hand us the keys to a Honda CRF300L. That motorcycle changed everything. My coverage went from 12km a day to over 80km. I intercepted three illegal hunting parties in the first month alone.' },
          },
          {
            type: 'paragraph',
            data: { text: 'Conservation is not just about laws — it is about presence. Now we have presence.' },
          },
        ],
      },
      author: { en: 'Chinzorig Batsaikhan', mn: 'Чинзориг Батсайхан' },
      role: 'Senior Ranger, Hustai National Park',
      type: 'TESTIMONIAL',
      status: 'PUBLISHED',
      publishedAt: new Date('2025-11-15'),
      featured: true,
      displayOrder: 1,
    },
    {
      id: 'testimonial-rfr-2',
      slug: 'rider-anna-chen-testimonial',
      title: { en: 'The ride that made me understand why conservation matters', mn: 'Хамгааллын ач холбогдлыг ойлгоход хүргэсэн аялал' },
      excerpt: { en: "I came for the adventure. I left with a completely different understanding of what it means to protect wild places.", mn: 'Би адал явдлын төлөө ирсэн. Гэвч зэрлэг газруудыг хамгаалах гэдэг юу болохыг огт өөрөөр ойлгон явлаа.' },
      content: {
        blocks: [
          {
            type: 'paragraph',
            data: { text: "I'm a software engineer from San Francisco. I had never thought deeply about wildlife conservation — I cared about nature, sure, but in an abstract way. Then I signed up for the Mongolia Rally on a whim after seeing it on Instagram." },
          },
          {
            type: 'paragraph',
            data: { text: 'Twelve days across the Mongolian steppe, sleeping under more stars than I thought existed, eating with nomadic families, and finally — handing the keys of a motorcycle to Ranger Chinzorig at Hustai. The look on his face is something I will carry for the rest of my life.' },
          },
          {
            type: 'paragraph',
            data: { text: 'I booked next year\'s Peru rally the same week I got home. I also recruited three colleagues. This is not tourism — it is participation.' },
          },
        ],
      },
      author: { en: 'Anna Chen', mn: 'Анна Чен' },
      role: 'Rider, Mongolia Rally 2024',
      type: 'TESTIMONIAL',
      status: 'PUBLISHED',
      publishedAt: new Date('2025-10-02'),
      featured: true,
      displayOrder: 2,
    },
    {
      id: 'testimonial-rfr-3',
      slug: 'ranger-amara-diallo-testimonial',
      title: { en: 'Two rangers, one motorcycle, ten thousand hectares', mn: 'Хоёр хамгаалагч, нэг мотоцикл, арван мянган гектар' },
      excerpt: { en: "We used to lose track of elephant herds for days. Now we track them in real time.", mn: 'Бид заан сүрэгтэй хэдэн хоног холдсон байдаг байлаа. Одоо бид тэднийг бодит цагт хянадаг.' },
      content: {
        blocks: [
          {
            type: 'paragraph',
            data: { text: 'Our reserve in southern Senegal covers more than 10,000 hectares of savanna and forest. There are only four of us assigned to patrol it. For years, we managed with bicycles and a single rusting jeep.' },
          },
          {
            type: 'paragraph',
            data: { text: 'When Rally for Rangers delivered two motorcycles to our station last year, we split the patrol zones between us and began double-coverage for the first time. Elephant poaching incidents dropped by 60% in the six months following. We know because we documented them.' },
          },
          {
            type: 'paragraph',
            data: { text: 'Equipment matters. Presence matters. Please keep sending riders.' },
          },
        ],
      },
      author: { en: 'Amara Diallo', mn: 'Амара Диалло' },
      role: 'Wildlife Warden, Casamance Reserve, Senegal',
      type: 'TESTIMONIAL',
      status: 'PUBLISHED',
      publishedAt: new Date('2025-09-18'),
      featured: false,
      displayOrder: 3,
    },
    {
      id: 'testimonial-rfr-4',
      slug: 'rider-marco-ferrari-testimonial',
      title: { en: 'I expected a road trip. I got a perspective shift.', mn: 'Би замын аялалыг хүлээж байсан. Харин гэнэт л дэлхийг өөр нүдээр харах боллоо.' },
      excerpt: { en: 'The landscape was breathtaking. But watching rangers receive their motorcycles — that was the moment that broke me open.', mn: 'Байгаль үзэсгэлэнтэй байсан. Гэхдээ хамгаалагчид мотоцикл хүлээн авах тэр мөч — тэр л намайг гүнзгий хөдөлгөлөө.' },
      content: {
        blocks: [
          {
            type: 'paragraph',
            data: { text: 'I rode motorcycles in the Alps for twenty years before a friend convinced me to join the Peru Rally. I expected stunning scenery and a good ride. What I got was a complete recalibration of what adventure means.' },
          },
          {
            type: 'paragraph',
            data: { text: 'The Andean passes were harder than anything I had ridden in Europe. But that was almost irrelevant by the time we reached the ranger station in the cloud forest. Eight rangers lined up. We handed over eight bikes. One woman started crying — she told us through an interpreter that the motorcycle meant she could finally do the job she had trained for.' },
          },
          {
            type: 'paragraph',
            data: { text: 'I have done a lot of rides. This is the only one I have ever told my children about.' },
          },
        ],
      },
      author: { en: 'Marco Ferrari', mn: 'Марко Феррари' },
      role: 'Rider, Peru Rally 2024',
      type: 'TESTIMONIAL',
      status: 'PUBLISHED',
      publishedAt: new Date('2025-08-29'),
      featured: false,
      displayOrder: 4,
    },
    {
      id: 'testimonial-rfr-5',
      slug: 'ranger-pema-wangchuk-testimonial',
      title: { en: 'Protecting snow leopards with the tools to actually do it', mn: 'Ирвэсийг хамгаалахад шаардлагатай хэрэгслийг эцэст нь авлаа' },
      excerpt: { en: 'Snow leopards range across 40km in a single night. We had to cover that ground too — and now we can.', mn: 'Ирвэс нэг шөнөдөө 40 км нутгаар нүүдэллэдэг. Тэр газрыг бид ч хамарч чаддаг болсон.' },
      content: {
        blocks: [
          {
            type: 'paragraph',
            data: { text: "Snow leopards do not respect park boundaries. They move 40 to 60 kilometers in a single night when tracking prey. For years, I could only monitor the two or three kilometers around my station on foot. I knew there were traps being set in the high valleys — I just couldn't get there fast enough." },
          },
          {
            type: 'paragraph',
            data: { text: 'The Rally for Rangers motorcycle arrived in late autumn, just before the snowfall. I used it throughout winter to patrol altitudes above 4,000 meters. We documented 14 snow leopard sightings that season — the most in a decade. And we removed 23 traps before any animal stepped into them.' },
          },
          {
            type: 'paragraph',
            data: { text: 'Tell the riders who brought this: the leopards are still here. Because of them.' },
          },
        ],
      },
      author: { en: 'Pema Wangchuk', mn: 'Пема Вангчук' },
      role: 'Park Warden, Jigme Dorji National Park, Bhutan',
      type: 'TESTIMONIAL',
      status: 'PUBLISHED',
      publishedAt: new Date('2025-07-10'),
      featured: false,
      displayOrder: 5,
    },
  ];

  for (const testimonial of testimonials) {
    await prisma.story.upsert({
      where: { slug_tenantId: { slug: testimonial.slug, tenantId: TENANT_ID } },
      update: {},
      create: {
        ...testimonial,
        type: testimonial.type as any,
        status: testimonial.status as any,
        tenantId: TENANT_ID,
        createdById: ADMIN_USER_ID,
      },
    });
  }

  console.log(`✅ Created ${testimonials.length} testimonials`);
}

async function main() {
  console.log('🌱 Seeding Rally for Rangers data...');
  await seedTeamMembers();
  await seedTestimonials();
  console.log('🎉 Rally for Rangers seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
