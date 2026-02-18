import { createFamily ,findAreaByUserId} from "./family.repository";
import { familycreateType } from "./family.types";
import AppError from "../../utils/Apperror";
import pool from "../../lib/db";
import { userjwtType } from "../../types/userjwt";

export async function createFamilyService(family:familycreateType,user:userjwtType){
        const client = await pool.connect();
    try{
        await client.query("BEGIN");

        const area = await findAreaByUserId(user.userid,client);
        if(!area){
            throw new AppError("Area not found",404);
        }
    
    const newFamily = {
        phc_id:user.phc_id,
        area_id:area.area_id,
        asha_id:user.userid,
        head_member_id:family.head_member_id,
        address_line:family.address_line,
        landmark:family.landmark,
        last_modified_by:user.userid,
        last_modified_role:user.role,
        synced_at:family.device_created_at,
        last_modified_device:family.device_name,
    }

    const result = await createFamily(newFamily,client);
    await client.query("COMMIT");
    return result;
}
catch(error){
    await client.query("ROLLBACK");
    throw error;
}
finally{
    await client.release();
}

    
}

export function updateFamily(){
    
}

export function deleteFamily(){
    
}

export function getFamily(){
    
}

export function getAllFamilies(){
    
}