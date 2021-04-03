const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const ScreenVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;
myVideo.setAttribute("controls", "controls");


var myPeerId = '';
const roomMates = [];

setVideoReversed(myVideo);

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

const user = prompt("Enter your name");

var peer = new Peer(undefined, {
  path: '/',
    host: 'peerjs6.herokuapp.com',
    secure: true, 
    port: 443,
});

peer.on("open", (peerId) => {
  myPeerId = peerId;
  myVideo.setAttribute("id", peerId);
  socket.emit("join-room", window.location.pathname, peerId, user); // servera ilk bağlantı 3 paramtetre
});

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream); // 1. 2.yi arıyor
  const video = document.createElement("video");
  video.setAttribute("id", userId); // 2. kullanıcı göremicek.
  setVideoReversed(video);
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
    console.log(userVideoStream);
  });
  call.on("closed",() =>{
    console.log('closed');
  })
};

//2.de çalışan yer
let myVideoStream;
let myScreenStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      //2. userda çalışan yer
      call.answer(stream);
      const video = document.createElement("video");
      video.setAttribute("controls", "controls");

      if(call.metadata){
      video.setAttribute("id", call.peer + 's');
      }
      else {
        video.setAttribute("id", call.peer);
        setVideoReversed(video);
      }

      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    peer.on("close", (call) => {
      console.log('ff');
    });

    socket.on("user-connected", (userId) => {
      //Yeni kullanıcı geldi onun idisni biliyoruz ama o bizimkini bilmiyor.
      otherUserId = userId;
      roomMates.push(userId);
      connectToNewUser(userId, stream);
    });

    socket.on("peer-closed", (peerId) => {
      //Yeni kullanıcı geldi onun idisni biliyoruz ama o bizimkini bilmiyor.
     console.log(peerId , 'closed!!!!!!!');
     const video = document.getElementById(peerId);
     video.remove();
    });

    socket.on("other-users", (otherUsers) => {
      // İlk kullanıcıya birileri bağlandığında onların idsi geliyor. Ama 2. 3. bağlanan geri kalan kişilerin idisni buradan alıcak.
      otherUsers.forEach(users => {
        roomMates.push(users);
      });
      console.log(otherUsers);
    });
  });

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });
};

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
const shareScreen = document.querySelector("#shareScreen");
muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

inviteButton.addEventListener("click", () => {
  var t = document.createTextNode("copied!");
  inviteButton.appendChild(t);
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});


shareScreen.addEventListener("click", () => {
  if(!myScreenStream){
    console.log('ajdfbjshdfbhjdsfbjhsfd');
   
    navigator.mediaDevices.getDisplayMedia().then(stream => {
      myScreenStream = stream;
      ScreenVideo.setAttribute("controls", "controls");
      addVideoStream(ScreenVideo, stream);
      shareScreen.classList.toggle("background__red");
      ScreenVideo.setAttribute("style", "display:normal");

      roomMates.forEach(users => {
        peer.call(users, stream, {
          metadata: { "type": "shareScreen" }
      });
      });
    });
  }

  else {
    myScreenStream.getVideoTracks()[0].enabled = false;
    ScreenVideo.setAttribute("style", "display:none");
    html = `<i class="fa fa-desktop"></i>`;
    shareScreen.classList.toggle("background__red");
    shareScreen.innerHTML = html;
    myScreenStream = undefined;
    socket.emit("call-closed", window.location.pathname, myPeerId + 's'); // isScreenshot should be added s
  }
});

inviteButton.addEventListener("click", (e) => {
  try {
    navigator.clipboard.writeText(window.location.href);
  }
  catch (err) {
    console.error('Failed to copy: ', err);
  }

});

socket.on("createMessage", (message, userName) => {
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message" style="word-wrap:break-word; text-align: ${
      userName === user ? "left" : "right"
    };">
        <b><span> ${
          userName === user ? user + ':' : userName + ':'
        }</span> </b>
        <span style="background-color:${
          userName === user ? "white" : "white"
        }">${message}</span>
    </div>`;
});

function setVideoReversed(element) {
  element.setAttribute("style", "transform: rotateY(180deg); -webkit-transform: rotateY(180deg); -moz-transform: rotateY(180deg);");
}

window.onbeforeunload = closingCode;
function closingCode(){
  socket.emit("call-closed", window.location.pathname, myPeerId); // isScreenshot should be added s
   return null;
}