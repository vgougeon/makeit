import { Controller } from "../classes/controller.class"
import { Route } from "../decorators/controller"

export class ModelController extends Controller {
    static model: any = null
    @Route('get', '/')
    static async get(req: any, res: any) {
        return res.send(await this.model.findAll());
    }

    @Route('get', '/:id')
    static async getById(req: any, res: any) {
        if(isNaN(+req.params.id)) return res.status(400).send('Id must be a number')
        return res.send(await this.model.findOne({ where: `${this.model.tableName}.id = ${req.params.id}`}));
    }

    @Route('delete', '/:id')
    static async delete(req: any, res: any) {
        if(isNaN(+req.params.id)) return res.status(400).send('Id must be a number')
        return res.send(await this.model.delete({ where: `${this.model.tableName}.id = ${req.params.id}`}));
    }

    @Route('post', '/')
    static async create(req: any, res: any) {
        const created = await this.model.create(req.body);
        if(created.insertId) {
            const result = await this.model.findOne({ where: `${this.model.tableName}.id = ${created.insertId}`})
            return res.send(result)
        }
        else return res.status(400).send(created)
    }
}
