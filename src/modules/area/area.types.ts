export interface assignareaType{
    user_id:string;
    area_id:string;
    phc_id:string;
    assigned_by:string;
}

export interface createareaType{
    area_name:string;
    phc_id:string;
    created_by:string;
    updated_by:string;
    is_active:boolean;
}


export interface userType{
    userId:string;
    role:string;
    phc_id:string;
}
