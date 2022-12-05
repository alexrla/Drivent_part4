import { prisma } from "@/config";

async function findBookingByUserId(userId: number) {
  return await prisma.booking.findFirst({
    where: { userId },
    include: { Room: true }
  });
}

async function findBookingByBookingIdAndUserId(id: number, userId: number) {
  return await prisma.booking.findFirst({
    where: { id, userId },
    include: { Room: true }
  });
}

async function createBooking(userId: number, roomId: number) {
  return await prisma.booking.create({
    data: {
      userId,
      roomId
    }
  });
}

async function updateBooking(bookingId: number, roomId: number) {
  return await prisma.booking.update({
    where: { id: bookingId },
    data: { roomId }
  });
}

const bookingRepository = {
  findBookingByUserId,
  findBookingByBookingIdAndUserId,
  createBooking,
  updateBooking
};

export default bookingRepository;
