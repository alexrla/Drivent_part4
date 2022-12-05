import app, { init } from "@/app";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
  createUser,
  createHotel,
  createRoomWithHotelId,
  createBookingByUserIdAndRoomId,
  createEnrollmentWithAddress,
  createTicketType,
  createTicket,
  createTicketTypeRemote,
  createTicketTypeNoHotel,
  createTicketTypeWithHotel,
  findBookingByUserId
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 404 when user doesnt have an booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 and the booking details", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBookingByUserIdAndRoomId(user.id, room.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
      
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        id: booking.id,
        Room: {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          hotelId: room.hotelId,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString()
        }
      });
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token ir not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 400 when not receiving the request body containing the roomId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({});

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when roomId is not a number", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const roomId = faker.name.firstName();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 404 when user doesnt have an enrollment yet", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const roomId = faker.datatype.number();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when user doesnt have a ticket yet", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);

      const roomId = faker.datatype.number();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user doesnt have a ticket paid yet", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketType();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const roomId = faker.datatype.number();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user have a ticket for a event remote", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      const roomId = faker.datatype.number();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user have a ticket for an event not include accomodation", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeNoHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      const roomId = faker.datatype.number();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when roomId does not exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      const roomId = faker.datatype.number({ min: 1000000 });

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when there is no vacancy for the informed roomId", async () => {
      const user1 = await createUser();
      const token1 = await generateValidToken(user1);
      const enrollment1 = await createEnrollmentWithAddress(user1);
      const ticketType1 = await createTicketTypeWithHotel();
      await createTicket(enrollment1.id, ticketType1.id, TicketStatus.PAID);

      const user2 = await createUser();
      // const token2 = await generateValidToken(user2);
      const enrollment2 = await createEnrollmentWithAddress(user2);
      const ticketType2 = await createTicketTypeWithHotel();
      await createTicket(enrollment2.id, ticketType2.id, TicketStatus.PAID);

      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      await createBookingByUserIdAndRoomId(user2.id, room.id);

      const roomId = room.id;

      const response = await server.post("/booking").set("Authorization", `Bearer ${token1}`).send({ roomId });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 200 and bookingId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      const roomId = room.id;

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId });

      const booking = await findBookingByUserId(user.id);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        bookingId: booking.id
      });
    });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const bookingId = faker.datatype.number();

    const response = await server.put(`/booking/${bookingId}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token ir not valid", async () => {
    const token = faker.lorem.word();

    const bookingId = faker.datatype.number();

    const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const bookingId = faker.datatype.number();

    const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 400 when not receiving the request body containing the roomId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const bookingId = faker.datatype.number();

      const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`).send({});

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when roomId is not a number", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const roomId = faker.name.firstName();
      const bookingId = faker.datatype.number();

      const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when router parameter is not a number", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const roomId = faker.datatype.number();
      const bookingId = faker.word.noun();

      const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 404 when the user has no bookings", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const roomId = faker.datatype.number();
      const bookingId = faker.datatype.number();

      const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 when roomId does not exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      const booking = await createBookingByUserIdAndRoomId(user.id, room.id);

      const roomId = faker.datatype.number({ min: 1000000 });
      const bookingId = booking.id;

      const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`).send({ roomId });

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when there are no rooms available", async () => {
      const user1 = await createUser();
      const token1 = await generateValidToken(user1);

      const user2 = await createUser();
      // const token2 = await generateValidToken(user2);

      const hotel = await createHotel();
      const room1 = await createRoomWithHotelId(hotel.id);
      const room2 = await createRoomWithHotelId(hotel.id);

      const booking1 = await createBookingByUserIdAndRoomId(user1.id, room1.id);
      await createBookingByUserIdAndRoomId(user2.id, room2.id);

      const roomId = room2.id;
      const bookingId = booking1.id;

      const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token1}`).send({ roomId });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond status 200 and bookingId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const hotel = await createHotel();
      const room1 = await createRoomWithHotelId(hotel.id);
      const room2 = await createRoomWithHotelId(hotel.id);

      const booking = await createBookingByUserIdAndRoomId(user.id, room1.id);

      const roomId = room2.id;
      const bookingId = booking.id;

      const response = await server.put(`/booking/${bookingId}`).set("Authorization", `Bearer ${token}`).send({ roomId });

      const bookingInfo = await findBookingByUserId(user.id);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        bookingId: bookingInfo.id
      });
    });
  });
});
