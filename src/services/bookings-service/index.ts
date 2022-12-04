import { notFoundError, forbiddenError } from "@/errors";
import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import roomRepository from "@/repositories/room-repository";
import { exclude } from "@/utils/prisma-utils";

async function getBooking(userId: number) {
  const booking = await bookingRepository.findBookingByUserId(userId);

  if(!booking) throw notFoundError();

  return exclude(booking, "userId", "roomId", "createdAt", "updatedAt");
}

async function postBookingByRoomId(userId: number, roomId: number) {
  await verifyTicketsPaidWithAccommodation(userId);

  await checkRoomId(roomId);

  const booking = await bookingRepository.createBooking(userId, roomId);

  return exclude(booking, "userId", "roomId", "createdAt", "updatedAt");
}

async function putBookingByRoomIdAndBookingId(userId: number, roomId: number, bookingId: number) {
  const verifyRersevation = await bookingRepository.findBookingByUserId(userId);

  if(!verifyRersevation) throw notFoundError();

  await checkRoomId(roomId);

  const booking = await bookingRepository.updateBooking(bookingId, roomId);

  return exclude(booking, "userId", "roomId", "createdAt", "updatedAt");
}

async function verifyTicketsPaidWithAccommodation(userId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);

  if(!enrollment) throw notFoundError();

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if(!ticket || ticket.status === "RESERVED" || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) throw forbiddenError();
}

async function checkRoomId(roomId: number) {
  const room = await roomRepository.findRoomByRoomId(roomId);

  if(!room) throw notFoundError();

  if(room.Booking.length === room.capacity) throw forbiddenError();
}

const bookingsService = {
  getBooking,
  postBookingByRoomId,
  putBookingByRoomIdAndBookingId
};

export default bookingsService;
