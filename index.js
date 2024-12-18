require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.json());

// Use CORS middleware globally for all routes
const corsOptions = {
    origin: '*', // Adjust this if you want to restrict origins
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));

const socketToRoom = new Map();
const rooms = new Set();

// API to add a Room ID
app.post('/setroomId', (req, res) => {
    const { roomId } = req.body;
    if (roomId && !rooms.has(roomId)) {
        rooms.add(roomId);
        console.log('Room ID added:', roomId);
        res.status(200).send({ success: true, message: 'Room ID added' });
    } else {
        res.status(400).send({ success: false, message: 'Invalid or duplicate Room ID' });
    }
});

// API to check if a Room ID exists
app.get('/checkroom/:roomId', (req, res) => {
    const { roomId } = req.params;
    res.status(200).send({ exists: rooms.has(roomId) });
});

io.on('connection', (socket) => {
    console.log('A new user connected:', socket.id);

    // Handle user joining a room
    socket.on('local-found', (roomId) => {
        socketToRoom.set(socket.id, roomId);

        // Notify other users in the same room about the new connection
        for (const [id, rId] of socketToRoom.entries()) {
            if (rId === roomId && id !== socket.id) {
                io.to(id).emit('user-connected', socket.id);
            }
        }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', ({ candidate, to }) => {
        console.log(`Received ICE candidate from ${socket.id} to ${to}`);
        io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Handle offer from one peer to another
    socket.on('offer', ({ sdp, to }) => {
        console.log(`Received offer from ${socket.id} to ${to}`);
        io.to(to).emit('offer', { sdp, from: socket.id });
    });

    // Handle answer from one peer to another
    socket.on('answer', ({ sdp, to }) => {
        console.log(`Received answer from ${socket.id} to ${to}`);
        io.to(to).emit('answer', { sdp, from: socket.id });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomId = socketToRoom.get(socket.id);
        socketToRoom.delete(socket.id);

        if (roomId) {
            // Notify other users in the room
            for (const [id, rId] of socketToRoom.entries()) {
                if (rId === roomId) {
                    io.to(id).emit('user-disconnected', socket.id);
                }
            }
        }
    });
});

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server running on port ${port}` ));
