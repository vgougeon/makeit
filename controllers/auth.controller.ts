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
        const user = await this.model.findOne({ 
            where: `${this.options.identityField || 'username'} = '${req.body.identity}'`,
            select: [`+${this.options.passwordField || 'password'}`]
        })
        if(!await bcrypt.compare(req.body.password, user.password)) return res.send('wrong combination')
        const token = await jwt.sign({ id: user.id }, 'SECRET_KEY')
        if(this.options.method === 'COOKIE') {
            res.cookie('Authentication', token, {
                maxAge: 7200000,
                httpOnly: true,
            });
        }
        return res.send('SUCCESS !')
    }

    @Route('get', '/me')
    static async me(req: any, res: any) {
        res.send('/me')        
    }

    static async auth(token: string) {
        if(!token) return null;
        let decoded = await jwt.verify(token, 'SECRET_KEY');
        return await this.model.findOne({ where: `id = ${decoded.id}` })
    }
}
