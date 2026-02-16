import { createFamily ,findAreaByUserId} from "./family.repository";
import { familycreateType, userType } from "./family.types";
import { pool } from "../../config/db";
import AppError from "../../utils/Apperror";

export async function createFamilyService(family:familycreateType,user:userType){
        const client = await pool.connect();
    try{
        client.query("BEGIN");

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
        version:1,
        last_modified_by:user.userid,
        last_modified_role:user.role,
        last_modified_device:family.device_created_at,
        workflow_status:"draft",
        device_created_at:family.device_created_at,
        device_updated_at:family.device_created_at,
        synced_at:family.device_created_at,
        is_active:true,
       
    }

    const result = await createFamily(newFamily,client);
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

export function updateFamily(){
    
}

export function deleteFamily(){
    
}

export function getFamily(){
    
}

export function getAllFamilies(){
    
}