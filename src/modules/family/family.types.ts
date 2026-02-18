export interface familytype{
    phc_id:string;
    area_id:string;
    asha_id:string;
    head_member_id:string;
    address_line:string;
    landmark:string;
    last_modified_by:string;
    last_modified_role:string;
    last_modified_device:string;
    synced_at:string;
   
}




export interface familycreateType{
    head_member_id:string;
   address_line:string;
   landmark:string;
   device_name:string;
   device_created_at:string;
}