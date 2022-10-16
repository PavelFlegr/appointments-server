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

    async delete(type, id) {
        const collection = this.db.collection(type)
        return await collection.deleteOne({ id })
    }

    async deleteWhere(type, query) {
        if(!query || Object.keys(query).length === 0) {
            throw Error("empty deletion query is not allowed")
        }
        const collection = this.db.collection(type)
        return await collection.deleteMany(query)
    }

    async find(type, query = {}, sort = { }) {
        const collection = this.db.collection(type)
        const options = {
            sort
        }

        return await collection.find(query, options).project({_id: false}).toArray()
    }

    async findOne(type, query) {
        const collection = this.db.collection(type)

        return await collection.findOne(query, {projection: {_id: false}})
    }
}