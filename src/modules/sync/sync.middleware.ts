import { NextFunction, Request, Response } from "express";
import AppError from "../../utils/Apperror";
import { syncRequestSchema, tableSchemas, metadata_valiationschema } from "./sync.schema";

/**
 * Validate and coerce the incoming sync request body against the Zod schema.
 * On failure, throws a 400 AppError with the first Zod issue as context.
 * 
 * 
 * 
 * 
 */


export const validateSyncRequest = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const parsed = syncRequestSchema.parse(req.body);


         for (const table in parsed.changes) {

    const schema = tableSchemas[table];
    if (!schema) continue; // tasks skip

    const changes = parsed.changes[table];

    for (const change of changes) {
      // DELETE → skip data validation
      if (change.operation === "delete") continue;
      schema.parse(change.data);

      if (change.metadata) {
        metadata_valiationschema.partial().strict().parse(change.metadata);
      }
    }
  }
        req.body = parsed;
        next();
    } catch (error: any) {
        const message =
            error?.errors?.[0]?.message ?? "Invalid sync request body";
        throw new AppError(message, 400);
    }
};
