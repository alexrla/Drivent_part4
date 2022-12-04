import Joi from "joi";

export const roomIdSchema = Joi.object({
  roomId: Joi.number().integer().required()
});

export const bookingIdSchema = Joi.object({
  bookingId: Joi.number().integer()
});
