import { Raw } from "../operators/operators.class";
import MakeitType from "../types/types.class";
import { Model } from "./model.class";

export class ModelTimestamps<T> extends Model<T> {
    createdAt: Date;
    updatedAt: Date;
    constructor() {
        super()
        const timestamps = [
            { name: 'createdAt', type: new MakeitType.Date(), default: new Raw('NOW()') },
            { name: 'updatedAt', type: new MakeitType.Date(), default: new Raw('NOW()') }
        ]
        this.columns = [...(this.columns || []), ...timestamps]
    }

}