export interface User{
    name: string;
    phone: string;
    gender: string;
    dob: string;
    education_level: string;
    role: string;
    authority_level: number;
    phc_id: string;
    password: string;
    created_by: string;
    approved_by: string;
}


export interface LoginType{
    phone: string;
    password: string;
}



export interface jwtPayloadType{
    id: string;
    role: string;
    phc_id: string;
}


