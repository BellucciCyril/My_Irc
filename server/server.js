var express =  require ( 'express' );
var app =  express ();
var server =  require ('http').createServer(app);
var mongoose =  require ( 'mongoose' );
var { Server } =  require('socket.io');
var io =  new  Server(server);
const cors = require("cors");
const { Socket } = require('dgram');

require('dotenv').config();

app.use(cors());
app.use(express.json());

// //ROUTER
// app.get( '/' ,  function (req, res) {
//     res.render( 'index.ejs' );
// });

// app.use( function (req, res, next) {
//     res.setHeader( 'Content-Type' ,  'text/html' );
//     res.status(404).send( 'Sorry mais non !!' );
// });

socketList = [];
roomList = [];


// function _joinRoom(room) {
//     socket.join(room);
//     roomList.push(room);
//     console.log(roomList);

//     //////////


//     //Si l'utilisateur est déjà dans un channel, on le stock
//     var previousChannel = ''
//     if(socket.channel) {
//         previousChannel = socket.channel; 
//     }

//     //On quitte tous les channels et on rejoint le channel ciblé
//     socket.leaveAll();
//     socket.join(channelParam);
//     socket.channel = channelParam;
// }



//SOCKET.IO
io.on('connection', (socket) => {

    socket.on( 'pseudo' , (pseudo) => {
        socket.pseudo = pseudo;
        socketList.push(pseudo);
        socket.broadcast.emit( 'new_user' , pseudo); // brodcast to all except the sender
        console.log("user connected: " + pseudo);
    });

    socket.on( 'newMessage' , (message) => {
        socket.to(message.room).emit( 'newMessageAll' , {pseudo: socket.pseudo, message: message.textInput, room: message.room});
        // socket.broadcast.emit( 'newMessageAll' , {pseudo: socket.pseudo, message: message.textInput});
        // socket.broadcast.emit( 'newMessageAll' , {pseudo: socket.pseudo, message: message});
    });

    socket.on( 'writting' , (pseudo) => {
        socket.broadcast.emit( 'writting', pseudo);
    });

    socket.on( 'notWritting' , () => {
        socket.broadcast.emit( 'notWritting' );
    });

    socket.on('users', () => {
        socket.emit('users', socketList);    
    });

    socket.on('join_room', (data) => {
        socket.join(data);
        // socket.broadcast.to(data.room).emit('new_user', data.pseudo);
    });

    socket.on('createChannel', (data) => {
        // socket.join(data);
        if(!roomList.includes(data)) {
            roomList.push(data);
            socket.emit('createChannel', roomList);
            // socket.broadcast.emit('createChannel', roomList);
        }
        else
        {
            socket.emit('createChannel', roomList);
        }
    });

    socket.on('changeChannel', (channel) => {
        socket.join(channel);
    });

    socket.on('deleteRoom', (room) => {
        socket.leave(room);
        roomList.splice(roomList.indexOf(room), 1);
        socket.emit('deleteRoom', roomList);
        console.log("roomList: " + roomList);
    });

    socket.on('listServer', () => {
        socket.emit('listServer', roomList);
    });

    socket.on('searchServer', (search) => {
        var searchResult = [];
        for (var i = 0; i < roomList.length; i++) {
            if (roomList[i].includes(search))
            {
                searchResult.push(roomList[i]);
            }
        }

        if(searchResult.length > 0) 
        {
            socket.emit('searchServer', searchResult);
        }
        else
        {
            socket.emit('searchServer', 'Auncun résultat');
        }
    });

    socket.on('whispers', (data) => {
        console.log("on est dans whispers coté serveur");
        socket.to(data.room).emit('whispers', {pseudo: socket.pseudo, message: data.message});
    });

    socket.on( 'disconnect' , () => {
        if(socket.pseudo !== null && socket.pseudo !== undefined)
        {
            // console.log("Before socket lists: " + socketList);
            // console.log("number of index: " + socketList.indexOf(socket.pseudo) + " pseudo : " + socket.pseudo);
            socketList.splice(socketList.indexOf(socket.pseudo), 1);
            console.log("After splice, socket lists: " + socketList);
            socket.broadcast.emit( 'quit_user' , {pseudo :socket.pseudo, index: socketList.indexOf(socket.pseudo), list: socketList});
        }
    });
});

//TODO: add socket.io code here
const port =  process.env.SERVER_PORT;
server.listen(3002, () => console .log(`Server Running : http://localhost:${port}`));