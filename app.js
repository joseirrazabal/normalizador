import chokidar from 'chokidar'
import normalizar from './src/search.js'
import kue from 'kue'
const queue = kue.createQueue()

let dir = '/media/work'
let destino = '/media/prueba'
let filter = ["mp4", "avi"]

run(dir, filter, destino)


async function run(dir, filter, destino) {
  try {
    await normalizar.procesar(dir, filter, destino)

    var watcher = chokidar.watch(dir, {ignored: /[\/\\]\./, persistent: true});
    watcher
      .on('change', function(path) {
        let job = queue.create('procesar', {
          file: path
        }).save((err) => {
          if (err) throw err
        })
      })

  } catch (e) {
    console.log("---ERROR---", e.message)
  }
}

queue.process('procesar', function(job, done){
  try {
    processFile(job.data.file, done)
  } catch (e) {
    console.log("---ERROR---", e.message)
  }
})

async function processFile(file, done) {
  try {
    await normalizar.processFile(file, destino)
    done()
  } catch (e) {
    console.log("---ERROR---", e.message)
  }
}
