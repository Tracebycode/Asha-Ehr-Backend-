import { NextFunction, Request, Response } from "express";
import { userjwtType } from "../../types/userjwt";
import {
    createMemberService,
    deleteMemberService,
    transitionMemberWorkflowService,
    updateMemberService,
} from "./member.services";




// ─── Create ────────────────────────────────────────────────────────────────────
export const createMemberController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        const member = await createMemberService(req.body, user);
        return res.status(201).json({ message: "Member created successfully", member });
    } catch (error) {
        next(error);
    }
};



// ─── Update ────────────────────────────────────────────────────────────────────
export const updateMemberController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        const { id } = req.params as { id: string };
        const member = await updateMemberService(id, req.body, user);
        return res.status(200).json({ message: "Member updated successfully", member });
    } catch (error) {
        next(error);
    }
};



// ─── Soft delete ───────────────────────────────────────────────────────────────
export const deleteMemberController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        const { id } = req.params as { id: string };
        const member = await deleteMemberService(id, user);
        return res.status(200).json({ message: "Member deleted successfully", member });
    } catch (error) {
        next(error);
    }
};




// ─── Workflow transition ───────────────────────────────────────────────────────
export const transitionMemberWorkflowController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user as userjwtType;
        const { id } = req.params as { id: string };
        const member = await transitionMemberWorkflowService(id, req.body, user);
        return res.status(200).json({ message: "Workflow updated successfully", member });
    } catch (error) {
        next(error);
    }
};
