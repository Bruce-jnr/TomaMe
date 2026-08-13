import argon2 from 'argon2';
import {
  EventStatus,
  MembershipStatus,
  OrganizationRole,
  OrganizationStatus,
  PaymentProviderName,
  PaymentStatus,
  RecordStatus,
  ResultsVisibility,
  VoteChannel,
  VoteStatus,
} from '@prisma/client';
import { prisma } from '../server/db/prisma.js';

const eventBanner =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBsREj_2knCdzoBU_Q2pJBqYA-IVURMaQVeicw_JaJUmeBYRPvYt-3NvD2h-UF64zWNg416-fYWMg1Gsu3Z0BS8i5QRPblb9z6XvU9nc2dU5-PzQD-DGoMGJQ0XaTxsExy_392PgQlVVnT0vKC7queNeHI7OqqH6x4ElnTQOR96YEoJ3FKyeKiq48_5yiv1tOjUTffSwTlPegOjDE9ADOZDNw8204pf46p0NCXV-2neU1GkMbPHzQiF';

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'ghana-student-awards' },
    update: {},
    create: {
      name: 'Ghana Student Awards',
      slug: 'ghana-student-awards',
      description:
        'Celebrating exceptional students making an impact across Ghana.',
      email: 'organizer@example.com',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const event = await prisma.event.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: 'ghana-student-awards-2026',
      },
    },
    update: {
      status: EventStatus.ACTIVE,
      resultsVisibility: ResultsVisibility.EXACT_TOTALS,
    },
    create: {
      organizationId: organization.id,
      name: 'Ghana Student Awards 2026',
      slug: 'ghana-student-awards-2026',
      description:
        'Vote for the students shaping the future through leadership, creativity, and enterprise.',
      bannerUrl: eventBanner,
      startAt: new Date('2026-08-01T00:00:00Z'),
      endAt: new Date('2026-12-15T23:59:59Z'),
      defaultVotePrice: 100,
      minimumVotes: 1,
      maximumVotesPerTransaction: 500,
      status: EventStatus.ACTIVE,
      resultsVisibility: ResultsVisibility.EXACT_TOTALS,
      webVotingEnabled: true,
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'organizer@tomame.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'TomaMeDev2026!';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
    },
    create: {
      email: adminEmail,
      name: 'TomaMe Organizer',
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
    },
  });
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: admin.id,
      },
    },
    update: {
      role: OrganizationRole.ORGANIZATION_OWNER,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      organizationId: organization.id,
      userId: admin.id,
      role: OrganizationRole.ORGANIZATION_OWNER,
      status: MembershipStatus.ACTIVE,
    },
  });

  const categoryNames = [
    'Entrepreneur of the Year',
    'Student Leader of the Year',
    'Content Creator of the Year',
  ];
  for (const [categoryIndex, categoryName] of categoryNames.entries()) {
    const category = await prisma.category.upsert({
      where: {
        eventId_slug: {
          eventId: event.id,
          slug: `category-${categoryIndex + 1}`,
        },
      },
      update: {},
      create: {
        eventId: event.id,
        name: categoryName,
        slug: `category-${categoryIndex + 1}`,
        displayOrder: categoryIndex,
      },
    });

    const names = [
      ['Ama Mensah', 'Kwame Owusu', 'Efua Boateng'],
      ['Kojo Asare', 'Abena Ofori', 'Yaw Antwi'],
      ['Nana Adjei', 'Akosua Frimpong', 'Kofi Addo'],
    ][categoryIndex]!;

    for (const [candidateIndex, name] of names.entries()) {
      const candidateCode = `${['EOY', 'SLY', 'CCY'][categoryIndex]}${String(candidateIndex + 1).padStart(2, '0')}`;
      await prisma.candidate.upsert({
        where: { eventId_candidateCode: { eventId: event.id, candidateCode } },
        update: {},
        create: {
          organizationId: organization.id,
          eventId: event.id,
          categoryId: category.id,
          name,
          slug: name.toLowerCase().replaceAll(' ', '-'),
          candidateCode,
          slogan: 'Your vote, our shared future.',
          displayOrder: candidateIndex,
          status: RecordStatus.ACTIVE,
          cachedVoteCount: 0,
        },
      });
    }
  }

  await prisma.candidate.updateMany({
    where: { eventId: event.id },
    data: { cachedVoteCount: 0 },
  });
  const candidate = await prisma.candidate.findFirstOrThrow({
    where: { eventId: event.id },
    orderBy: { displayOrder: 'asc' },
  });
  const reference = 'TOMA-2026-DEMO0001';
  const order = await prisma.voteOrder.upsert({
    where: { paymentReference: reference },
    update: {},
    create: {
      organizationId: organization.id,
      eventId: event.id,
      categoryId: candidate.categoryId,
      candidateId: candidate.id,
      quantity: 25,
      unitPrice: 100,
      amount: 2500,
      currency: 'GHS',
      voterPhone: '+233200000001',
      voterEmail: 'voter@example.com',
      channel: VoteChannel.WEB,
      paymentProvider: PaymentProviderName.PAYSTACK,
      paymentReference: reference,
      paymentStatus: PaymentStatus.PAID,
      voteStatus: VoteStatus.CREDITED,
      paidAt: new Date(),
      processedAt: new Date(),
    },
  });
  const payment = await prisma.payment.upsert({
    where: { reference },
    update: {},
    create: {
      organizationId: organization.id,
      orderId: order.id,
      provider: PaymentProviderName.PAYSTACK,
      providerTransactionId: 'PAYSTACK-DEMO-0001',
      reference,
      amount: 2500,
      currency: 'GHS',
      status: PaymentStatus.PAID,
      paymentMethod: 'mobile_money',
      providerPaidAt: new Date(),
    },
  });
  await prisma.voteTransaction.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      organizationId: organization.id,
      eventId: event.id,
      categoryId: candidate.categoryId,
      candidateId: candidate.id,
      orderId: order.id,
      paymentId: payment.id,
      quantity: 25,
      unitPrice: 100,
      amount: 2500,
      currency: 'GHS',
      channel: VoteChannel.WEB,
      paymentReference: reference,
    },
  });
  const ledgerTotals = await prisma.voteTransaction.groupBy({
    by: ['candidateId'],
    where: { eventId: event.id },
    _sum: { quantity: true },
  });
  const adjustmentTotals = await prisma.voteAdjustment.groupBy({
    by: ['candidateId'],
    where: { candidate: { eventId: event.id } },
    _sum: { quantity: true },
  });
  const totals = new Map(
    ledgerTotals.map((item) => [item.candidateId, item._sum.quantity ?? 0]),
  );
  for (const item of adjustmentTotals)
    totals.set(
      item.candidateId,
      (totals.get(item.candidateId) ?? 0) + (item._sum.quantity ?? 0),
    );
  await Promise.all(
    Array.from(totals, ([candidateId, cachedVoteCount]) =>
      prisma.candidate.update({
        where: { id: candidateId },
        data: { cachedVoteCount },
      }),
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
