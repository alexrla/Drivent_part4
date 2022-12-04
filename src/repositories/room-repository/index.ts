import { prisma } from "@/config";

async function findRoomByRoomId(roomId: number) {
  return await prisma.room.findFirst({
    where: { id: roomId },
    include: { Booking: true }
  });
}

const roomRepository = {
  findRoomByRoomId
};

export default roomRepository;
