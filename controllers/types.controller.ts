import { Makeit } from "..";
import { Controller } from "../classes/controller.class"
import { Path, Route } from "../decorators/controller"
const fs = require('fs')
const path = require("path");
@Path('/types')
export class TypesController extends Controller {
    @Route('get', '/')
    static async get(req: any, res: any) {
        const types = []
        for(let table of Makeit.tables) {
            const cols = []
            for(let column of table.columns) {
                cols.push(`${column.name}: ${mapToTypescript(column.type)};`)
            }
            types.push(
`
export interface ${nameToType(table.tableName)} { 
    ${cols.join('\n    ')}
}
`)
        }
        let data = fs.readFileSync(path.resolve(__dirname, './types.html'), 'utf8');
        if(data)
        res.send(data.replace('TYPES_CODE_CONTENT',types.join("\n")));
    }
}

function mapToTypescript(type: any) {
    switch(type.constructor.name) {
        case 'Integer': return 'number';
        case 'String': return 'string';
        case 'Text': return 'string';
        case 'Boolean': return 'boolean';
        case 'belongsToMany': return nameToType(type.tableName) + "[]"
        case 'belongsTo': return nameToType(type.tableName)
        case 'hasOne': return nameToType(type.tableName)
        case 'hasMany': return nameToType(type.tableName) + "[]"
        case 'Enum': return type.enumerator.map((e: any) => `'${e}'`).join(' | ')
    }

    return `${type.constructor.name}`
}

function nameToType(name: string) {
    return 'I' + name.charAt(0).toUpperCase() + name.slice(1)
}