import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

async function convertir(file, destino, job) {

  let datos = await info(file)

  var loud_target = { "il": -16, "lra": 11, "tp": -1.5, "format": "json", "linear": true }
  var get_loud = `loudnorm=I=${loud_target.il}:TP=${loud_target.tp}:LRA=${loud_target.lra}:print_format=${loud_target.format}`

  var salida = await getDataLoudNorm(file, destino, get_loud, job, datos.streams[0].nb_frames)

  var loud = `loudnorm=print_format=${loud_target.format}:linear=${loud_target.linear}:I=${loud_target.il}:LRA=${loud_target.lra}:tp=${loud_target.tp}:measured_I=${salida.input_i}:measured_LRA=${salida.input_lra}:measured_tp=${salida.input_tp}:measured_thresh=${salida.input_thresh}:offset=${salida.target_offset}`

  await normalizar(file, destino, loud, job, datos.streams[0].nb_frames)
  await thumbnail(file, destino)

  datos = await info(path.join(destino, path.parse(file).name + '.mp4'))

  if (!datos) {
    throw new Error("Error al convertir " + file)
  }

  return datos
}

const info = function (file) {
  return new Promise((resolve, reject) => {
    ffmpeg(file)
      .ffprobe((err, data) => {
        return resolve(data)
      })
  })
}

const thumbnail = function (file, destino) {
  return new Promise((resolve, reject) => {
    var fileName = path.parse(file).name
    if (!fs.existsSync(path.join(destino, fileName) + '-thumbnail.png')) {
      ffmpeg(file)
        .screenshots({
          timestamps: ['5%'],
          filename: fileName + '_thumbnail.png',
          folder: path.join(destino)
        })
        .on('end', function() {
          resolve()
        })
    } else {
      resolve()
    }
  })
}

const getDataLoudNorm = function (file, destino, loud, job, framesTotal) {
  var contador = 0
  return new Promise((resolve, reject) => {
    ffmpeg(file)
      .withAudioFilter(loud)
      .addOption('-f', 'null')
      .on('error', function(err) {
        reject('An error occurred: ' + err.message)
      })
      .on('progress', function(progress) {
        job.progress(progress.frames, framesTotal)
      })
      .on('end', function(stdout, stderr){
        var salida = (stdout + stderr).split('{')[1]
        salida = JSON.parse('{' + salida)
        resolve(salida)
      })
      .saveToFile('/dev/null')
  })
}

const normalizar = function (file, destino, loud, job, framesTotal) {
  var contador = 0
  return new Promise((resolve, reject) => {
    ffmpeg(file)
      .audioFilters(loud)
      .audioCodec('libfdk_aac')
      // .audioCodec('aac')
      .audioFrequency(48000)
      .audioChannels(2)
      .videoCodec('libx264')
      .outputOptions('-crf 18')
      // .videoCodec('libx265')
      // .outputOptions('-crf 22')
      .outputOptions('-preset slow')
      .on('error', function(err) {
        reject('An error occurred: ' + err.message)
      })
      .on('progress', function(progress) {
        job.progress(progress.frames, framesTotal)
      })
      .on('end', function() {
        resolve()
      })
      .save( path.join(destino, path.parse(file).name + ".mp4") )
  })
}

export default { convertir }
