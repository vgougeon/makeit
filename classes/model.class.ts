import { Makeit } from ".."
import { FindAllOptions, FindOneOptions } from "../interfaces/findOptions";
import { IInclude } from "../interfaces/include.interface";
import { transformIncludes } from "../operators/include";
import { objectify } from "../operators/objectify";
import { populate } from "../operators/populate";
import MakeitType from "../types/types.class";
import { logger, Colors } from './logger.class';
import { validate } from 'class-validator';

export class Model<T> {
    static columns: any[]
    static tableName: string = "";
    public columns: any[]
    static foreignKeys: Function[] = []
    class: any;
    tableName: string;
    foreignKeys: Function[] = []
    constructor() { 
        this.columns = this.columns || []
        this.columns = [{ name: 'id', type: new MakeitType.Integer() }, ...this.columns]
    }

    async init() {
        await this.createTable()
        return await this.createColumns()
    }

    async createTable() {
        const req = `SHOW TABLES LIKE '${this.tableName}'`
        const [results] = await Makeit.pool.query(req)
        if (!results.length) {
            await logger.debug("MYSQL: > " + Colors.BgBlue + "CREATE TABLE " + this.tableName + "...")
            await Makeit.pool.query(`
            CREATE TABLE ${this.tableName}
            (id INT PRIMARY KEY NOT NULL AUTO_INCREMENT)
            `)
        }
        else {
            await logger.debug("MYSQL: > table " + this.tableName + " exists...")
        }
    }

    async createColumns() {
        const req = `DESCRIBE ${this.tableName}`
        const [results] = await Makeit.pool.query(req)
        const fields = results.map((row: any) => row.Field)
        let foreignKeys: Function[] = []
        for (let column of this.columns) {
            if(column.type.relation === 'belongsToMany') continue;
            if(column.type.relation === 'hasOne') continue;
            if(column.type.relation === 'hasMany') continue;

            const def = column.default !== undefined ?
                column.default.constructor?.name === 'Raw' ?
                    `DEFAULT ${column.default.value}` :
                    `DEFAULT '${column.default}'` :
                ``;
            if (!fields.includes(column.name)) {
                const add = `ALTER TABLE ${this.tableName}
                ADD 
                ${column.name} 
                ${column.type.toSQL()} 
                ${def}`
                await Makeit.pool.query(add)
                logger.debug("MYSQL: >   " + Colors.FgCyan + "CREATE ROW " + column.name)

            }
            else {
                logger.debug("MYSQL: >   " + Colors.FgGreen + "OK " + column.name)
            }
            if (column.type.extra) {
                foreignKeys.push(
                    async () => await column.type.extra(this.tableName, column)
                )
            }
        }
        return foreignKeys
    }

