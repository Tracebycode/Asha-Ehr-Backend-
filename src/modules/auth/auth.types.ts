export interface Userdb{
    id: string;
    name: string;
    phone: string;
    gender: string;
    dob: string;
    education_level: string;
    role: string;
    authority_level: number;
    phc_id: string;
    password_hash: string;
    created_by: string;
    approved_by: string;
}


export interface LoginType{
    phone: string;
    password: string;
}



export interface jwtPayloadType{
    userid: string;
    role: string;
    phc_id: string;
}




