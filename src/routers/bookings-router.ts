import { Router } from "express";
import { authenticateToken, validateBody, validateParams } from "@/middlewares";
import { getBooking, postBooking, putBooking } from "@/controllers";
import { roomIdSchema, bookingIdSchema } from "@/schemas";

const bookingsRouter = Router();

bookingsRouter
  .all("/*", authenticateToken)
  .get("/", getBooking)
  .post("/", validateBody(roomIdSchema), postBooking)
  .put("/:bookingId", validateBody(roomIdSchema), validateParams(bookingIdSchema), putBooking);

export { bookingsRouter };
