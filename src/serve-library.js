module.exports = function(libraryPath, serverConfig, callback) {
  var express = require('express');
  var PhotoLibrary = require('./photo-library');
  var pkg = require('../package');
  var app = express();
  var cors = require('cors');
  var server = require('http').Server(app);
  var io = require('socket.io').listen(server);
  var library = new PhotoLibrary(libraryPath);
  var path = require('path');

  app.use(cors());

  app.use(express.static(path.join(__dirname,'..', 'client', 'dist')));

  app.get('/version', function(req, res, next) {
    res.send(pkg.version+'\n');
  });

  app.get('/thumbnails/:id', function(req, res, next) {
    library.ImageProxyState.findOne({
      where: { modelId: req.params.id }
    }).then(function(row) {
      if (row) {
        res.sendFile(path.resolve(path.join(libraryPath, 'Thumbnails', row.miniThumbnailPath)));
      } else {
        // no thumbnail available, send the master
        return library.Master.findOne({
          where: { modelId: req.params.id }
        }).then(function(row) {
          res.sendFile(path.resolve(path.join(libraryPath, 'Masters', row.imagePath)));
        })
      }
    }).catch(next);
  });

  io.on('connection', function(socket) {
    library.Master.findAll({
      order: [['imageDate', 'DESC']]
    }).then(function(rows) {
      socket.emit('action', {
        type: 'SET_PHOTOS',
        photos: rows
      })
    })
  });

  server.listen(serverConfig.port, function(err) {
    callback(err, Object.assign({}, serverConfig))
  });
}
