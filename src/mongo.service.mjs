import {MongoClient} from 'mongodb'
import {v4 as uuid} from "uuid";

export class MongoService {
    client
    db
    constructor(mongoUri, dbName) {
        this.client = new MongoClient(mongoUri)
        this.db = this.client.db(dbName)
    }

    async get(type, id) {
        const collection = this.db.collection(type)
        return await collection.findOne({ id }, {projection: {_id: false}})
    }

    async create(type, object) {
        object.id = uuid()
        const collection = this.db.collection(type)
        return collection.insertOne(object, {forceServerObjectId: true})
    }

    async update(type, id, data) {
        const collection = this.db.collection(type)
        return await collection.updateOne({id}, {$set: {...data}})
    }

    async remove(type, id) {

    }

    async find(type, query = {}) {
        const collection = this.db.collection(type)

        return await collection.find(query).project({_id: false}).toArray()
    }
}