import Joi from "joi";

export const languageSchema = Joi.object({
  language_code: Joi.string().max(5).required(),
  language_name: Joi.string().max(100).required(),
});
