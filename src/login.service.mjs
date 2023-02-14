import {compare, genSalt, hash} from "bcrypt";

export class LoginService {
    type='user'
    dbService
    constructor(dbService) {
        this.dbService = dbService
    }

    async register(user) {
        const { password, verifyPassword, email } = user
        const salt = await genSalt()
        if(password !== verifyPassword) {
            throw new Error("passwords do not match")
        }
        const passwordHash = await hash(password, salt)
        this.dbService.create(this.type, {password: passwordHash, email})

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