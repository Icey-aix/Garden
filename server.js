let express = require('express');
let app = express();

//Serve public files
app.use(express.static('public'));

//HTTP server
let http = require('http');
let server = http.createServer(app);

//Start the server
let port = 3000;
server.listen(port, function(){
  console.log(`The port is listening at localhost:${port}`);
});

/*SOCKET CODE */
const { Server } = require('socket.io');
const io = new Server(server);

//Establish socket connection
io.on('connection', function(socket){
  console.log(`Socket connected with id: ${socket.id}`);

  //2
  socket.on('data', function(data){
    console.log(data);
    //3
    io.emit('data-back', data);
  });

  //the rest of the server socket code
  socket.on('disconnect', function(){
    console.log(`A client disconnected: ${socket.id}`);
  });
});
