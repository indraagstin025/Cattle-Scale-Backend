import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

interface RequestValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware generik untuk memvalidasi request body, query params, atau url params menggunakan Zod Schema.
 * Jika validasi gagal, melempar response 400 Bad Request terstruktur.
 * 
 * @param schemas Objek skema Zod untuk body, query, dan/atau params
 */
export const validateRequest = (schemas: RequestValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validasi data gagal",
          errors: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
};
