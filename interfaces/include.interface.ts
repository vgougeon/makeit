export interface IInclude {
    name: string;
    columns?: string[];
    limit?: number;
    offset?: number;
    include?: (string|IInclude)[]
}