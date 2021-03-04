import { Controller } from "../classes/controller.class"
import { Path, Route } from "../decorators/controller"
import { IAuthOptions } from "../interfaces/authOptions.interface"
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
@Path('/auth')
export class AuthController extends Controller {
    static model: any = null
    static options: IAuthOptions = {};
    @Route('post', '/login')
    static async login(req: any, res: any) {
        if(!req.body[this.options.identityField || 'username']) 
            return res.status(400).send(`${this.options.identityField || 'username'} not provided`)
        if(!req.body[this.options.passwordField || 'password']) 
            return res.status(400).send(`${this.options.passwordField || 'password'} not provided`)
        const user = await this.model.findOne({ 
            where: `${this.model.tableName}.${this.options.identityField || 'username'} = '${req.body[this.options.identityField || 'username']}'`,
            select: [`+${this.options.passwordField || 'password'}`]
        })
        if(!user) return res.status(401).send('wrong-combination')
        if(!await bcrypt.compare
            (req.body[this.options.passwordField || 'password'], 
            user[this.options.passwordField || 'password'])
        ) return res.status(401).send('wrong-combination')
        const token = await jwt.sign({ id: user.id }, 'SECRET_KEY')
        if(this.options.method === 'COOKIE') {
            res.cookie('Authentication', token, {
                maxAge: 7200000,
                httpOnly: true,
            });
        }
        delete user.password
        return res.send(user)
    }

    @Route('post', '/register')
    static async register(req: any, res: any) {
        console.log("register attempt")
        const user = await this.model.findOne({ 
            where: `${this.model.tableName}.${this.options.identityField || 'username'} = '${req.body[this.options.identityField || 'username']}'`
        })
        if(user) return res.status(400).send(`${this.options.identityField || 'username'} already exists`)
        const password = await bcrypt.hash(req.body[this.options.passwordField || 'password'], 10);
        const createdUser = {
            [this.options.identityField || 'username']: req.body[this.options.identityField || 'username'],
            [this.options.passwordField || 'password']: password
        }
        for(let extra of (this.options.registerExtraFields || [])) {
            if(!req.body[extra]) return res.status(400).send(`${extra} field missing !`)
            createdUser[extra] = req.body[extra]
        }
        
        const request = await this.model.create(createdUser)
        if(!request.insertId) return res.status(400).send(request)
        const token = await jwt.sign({ id: request.insertId }, 'SECRET_KEY')
        if(this.options.method === 'COOKIE') {
            res.cookie('Authentication', token, {
                maxAge: 7200000,
                httpOnly: true,
            });
        }
        return res.send({ success: true })
    }

    @Route('get', '/me')
    static async me(req: any, res: any) {
        if(req.user) res.send(req.user)
        else res.status(401).send({ success: false })
    }

    @Route('post', '/logout')
    static async logout(req: any, res: any) {
        res.clearCookie('Authentication');
        return res.status(200).send({ success: true })
    }

    static async auth(token: string) {
        if(!token) return null;
        let decoded = await jwt.verify(token, 'SECRET_KEY');
        return await this.model.findOne({ where: `${this.model.tableName}.id = ${decoded.id}` })
    }
}
