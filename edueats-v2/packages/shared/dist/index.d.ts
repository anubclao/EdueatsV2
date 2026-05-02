export type Role = 'admin' | 'student' | 'teacher' | 'staff' | 'visitor';
export interface UserSummary {
    id: string;
    name: string;
    email: string;
    role: Role;
    emailVerified: boolean;
}
