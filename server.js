const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");

app.set("view engine", "ejs");

const io = require("socket.io")(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.param.room });
});

const rooms = {};

io.on("connection", (socket) => {
socket.on("disconnect", ()=>{
    socket.broadcast.emit("user-disconnected", socket.id); 
});

socket.on("call-closed", (roomId, peerId)=>{
 console.log(roomId, peerId, 'closed');
 socket.to(roomId).broadcast.emit("peer-closed", peerId);
});
  socket.on("join-room", (roomId, userId, userName) => {

    
  if (rooms[roomId]) {
      rooms[roomId].push(userId);
  } else {
      rooms[roomId] = [userId];
  }
  socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });

  const otherUsers = rooms[roomId].filter(id => id !== userId);
  console.log(otherUsers);
  console.log(rooms[roomId]);
  if (otherUsers.length > 0 ) {
      socket.emit("other-users", otherUsers);
      //socket.to(roomId).broadcast.emit("other-users", otherUsers);
      //socket.to(otherUser).emit("user-joined", userId);
  }
  });
});


server.listen(process.env.PORT || 3030);
