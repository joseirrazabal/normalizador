import mongoose from '../config/mongo.js'
const Schema = mongoose.Schema

var pieceSchema = new Schema({
  _id: String,
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
  checksum: String,
  template: String,
  notes: String,
  transform: String
})

let Piece = mongoose.model('Pieces', pieceSchema)

function addPiece (data) {

  var piece = new Piece(data)

  return new Promise((resolve, reject) => {
    piece.save((err, res) => {
      err ? reject(err) : resolve(res)
    })
  })
}

export default { Piece, addPiece }
