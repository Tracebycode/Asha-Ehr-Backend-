import { NextFunction, Request, Response } from "express";
import { userjwtType } from "../../types/userjwt";
import {
    createHealthRecordService,
    deleteHealthRecordService,
    transitionHealthRecordWorkflowService,
    updateHealthRecordService,
} from "./health.services";



// ─── Create ────────────────────────────────────────────────────────────────────
export const createHealthRecordController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        await createHealthRecordService(req.body, user);
        return res.status(201).json({ message: "Health record created successfully" });
    } catch (error) {
        next(error);
    }
};




// ─── Update ────────────────────────────────────────────────────────────────────
export const updateHealthRecordController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        const { id } = req.params as { id: string };
        const record = await updateHealthRecordService(id, req.body, user);
        return res.status(200).json({ message: "Health record updated successfully", record });
    } catch (error) {
        next(error);
    }
};

// ─── Soft delete ───────────────────────────────────────────────────────────────
export const deleteHealthRecordController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        const { id } = req.params as { id: string };
        const record = await deleteHealthRecordService(id, user);
        return res.status(200).json({ message: "Health record deleted successfully", record });
    } catch (error) {
        next(error);
    }
};

// ─── Workflow transition ───────────────────────────────────────────────────────
export const transitionHealthRecordWorkflowController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        const { id } = req.params as { id: string };
        const record = await transitionHealthRecordWorkflowService(id, req.body, user);
        return res.status(200).json({ message: "Workflow updated successfully", record });
    } catch (error) {
        next(error);
    }
};
