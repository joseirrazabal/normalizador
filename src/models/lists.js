import mongoose from '../../config/mongo.js'
const Schema = mongoose.Schema

var listSchema = new Schema({
    published: Boolean,
    name: String,
    fixed: Boolean,
    duration: Number,
    pos: Number,
    pieces: Array,
    ocurrences: Array,
    transform: String
})

let List = mongoose.model('Lists', listSchema)

function addList (data) {

  var list = new List(data)

  return new Promise((resolve, reject) => {
    list.save((err, res) => {
      err ? reject(err) : resolve(res)
    })
  })
}

export default { List, addList }
