import { Makeit } from './index';
import User from './tables';

const start = async () => {
    await Makeit.initDb({ database: 'knex' })
    await Makeit.addTables(User)
    await Makeit.useTypes()
    await Makeit.serve()
}

start()

