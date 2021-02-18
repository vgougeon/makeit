import { IInclude } from "./include.interface";

interface findOptions {
    include?: (string | IInclude)[]
    where?: string;
    orderBy?: string;
    limit?: string;
    select?: string[]
}
export interface FindAllOptions extends findOptions {}
export interface FindOneOptions extends findOptions {}