export interface IAuthOptions {
    identityField?: string;
    passwordField?: string;
    registerExtraFields?: string[];
    method?: 'BEARER_TOKEN' | 'COOKIE';
}