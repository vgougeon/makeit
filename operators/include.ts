import { IInclude } from "../interfaces/include.interface";

export function transformIncludes(include: (string|IInclude)[] | undefined): IInclude[] {
    if(!include) return []
    return include.map((inc) => typeof(inc) == 'string' ? { name: inc } : inc)
}