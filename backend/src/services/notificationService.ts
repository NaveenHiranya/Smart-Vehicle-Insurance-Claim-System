import prisma from '../utils/prisma.js';

export type NotificationType = 'DOC_REMINDER' | 'GARAGE_ESTIMATE' | 'FINAL_VALUE' | 'ADMIN_MESSAGE';

interface CreateInput {
  userId: string;
  claimId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
}

export async function createNotification(input: CreateInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      claimId: input.claimId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  });
}

export async function createNotificationForClaimOwner(
  claimId: string,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> {
  const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: { userId: true } });
  if (!claim) return;
  await createNotification({ userId: claim.userId, claimId, type, title, message });
}

export async function listForUser(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { read: true } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
