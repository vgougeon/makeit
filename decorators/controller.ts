import { Makeit } from ".."
import { Controller } from "../classes/controller.class"

export function Path(path: string){
    return function (constructor: unknown) {
        const c = constructor as Controller
        for(let route of c.routes) {
            Makeit.router[route.method](path + route.path, route.value.bind(c))
        }
    }
}

export function Route(method: string = "get", path: string = ''): Function {
    return async (target: Controller, propertyKey: string, property: any) => {
        target.routes = [{ method, path, value: property.value }, ...(target.routes || [])]
    }
}

