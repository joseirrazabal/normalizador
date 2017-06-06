import fs from 'fs'
import path from 'path'
import moment from 'moment'
import crypto from 'crypto'
import convertir from './ffmpeg.js'
import Media from './models/medias.js'
import Piece from './models/pieces.js'
import List from './models/lists.js'
require('moment-duration-format')

async function processFile(file, destino, job) {
  try {

    console.log("Procesando: "+ file)

    let shaOld = await getHash(file)

    let existFile = await Media.findOneByOldSha(shaOld.sha)

    if (!existFile) {

      let info = await convertir.convertir(file, destino, job)
      await guardar(info, shaOld.sha)
      console.log("Guadado: "+ file)

    } else {
      console.log("Ya existe: "+ file)
    }

    console.log("\n")

  } catch(e) {
    throw new Error(e.message)
  }
}

const getHash = function (file, type) {
  return new Promise((resolve, reject) => {
    const sha = crypto.createHash('sha256')
    const md5 = crypto.createHash('md5')
    const input = fs.createReadStream(file)

    input.on('readable', () => {
      const data = input.read();
      if (data) { 
        sha.update(data);
        md5.update(data);
      } else {
        return resolve({ sha: sha.digest('hex'), md5: md5.digest('hex') })
      }
    })

  })
}

async function ls(dirPath, filter = []) {
  let stat = await fs.statSync(dirPath)

  if (!stat.isDirectory()) {
    var data = path.parse(path.join(dirPath))
    if (filter.indexOf(data.ext.substr(1)) > -1) {
      return [dirPath]
    }
    return []
  }

  let filenames = []
  for (let name of await fs.readdirSync(dirPath)) {
    let result = await ls(path.join(dirPath, name), filter)
    filenames.push(...result)
  }

  return filenames
}

async function guardar(info, shaOld) {
  let file = info.format.filename
  let stats = fs.statSync(file)

  let aFps = (info.streams[0].r_frame_rate || '0.0/1').split('/')
  let fps = aFps[0] ? aFps[0] / aFps[1] : 0.0

  let aspect = (info.streams[0].display_aspect_ratio).split(':') || false

  let aspectSample = (info.streams[0].sample_aspect_ratio || '1:1').split(':')
  let pixel = aspectSample[0] / aspectSample[1]

  let durationraw =
    ('00' + moment.duration(info.format.duration, 'seconds').hours()).slice(-2) + ':' +
    ('00' + moment.duration(info.format.duration, 'seconds').minutes()).slice(-2) + ':' +
    ('00' + moment.duration(info.format.duration, 'seconds').seconds()).slice(-2) + '.' +
    Math.round(('0000' + moment.duration(info.format.duration, 'seconds').milliseconds() /10).slice(-4))

  let sha = await getHash(file)

  let shaNew = sha.sha
  let checksum = sha.md5

  let data = {
    fileOldSha: shaOld,
    fileNewSha: shaNew,
    files: [ info.format.filename ],
    stat: { ...stats },
    ...stats,
    durationraw: durationraw,
    durationsec: info.format.duration || 1,
    synched: !info.format.start_time ? true : '0.000000' ,
    video: {
      container: info.format.format_name.split(',')[0],
      bitrate: info.format.bit_rate && parseInt(info.format.bit_rate) || 0,
      codec: info.streams[0].codec_name || '',
      fps: fps,
      resolution: {
        h: info.streams[0].height || 0,
        w: info.streams[0].width || 0
      },
      aspect: aspect ? aspect[0] / aspect[1] : 0.0,
      aspectString: info.streams[0].display_aspect_ratio || '',
      pixel: pixel,
      pixelString: info.streams[0].sample_aspect_ratio || '1:1',
      resolutionSquare: {
        h: info.streams[0].height,
        w: (pixel == 1 || pixel == 0) ? info.streams[0].width * pixel : info.streams[0].width
      }
    },
    file: file,
    name: path.parse(file).name,
    type: 'video',
    audio: {
      codec: info.streams[0].codec_name,
      sample_rate: info.streams[0].sample_rate || 0,
      channel: info.streams[0].channels == 1 ? 'mono' : info.streams[0].channels == 2 ? 'stereo' : ''
    }
  }

  let media = await Media.addMedia({
    ...data,
    checksum: checksum
  })

  let piece = await Piece.addPiece({
    _id: crypto.createHash('md5').update(Math.round(+new Date()/10).toString()).digest("hex"),
    ...data,
    checksum: media.get("_id"),
    template: 'mediaview',
    notes: '',
    transform: null
  })

  let list = await List.addList({
    published: false,
    name: path.parse(file).name,
    fixed: false,
    duration: parseInt(moment.duration(info.format.duration + 99, 'seconds').format("ssssS")),
    pos: 0,
    pieces: [ piece.get("_id") ],
    ocurrences: [],
    transform: null
  })
}

export default { ls, processFile }
