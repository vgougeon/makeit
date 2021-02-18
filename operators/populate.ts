import { Makeit } from "../index";
import { FindAllOptions } from "../interfaces/findOptions";
import { IInclude } from './../interfaces/include.interface';

export async function populate(data: any, options: FindAllOptions = {}, baseClass: any) {
    for (let include of options.include as IInclude[]) {
        const col = baseClass.columns.find((c: any) => c.name === include.name)
        if (Array.isArray(data)) {
            for (let item of data) {
                switch (col.type.relation) {
                    case 'hasMany':
                        item[col.name] = await populateRowOf(col.type.tableName, item[col.name], include)
                        break;
                    case 'belongsToMany':
                        item[col.name] = await populateRowOf(col.type.tableName, item[col.name], include)
                        break;
                }
            }
        }
    }
    return data;
}

async function populateRowOf(tableName: string, list: any, include: IInclude) {
    const tb = Makeit.tables.find((Table) => Table.tableName === tableName)
    if (!Array.isArray(list) || list.length < 1) { return [] }
    //SLICE ID ARRAYS WITHOUT OVERFLOW
    return await tb.findAll({
        orderBy: `${tableName}.id DESC`,
        limit: 10,
        where: `${tableName}.id IN (${list.join(',')})`,
        include: include.include || []
        // where: `id IN (${item[col.name].slice(item[col.name].length - 10, item[col.name].length).join(',')})`
    })
}