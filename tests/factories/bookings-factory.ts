import { prisma } from "@/config";

export async function createBookingByUserIdAndRoomId(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId
    }
  });
}

export async function findBookingByUserId(userId: number) {
  return await prisma.booking.findFirst({
    where: { userId }
  });
}
