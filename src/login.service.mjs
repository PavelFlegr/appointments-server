import {compare, genSalt, hash} from "bcrypt";

export class LoginService {
    type='user'
    dbService
    constructor(dbService) {
        this.dbService = dbService
    }

    async register(user) {
        const salt = await genSalt()
        if(user.password !== user.verifyPassword) {
            throw new Error("passwords do not match")
        }
        user.password = await hash(user.password, salt)
        this.dbService.create(this.type, user)

        return true
    }

    async login(credentials) {
        const {email, password} = credentials
        const user = await this.dbService.findOne(this.type, {email: email})
        if(user && await compare(password, user.password)) {
            return {email: user.email, id: user.id}
        } else {
            return false
        }
    }
}