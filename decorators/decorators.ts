import { Model } from "../classes/model.class"
import 'reflect-metadata';
import { ColumnOptions } from '../interfaces/columnOptions.interface';
import MakeitType from "../types/types.class";
import { applyMixins } from "../operators/mixin";
import { ModelTimestamps } from './../classes/timestamps.class';

export function Column(options: ColumnOptions): Function {
    return async (target: Model<any>, propertyKey: string) => {
        if (target.getColumns()) 
            target.setColumns([...target.getColumns(), { name: propertyKey, ...options }])
        else target.setColumns([{ name: propertyKey, ...options }])
    }
}

export function AutoInclude(): Function {
    return async (target: Model<any>, propertyKey: string) => {
        target.columns.find((c: any) => c.name === propertyKey).type.autoInclude = true;
        console.log(target.columns.find((c: any) => c.name === propertyKey))
    }
}

export function Timestamps(ctor: any): Function {
    return async() => {
        applyMixins(ctor, [ModelTimestamps])
    }
}