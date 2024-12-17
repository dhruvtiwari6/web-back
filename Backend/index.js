require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST'],    
    }
  });

app.use(express.json());

const socketid = [];
let i = 0;

io.on('connection', (socket) => {
    console.log('A new user connected:', socket.id);

    socket.on('local-found', () => {
        console.log('Local PC found');
        socketid[i++] = socket.id;

        for(let i = 0 ; i < socketid.length ; i++) {
            console.log(socketid[i]);
        }

        if(socketid.length >= 2) {
            io.emit("1:1-peer");
        }
        localSocket = socket; 
    });

    socket.on('ice-candidate' ,(iceCandidate)=> {
        const targetedSocketId = socketid.find(id => id!== socket.id);
        console.log('ice-candidate : ' , iceCandidate);
        io.to(targetedSocketId).emit('ice-candidate', iceCandidate);
    })

    socket.on('offer' ,(offer)=> {
        const targetedSocketId = socketid.find(id => id!== socket.id);
        console.log("sdOffer : " ,offer)
        io.to(targetedSocketId).emit('offer', offer);
    })

    socket.on('answer' ,(ans)=> {
        const targetedSocketId = socketid.find(id => id!== socket.id);
        console.log('sdp-anser : ' ,ans)
        io.to(targetedSocketId).emit('answer', ans);
    })

})

server.listen(3000, () => console.log('Server running on port 3000'))