    async createRelations() {
        // const req = `DESCRIBE ${this.tableName}`
        // const [results] = await Makeit.pool.query(req)
        // const fields = results.map((row: any) => row.Field)

        for (let column of this.columns) {
            if(column.type.relation === "belongsToMany") {
                const otherSide = Makeit.tables.find((Table) => Table.tableName === column.type.tableName)
                const otherSideColumn = otherSide.columns.find(
                    (otherColumn: any) => otherColumn.name === column.type.otherSideColumn
                )
                if(!otherSideColumn) 
                    logger.error('Unable to find the belongsToMany field linked to ' + this.tableName + '.' +
                    column.name + ' in table ' + otherSide.tableName)
                // logger.debug('MYSQL > Retrieve other side column for ' + column.name + " " + column.type.column)
                // logger.debug('MYSQL > Retrieve class ' + column.name)
                const name = [this.tableName + "_" + column.name, otherSide.tableName + "_" + otherSideColumn.name]
                .sort((a, b) =>  a.localeCompare(b)).join('_')
                let through = undefined
                if(column.type.throughOptions.through)
                    through = Makeit.tables.find((Table) => Table.tableName == column.type.throughOptions.through.toLowerCase())
                column.type.through = through
                //logger.debug('MYSQL > Define name for pivot table')
                column.type.throughTable = column.type.through?.tableName || name;
                const req = `SHOW TABLES LIKE '${column.type.throughTable}'`
                const [results] = await Makeit.pool.query(req)
                if (!results.length) {
                    await logger.debug("MYSQL: > " + Colors.BgBlue + "CREATE PIVOT TABLE " + column.type.throughTable + "...")
                    await Makeit.pool.query(`
                    CREATE TABLE ${column.type.throughTable}
                    (dummy INT)
                    `)
                }
                else {
                    await logger.debug("MYSQL: > pivot table " + column.type.throughTable + " exists...")
                }
                // logger.debug('MYSQL > Check if it exists')
                // logger.debug('MYSQL > ?Create a pivot table')
                const fieldName = column.type.tableName + "Id"
                const otherFieldName = otherSideColumn.type.tableName + "Id"
                column.type.throughTableField = fieldName;
                column.type.throughTableOtherField = otherFieldName
                let [fields] = await Makeit.pool.query( `DESCRIBE ${column.type.throughTable}`)
                fields = fields.map((row: any) => row.Field)
                if(!fields.includes(fieldName)) {
                    // logger.debug('MYSQL > Alter new column for ' +  name)
                    const add = `ALTER TABLE ${column.type.throughTable}
                    ADD ${fieldName} 
                    ${column.type.toSQL()}`
                    await Makeit.pool.query(add)
                }

                const fk_name = `${column.type.throughTable}_${column.name}`
                try {
                    await Makeit.pool.query(`
                    ALTER TABLE ${column.type.throughTable}
                    DROP FOREIGN KEY ${fk_name};
                    `)
                } catch(err) {}
                await Makeit.pool.query(`
                ALTER TABLE ${column.type.throughTable}
                ADD CONSTRAINT ${fk_name}
                FOREIGN KEY (${fieldName}) REFERENCES ${otherSide.tableName}(id)
                ON DELETE CASCADE;
                `)
                //ON DELETE {RESTRICT | NO ACTION | SET NULL | CASCADE};  
                logger.debug("MYSQL: >   " + Colors.FgBlue + "CREATE FOREIGN KEY " + column.name)
                
                if(fields.includes('dummy')) {
                    await Makeit.pool.query(`
                    ALTER TABLE ${column.type.throughTable} DROP COLUMN dummy
                    `)
                }

                if(fields.includes(otherFieldName)) {
                    let [pkeys] = await Makeit.pool.query(`SHOW KEYS FROM ${column.type.throughTable} WHERE Key_name = 'PRIMARY'`)
                    pkeys = pkeys.map((pkey: any) => pkey.Column_name)
                    if(column.type.throughOptions.uniqueLink && pkeys.length > 0 &&
                    !pkeys.includes(fieldName) && !pkeys.includes(otherFieldName)) {
                        await Makeit.pool.query(`
                        ALTER TABLE ${column.type.throughTable} DROP COLUMN id`)
                    }
                    if(!pkeys.includes(fieldName) && !pkeys.includes(otherFieldName)) {
                        //Let this to make a composite key
                        await Makeit.pool.query(`
                        ALTER TABLE ${column.type.throughTable} ADD PRIMARY KEY(${fieldName}, ${otherFieldName});`)
                    }
                }
            }
        }
    }

    async createForeignKeys() {
        for (let fk of this.foreignKeys || []) {
            await fk()
        }
    }

    async create(modelValue: Partial<Omit<T, keyof Model<any>>>) {
        let clone : any = {}
        for(let [index, value] of Object.entries(modelValue)) {
            clone[index] = value
        }
        Object.setPrototypeOf(clone, Object.getPrototypeOf(this))
        const errors = await validate(clone)
        if(errors?.length && errors?.length !== 0) {
            return errors.map((value) => Object.values(value.constraints || {}))
            .reduce((acc, item) => [...acc, ...item], [])
        }
        const req = `INSERT INTO ${this.tableName}(${Object.keys(modelValue).join(', ')})
        VALUES(${Object.keys(modelValue).map(() => "?").join(', ')})
        `
        const [results] = await Makeit.pool.execute(req, Object.values(modelValue))
        return results;
    }

    async update(modelValue: Partial<Omit<T, keyof Model<any>>>) {
        let clone : any = {}
        for(let [index, value] of Object.entries(modelValue)) {
            clone[index] = value
        }
        Object.setPrototypeOf(clone, Object.getPrototypeOf(this))
        const errors = await validate(clone)
        if(errors?.length && errors?.length !== 0) {
            return errors.map((value) => Object.values(value.constraints || {}))
            .reduce((acc, item) => [...acc, ...item], [])
        }
        const req = `UPDATE ${this.tableName} SET (${Object.keys(modelValue).join(', ')})
        VALUES(${Object.keys(modelValue).map(() => "?").join(', ')})
        WHERE id = 1
        `
        const [results] = await Makeit.pool.execute(req, Object.values(modelValue))
        return results;
    }


