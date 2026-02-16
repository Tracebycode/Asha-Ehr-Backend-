export interface familytype{
    phc_id:string;
    area_id:string;
    asha_id:string;
    head_member_id:string;
    address_line:string;
    landmark:string;
    version:number;
    last_modified_by:string;
    last_modified_role:string;
    last_modified_device:string;
    workflow_status:string;
    device_created_at:string;
    synced_at:string;
    is_active:boolean;
   
}


export interface userType{
    userid:string;
    role:string;
    phc_id:string;
}

export interface familycreateType{
    head_member_id:string;
   address_line:string;
   landmark:string;
   last_modified_device:string;
   device_created_at:string;
}