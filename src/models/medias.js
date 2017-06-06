import mongoose from '../config/mongo.js'
const Schema = mongoose.Schema

var mediaSchema = new Schema({
  fileOldSha: String,
  fileNewSha: String,
  files: String,
  stat: Object,
  durationraw: String,
  durationsec: String,
  synched: String,
  video: {
    container: String,
    bitrate: Number,
    codec: String,
    fps: String,
    resolution: {
      h: Number,
      w: Number
    },
    aspect: Number,
    aspectString: String,
    pixel: String,
    pixelString: String,
    resolutionSquare: {
      h: Number,
      w: Number
    }
  },
  file: String,
  name: String,
  type: String,
  audio: {
    codec: String,
    sample_rate: String,
    channel: String
  },
  checksum: String
})

let Media = mongoose.model('Medias', mediaSchema)

function addMedia (data) {

  var media = new Media(data)

  return new Promise((resolve, reject) => {
    media.save((err, res) => {
      err ? reject(err) : resolve(res)
    })
  })
}

function findOneByOldSha(oldSha) {
  let query = Media.findOne({ $or: [ {fileOldSha: oldSha }, {fileNewSha: oldSha } ] })

  return query.exec().then( result => {
    return result
  })
}

export default { Media, addMedia, findOneByOldSha }
