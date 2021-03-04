import { MaxLength, MinLength } from "class-validator";
import MakeitType from "./types/types.class";
import { Column } from "./decorators/decorators"
import { ModelTimestamps } from "./classes/timestamps.class";

export class User extends ModelTimestamps<User> {
    @MinLength(3) @MaxLength(16)
    @Column({ type: new MakeitType.String(16), default: "USERNAME" })
    name: string;

    @Column({ type: new MakeitType.String(255), select: false, default: "PASSWORD" })
    password: string;
}

export default new User()