    async findAll(options: FindAllOptions = {}) {
        options.include = transformIncludes(options.include)
        let [columns, joins] = this.columnList?.(options)

        const items = this.columnListSql?.(columns)
        const req =`
        SELECT ${items} FROM ${this.tableName} ${this.tableName}
        ${joins.join(' ')}
        ${options.where ? 'WHERE ' + options.where : ''}
        ${options.orderBy ? 'ORDER BY ' + options.orderBy : ''}
        ${options.limit ? 'LIMIT ' + options.limit : ''}`
        let [results] = await Makeit.pool.query(req)
        return populate(objectify(results), options, this)
    }

    async findOne(options: FindOneOptions = {}) {
        options.include = transformIncludes(options.include)
        let [columns, joins] = this.columnList(options)

        const items = this.columnListSql(columns)

        const req =`
        SELECT ${items} FROM ${this.tableName} ${this.tableName}
        ${joins.join(' ')}
        ${options.where ? 'WHERE ' + options.where : ''}
        ${options.orderBy ? 'ORDER BY ' + options.orderBy : ''}
        LIMIT 1`
        let [results] = await Makeit.pool.query(req)

        return objectify(results[0], null)

    }

    static async delete(options: { where: string }) {
        const req =`
        DELETE FROM ${this.tableName}
        ${options.where ? 'WHERE ' + options.where : ''}`
        let [results] = await Makeit.pool.query(req)
        return results;
        // return objectify(results[0], null)

    }

    columnListSql(columns: any) {
        return columns.reduce((acc: any, item: any) => {
            if(item.literal) return [...acc, item.literal]
            if(item.type?.noColumn) return acc
            return [...acc,
            `${item.table}.${item.name} '${item.alias || item.table}.${item.name}'`]
        }, []).join(', ')
    }

    columnList(options: any = {}): [any, any] {
        let columns: any[] = []
        let joins: any[] = []
        for (let column of this.columns || []) {
            if((column.select !== false || 
            options.select?.includes('+' + column.name)) &&
            !options.select?.includes('-' + column.name)) {
                    columns.push({ ...column, table: this.tableName })
            }
            if (options.include.find((inc: IInclude) => inc.name === column.name) || column.type.autoInclude) {
                switch(column.type.relation) {
                    case 'belongsTo': this.belongsTo?.(column, columns, joins); break;
                    case 'belongsToMany': this.belongsToMany?.(column, columns, joins); break;
                    case 'hasOne': this.hasOne?.(column, columns, joins); break;
                    case 'hasMany': this.hasMany?.(column, columns, joins); break;
                    case 'default': break;
                }
            }
        }
        return [columns, joins]
    }

    belongsTo(column: any, columns: any[], joins: any[]) {
        const table = Makeit.tables.find((Table) => Table.constructor.name == column.type.tableName)
        let alias = table.tableName + '_' + joins.length
        let on = `${this.tableName}.${column.name} = ${table.tableName}_${joins.length}.${column.type.column}`

        joins.push(`LEFT JOIN ${table.tableName} ${alias || table.tableName} ON ${on}`)
        for (let sub of table.columns) {
            if(!sub.type.noColumn)
                columns.push({ ...sub, table: table.tableName + '_' + (joins.length - 1), alias: this.tableName + '.' + column.name })
        }
    }

    hasOne(column: any, columns: any[], joins: any[]) {
        let alias = column.type.tableName + '_' + joins.length;
        let on = `${this.tableName}.${column.type.column} = ${alias}.${column.type.otherSideColumn}`
        joins.push(`
        LEFT JOIN ${column.type.tableName} ${alias} ON ${on}
        `)

        const table = Makeit.tables.find((Table) => Table.tableName === column.type.tableName)
        for (let sub of table.columns) {
            if(!sub.type.noColumn)
                columns.push({ ...sub, table: alias, alias: this.tableName + '.' + column.name })
        }
    }

    hasMany(column: any, columns: any[], joins: any[]) {
        columns.push({ literal: `(SELECT JSON_ARRAYAGG(${column.type.column}) FROM ${column.type.tableName} 
        WHERE ${column.type.otherSideColumn} = ${this.tableName}.${column.type.column}) as '${this.tableName}.${column.name}'`})
    }

    belongsToMany(column: any, columns: any[], joins: any[]) {
        columns.push({ 
            literal: `
            (SELECT JSON_ARRAYAGG(${column.type.throughTableOtherField}) 
            FROM ${column.type.throughTable} 
            WHERE ${column.type.throughTableField} = ${this.tableName}.${column.type.column}) 
            as '${this.tableName}.${column.name}'
            `
        })
    }

    public getColumns() {
        return this.columns
    }

    public setColumns(value: any) {
        this.columns = value
    }
}