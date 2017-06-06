import chokidar from 'chokidar'
import normalizar from './search.js'
import kue from 'kue-unique'
import cluster from 'cluster'
import path from 'path'

const queue = kue.createQueue()

let filter = ["mp4", "avi"]

let dir = process.argv[2] || '/mnt/peliculas'
let destino = process.argv[3] || '/media/data/videos'

// run(dir, filter, destino)

  // import redis from 'redis'
  // var redisClient = redis.createClient()
  /*
  redisClient.keys("*", function (err, keys) {
    keys.forEach(function (key, pos) {
      redisClient.del(key, function(err, o) {
        if (err) {
          console.error('No se elimino: ' + key);
        }
        else {
          console.log('Se borro: ' + key);
        }
      })
    })
  })
  */

  /*
  redisClient.keys("*", function (err, keys) {
   keys.map( key => {
     redisClient.type(key, function(err, type) {
       console.log(key)
       console.log(type)
     })
   })
  })

  redisClient.hgetall("q:job:166", function (err, replies) {
    console.log(replies)
  })
  */

 
// var clusterWorkerSize = require('os').cpus().length
var clusterWorkerSize = 4

if (cluster.isMaster) {
  kue.app.listen(4000);
  for (var i = 0; i < clusterWorkerSize; i++) {
      cluster.fork();
    }
} else {

  queue.process('procesar', function(job, done){
    try {
      processFile(job, job.data.file, done)
    } catch (e) {
      console.log("---ERROR---", e.message)
    }
  })
}

async function processFile(job, file, done) {
  try {
    await normalizar.processFile(file, destino, job)
    done()
  } catch (e) {
    console.log("---ERROR---", e.message)
  }
}

async function run(dir, filter) {
  try {

    let files = await normalizar.ls(dir, filter)

    files.map( file => {
      let job = queue.create('procesar', {
        title: path.parse(file).name,
        file: file
      })
      .unique('procesar')
      .save((err) => {
        if (err) throw err
      })
    })

    var watcher = chokidar.watch(dir, {ignored: /[\/\\]\./, persistent: true})
    watcher
      .on('change', function(path) {
        let job = queue.create('procesar', {
          title: path.parse(file).name,
          file: path
        }).save((err) => {
          if (err) throw err
        })
      })

  } catch (e) {
    console.log("---ERROR---", e.message)
  }
}
