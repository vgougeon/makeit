import knex, { Knex } from "knex";
import { Makeit } from "..";
import { Colors, logger } from "../classes/logger.class";
import { Model } from "../classes/model.class";
import { ColumnOptions } from "../interfaces/columnOptions.interface";
import { Through } from "../interfaces/through.interface";

namespace MakeitType {
    export class String {
        maxLength: number;
        constructor(maxLength: number = 255) {
            this.maxLength = maxLength
        }

        public toSQL() {
            return `VARCHAR(${this.maxLength})`
        }

        public schema(table: Knex.CreateTableBuilder, column: any) {
            const t = table.string(column.name, this.maxLength)
            if(column.default) t.defaultTo(column.default)
            console.log(column.default)
        }
    }

    export class Text {
        constructor() {
        }

        public toSQL() {
            return `TEXT`
        }

        public schema(table: Knex.CreateTableBuilder, column: any) {
            const t = table.text(column.name)
            if(column.default) t.defaultTo(column.default)
            
        }
    }

    export class Integer {
        constructor() {
        }

        public toSQL() {
            return `INTEGER`
        }

        public schema(table: Knex.CreateTableBuilder, column: any) {
            const t = table.integer(column.name)
            if(column.default) t.defaultTo(column.default)
        }
    }

    export class Boolean {
        constructor() {
        }

        public toSQL() {
            return `TINYINT(1)`
        }

        public schema(table: Knex.CreateTableBuilder, column: any) {
            const t = table.boolean(column.name)
            if(column.default) t.defaultTo(column.default)
        }
    }

    export class Enum {
        enumerator: any;
        constructor(enumerator: any) {
            this.enumerator = Object.values(enumerator)
        }

        public toSQL() {
            return `VARCHAR(255)`
        }

        public schema(table: Knex.CreateTableBuilder, column: any) {
            const t = table.string(column.name)
            if(column.default) t.defaultTo(column.default)
        }
    }

    export class Date {
        constructor() {
        }

        public toSQL() {
            return `DATETIME`
        }

        public schema(table: Knex.CreateTableBuilder, column: any) {
            if(column.default === 'NOW()') table.dateTime(column.name).defaultTo(Makeit.knex.raw('NOW()'))
            else { 
                const t = table.dateTime(column.name)
                if(column.default) t.defaultTo(column.default)
            }
        }
    }

    export class belongsTo {
        relation: string = 'belongsTo'
        ref: string
        column: string;
        tableName: string;
        autoInclude: boolean = false;
        constructor(tableName: string, column: string = 'id') {
            this.tableName = tableName;
            this.ref = `${tableName}(${column})`
            this.column = column
        }

        public toSQL() {
            return `INTEGER`
        }

        public schema(table: Knex.CreateTableBuilder, column: any) {
            table.integer(column.name)
        }

        public async extra(table: any, column: any) {
            const fk_name = `${table}_${column.name}`
            try {
            await Makeit.pool.query(`
            ALTER TABLE ${table}
            DROP FOREIGN KEY ${fk_name};
            `)
            } catch(err) {}
            await Makeit.pool.query(`
            ALTER TABLE ${table}
            ADD CONSTRAINT ${fk_name}
            FOREIGN KEY (${column.name}) REFERENCES ${this.ref};
            `)
            logger.debug("MYSQL: >   " + Colors.FgBlue + "CREATE FOREIGN KEY " + column.name)
            return true
        }
    }

    export class hasOne {
        relation: string = 'hasOne'
        noColumn: boolean = true; //no row on this.table
        ref: string;
        column: string;
        tableName: string;
        otherSideColumn: string;
        autoInclude: boolean = false;
        constructor(tableName: string, otherSideColumn: string, column: string = 'id') {
            this.tableName = tableName.toLowerCase()
            this.otherSideColumn = otherSideColumn
            this.ref = `${this.tableName}(${column})`
            this.column = column
        }

        public toSQL() {
            return `INTEGER`
        }

        public async extra(table: any, column: any) {
            return true
        }
    }

    export class hasMany {
        relation: string = 'hasMany'
        noColumn: boolean = true; //no row on this.table
        ref: string;
        column: string;
        tableName: string;
        otherSideColumn: string;
        autoInclude: boolean = false;
        constructor(tableName: string, otherSideColumn: string, column: string = 'id') {
            this.tableName = tableName.toLowerCase()
            this.otherSideColumn = otherSideColumn
            this.ref = `${this.tableName}(${column})`
            this.column = column
        }

        public toSQL() {
            return `INTEGER`
        }

        public async extra(table: any, column: any) {
            return true
        }
    }

    export class belongsToMany {
        relation: string = 'belongsToMany'
        noColumn: boolean = true; //no row on this.table
        otherSideColumn: string;
        ref: string
        column: string;
        tableName: string;
        through: any;
        throughOptions: Through
        throughTable: string;
        throughTableField: string;
        throughTableOtherField: string;
        autoInclude: boolean = false;
        constructor(tableName: string, otherSideColumn: string, through: Through = {}) {
            this.tableName = tableName.toLowerCase()
            this.otherSideColumn = otherSideColumn
            this.ref = `${this.tableName}(${'id'})`
            this.column = 'id'
            this.throughOptions = through
        }

        public toSQL() {
            return `INTEGER`
        }

        public async extra(table: any, column: any) {
            logger.debug("MYSQL: >   " + Colors.FgBlue + "BELONGS TO MANY ON " + column.name)
        }
    }
}

export default MakeitType