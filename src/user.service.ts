import {compare, genSalt, hash} from "bcrypt";
import { Collection, Db } from 'mongodb';
import { User } from './model/user.model';
import { nanoid } from 'nanoid';
import { RegisterDto } from './model/dto/register.dto';
import { LoginDto } from './model/dto/login.dto';

export class UserService {
    users: Collection<User>
    constructor(db: Db) {
        this.users = db.collection('user')
    }

    async register(user: RegisterDto) {
        const { password, verifyPassword, email } = user
        const salt = await genSalt()
        if(password !== verifyPassword) {
            throw new Error("passwords do not match")
        }
        const passwordHash = await hash(password, salt)
        await this.users.insertOne({id: nanoid(),  password: passwordHash, email})

        return true
    }

    async login(credentials: LoginDto) {
        const {email, password} = credentials
        const user = await this.users.findOne({email: email})
        if(user && await compare(password, user.password)) {
            return {email: user.email, id: user.id}
        } else {
            return false
        }
    }

    async getUser(id: string) {
        return this.users.findOne({id})
    }
}