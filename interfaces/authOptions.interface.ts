export interface IAuthOptions {
    identityField?: string;
    passwordField?: string;
    method?: 'BEARER_TOKEN' | 'COOKIE';
}