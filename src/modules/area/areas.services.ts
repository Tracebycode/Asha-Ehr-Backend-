import { assignareaType, createareaType } from "./area.types";
import pool from "../../lib/db";
import { PoolClient } from "pg";
import { assignarearepo, findAreaByUserId } from "./area.repository";
import AppError from "../../utils/Apperror";
import { userjwtType } from "../../types/userjwt";



export const assignareaservice  = async (data:assignareaType,user:userjwtType)=>{
    const client = await pool.connect();
    try{
        client.query("BEGIN");
        const area = await findAreaByUserId(data.user_id,client);
        if(area){
            throw new AppError("Area already assigned",400);
        }


        const assignment_payload:assignareaType = {
            user_id:data.user_id,
            area_id:data.area_id,
            phc_id:user.phc_id,
            assigned_by:user.userid,
        }

        const result = await assignarearepo(assignment_payload,client);
        client.query("COMMIT");
        return result;
    }
    catch(error){
        client.query("ROLLBACK");
        throw error;
    }
    finally{
        client.release();
    }
    
}