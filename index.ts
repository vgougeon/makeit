import { ServeOptions } from "./interfaces/serve.interfaces";
import * as mysql from 'mysql2/promise';
import { Model } from "./classes/model.class";
import { Colors, logger } from './classes/logger.class';
import { table } from "console";
import { Controller } from "./classes/controller.class";
import { IAuthOptions } from "./interfaces/authOptions.interface";
import { Knex } from "knex";
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const knex = require('knex')

class MakeIt {
    app: any;
    // tables: Model[] = []
    tables: any[] = []
    controllers: any[] = []
    router: any = express.Router()
    middlewares: any[] = []
    public pool: any = null
    public knex: Knex
    constructor() { 
        logger.notify("Launching server...")
    }

    debug() {
        logger.isDebug = true
    }

    async initDb(options: ServeOptions) {
        await this.mysqlConnect(options)
    }

    async serve() {
        await this.expressStart()
    }

    async expressStart() {
        logger.debug(`ExpressJS: > ${Colors.FgCyan}starting`)
        const app = express()
        app.use(cookieParser())
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cors());
        for(let middleware of this.middlewares) {
            app.use(middleware)
        }
        app.use('', this.router)
        
        const port = 3000

        await app.listen(port)
        logger.notify(`ExpressJS > ${Colors.FgCyan}started on port ${port}`)
    }
    async mysqlConnect(options: ServeOptions) {
        logger.debug("MYSQL: connection")
        try {
            this.pool = await mysql.createPool({
                host: options.host || 'localhost',
                user: options.username || 'root',
                password: options.password || '',
                database: options.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            await this.pool.getConnection()
            logger.notify(`MYSQL > ${Colors.FgCyan}connected!`)
        } catch(err) { 
            logger.error(`Couldn't connect to database ${options.database} on ${options.host || 'localhost'}:3306`)
        }

        logger.debug("KNEX: connection")
        this.knex = knex({
            client: 'mysql',
            connection: {
              host : options.host || 'localhost',
              user : options.username || 'root',
              password : options.password || '',
              database : options.database
            }
        });

        return true
    }

    async addTable(table: Model<any>) {
        this.tables.push(table)
    }

    async addTables(...tables: Model<any>[]) {
        for(let table of tables) {
            table.tableName = table.constructor.name.toLowerCase()
            const foreignKeys = await table.init()
            table.foreignKeys = foreignKeys
            this.tables.push(table)
        }

        for(let table of this.tables) {
            await table.createRelations()
        }

        for(let table of this.tables) {
            await table.createForeignKeys()
        }
        return true
    }

    async addControllers(...controllers: typeof Controller[]) {
        for(let Controller of controllers) {
            this.controllers.push(Controller)
        }
    }
    async useAuth(model: any, options: IAuthOptions = {}) {
        const {AuthController} = await import("./controllers/auth.controller")
        AuthController.model = model
        AuthController.options = options
        this.middlewares.push(async (req: any, res: any, next: Function) => {
            req.user = await AuthController.auth(req.cookies?.Authentication)
            next()
        })
        this.controllers.push(AuthController)
    }

    async useTypes() {
        const {TypesController} = await import("./controllers/types.controller")
        this.controllers.push(TypesController)
    }
}

export const Makeit = new MakeIt()