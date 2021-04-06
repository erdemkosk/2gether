const express = require('express');

const app = express();
const server = require('http').Server(app);
const { v4: uuidv4 } = require('uuid');

app.set('view engine', 'ejs');

const io = require('socket.io')(server);

const rooms = {};

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get('/rooms', (req, res) => {
  res.send(JSON.stringify(rooms, null, 3));
});

app.get('/:room', (req, res) => {
  res.render('room');
});

io.on('connection', (socket) => {
  socket.on('call-closed', (roomId, peerId) => {
    socket.to(roomId).broadcast.emit('peer-closed', peerId);
    rooms[roomId] = (rooms[roomId] || []).filter(user => user !== peerId);
    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
    }
  });
  socket.on('join-room', (roomId, userId, userName) => {
    if (rooms[roomId]) {
      rooms[roomId].push(userId);
    }
    else {
      rooms[roomId] = [userId];
    }
    socket.join(roomId);
    socket.to(roomId).broadcast.emit('user-connected', userId);
    socket.on('message', (message) => {
      io.to(roomId).emit('createMessage', message, userName);
    });

    const otherUsers = rooms[roomId].filter(id => id !== userId);

    if (otherUsers.length > 0) {
      socket.emit('other-users', otherUsers);
      // socket.to(roomId).broadcast.emit("other-users", otherUsers);
      // socket.to(otherUser).emit("user-joined", userId);
    }
  });
});

server.listen(process.env.PORT || 3030);
