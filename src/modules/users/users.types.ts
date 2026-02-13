export interface userType{
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
}

export interface userdecoded{
    id: string;
    role: string;
    phc_id: string;
}