import { NextFunction, Request, Response } from "express";
import AppError from "../../utils/Apperror";
import { syncRequestSchema, tableSchemas, metadata_valiationschema } from "./sync.schema";
import { Tablename } from "./sync.schema";
import { object } from "zod";

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
    try{
        const parsedobj = syncRequestSchema.parse(req.body);

        for(const table of Object.keys(parsedobj) as Tablename[]){
            const schema = tableSchemas[table];
            if(!schema) continue;

            const changes = parsedobj.changes[table];

            for(const change of changes){
                if(change.operation === "delete") continue;

                schema.parse(change.data);

                if(change.metadata){
                    metadata_valiationschema.partial().strict().parse(change.metadata);
                }
            }
        }
        req.body = parsedobj;
        next();

    }catch(error:any){
        const message =
            error?.errors?.[0]?.message ?? "Invalid sync request body";
        throw new AppError(message, 400);
    }


        
};