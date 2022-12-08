import React, { useState, useEffect } from "react";
import logo from './logo.svg';
import './App.css';
import openSocket from 'socket.io-client';
// const socket = openSocket('http://localhost:3000');

let socket;
const CONNECTION_PORT = "localhost:3002/";
// ip IONIS : 10.73.190.184

function App() {
  
  // set up state variables
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState("");
  const [roomList, setRoomList] = useState([]);
  
  useEffect(() => {
    socket = openSocket(CONNECTION_PORT, { transports: ['websocket'] });
  }, [CONNECTION_PORT]);

  const basicTitle = "Chat App";

  // log user et set up socket
  const login = () => {
    socket.emit("pseudo", userName);
    document.title = userName +  ' - '  + document.title;
    setLoggedIn(true);
    
    socket.on("new_user", (pseudo) => {
      createElementFunction( 'new_user' , pseudo);
    });

    socket.on( 'newMessageAll' , (content) => {
      createElementFunction( 'newMessageAll' , content);
    });
    
    socket.on('writting', (pseudo) => {
        // console.log(document.getElementById('isWritting'));
        console.log("writting");
        document.getElementById('isWritting').textContent = pseudo + ' est en train d\'écrire...';
    });

    socket.on('users', (users) => {
        console.log("users list : " + users);
        document.getElementById('users').textContent = users;
    });

    socket.on('createChannel', (roomList) => {
        setRoomList(roomList);
    });

    socket.on('deleteRoom', (room) => {
        console.log("room deleted : " + room);
        setRoomList(roomList.filter(item => item !== room));
    });

    socket.on('listServer', (roomList) => {
        console.log("listServer : " + roomList);
        setRoomList(roomList);
        document.getElementById('listServer').textContent = roomList;
    });

    socket.on('searchServer', (search) => {
        console.log("searchServer : " + search);
        document.getElementById('listServer').textContent = search;
    });

    socket.on('whispers', (content) => {
      console.log("on create whispers !");
        createElementFunction( 'whispers' , content);
    });
    
    socket.on('notWritting', () => {
        // console.log("notWritting");
        document.getElementById('isWritting').textContent = '';
    });
    
    socket.on( 'quit_user', (content) => {
      if(content.pseudo !== null && content.pseudo !== undefined)
        createElementFunction( 'quit_user' , content);
    });
  };

  // function to send a message
  function writting()
  {
      socket.emit('writting', userName);
  }

  // function for stop writting
  function notWritting()
  {
      socket.emit('notWritting');
  }

  // variable for timer to delete room
  var timer = null;

  // function to send a message
  function sendMessage()
  {
    const command = "(\/[A-Za-z]{1,})";
    const regex = " {1,}[A-Za-z0-9@^%:\/.,;?]{1,}";
    const regexPrivateMessage = " {1,}([A-Za-z0-9+*-;.:?!#$^]{1,}) {1,}([A-Za-z0-9+*-;.:?!#$ ^]{1,})";
    
    let textInput = document.getElementById('msgInput').value;
    document.getElementById('msgInput').value = '';
    
    if(textInput.length > 0)
    {
        // const test = textInput + " steven cc";
        var result = textInput.match(regex);
        var commandResult = textInput.match(command);

        // if inputText content /msg
        if(commandResult != null && commandResult[0] === '/msg')
        {
          var resultPrivateMessage = textInput.match(regexPrivateMessage); // ! !! problème 
          var pseudo = resultPrivateMessage[1];
          var message = resultPrivateMessage[2];
          console.log("pseudo : " + pseudo + " message : " + message);
          socket.emit('whispers', {pseudo: pseudo, message: message, userName: userName, room: room});
          return;
        }

      // mangement of the command
        switch(textInput) {
            case '/nick' + result:
              var newPseudo = result[0].replace( " " , "" );
              socket.emit( 'pseudo' , newPseudo);
              document.title = newPseudo +  ' - '  + basicTitle;
              setUserName(newPseudo);
              break;
            
            case '/users':
              socket.emit( 'users' );
              break;

            case '/create' + result:
              var newRoom = result[0].replace( " " , "" );
              commandCreateRoom(newRoom);
              break;
            
            case '/join' + result:
              var newRoom = result[0].replace( " " , "" );
              commandCreateRoom(newRoom);
              break;

            case '/list':
              socket.emit( 'listServer' );
              break;
            
            case '/list' + result:
              var search = result[0].replace( " " , "" );
              socket.emit( 'searchServer' , search);
              break;
            
            case '/delete' + result:
              var newRoom = result[0].replace( " " , "" );
              commandDeleteRoom(newRoom);
              break;

            case '/leave' + result:
              var newRoom = result[0].replace( " " , "" );
              commandDeleteRoom(newRoom);
              break;

            default:  
              // // cancel timer
              // clearTimeout(timer);

              // emojiList
              var emojiList = [
                {name: 'smile', emoji: '😀'},
                {name: 'grinning', emoji: '😁'},
                {name: 'grin', emoji: '😁'},
                {name: 'joy', emoji: '😂'},
                {name: 'rofl', emoji: '🤣'},
              ];

              // emoji management
              if(textInput.includes(':'))
              {
                var text = textInput;
                var emoji = text.match(/:[A-Za-z0-9+*-;.:?!#$^]{1,}:/g);
                // exemple : :smile: = 😄
                if(emoji != null)
                {
                  for(var i = 0; i < emoji.length; i++)
                  {
                    var emojiName = emoji[i].replace(/:/g, "" );
                    for(var j = 0; j < emojiList.length; j++)
                    {
                      if(emojiName === emojiList[j].name)
                      {
                        text = text.replace(emoji[i], emojiList[j].emoji);
                        textInput = text;
                      }
                    }
                  }
                }
              } 

              // send message
              socket.emit('newMessage', {textInput, room});
              createElementFunction('newMessageMe', textInput);

              // timer delete room
              timer = setTimeout(() => {
                  socket.emit('deleteRoom', room);
              }, 172800000); // gestion du temps de vie d'une room (48h = 172800000 ms) / (10s = 10000)
              break;
        }
    } 
    else 
    {
        return false;
    }
  }

  // // On crée un nouveau channel
  function createChannel(newRoom) 
  {
    socket.emit('createChannel', newRoom);
    console.log(roomList);
  }

  function _joinRoom(channel)
  {  
    setRoom(channel);
    console.log("join room : " + channel);
      // On réinitialise les messages
      document.getElementById('msgContainer').innerHTML = "";
      // On émet le changement de room
      socket.emit('changeChannel', room);
  }

  // créer ou rejoint une room
  const joinRoom = () => {
    if(room !== null && room !== undefined && room !== '')
    {
      socket.emit("join_room", room);
    }
  };

  function createRoom()
  {
      while(!newRoom){
          var newRoom = prompt("Entrez le nom de la nouvelle room");
      }
      
      createChannel(newRoom);
      _joinRoom(newRoom);
  }

  
  // function to exectute a command
  
  // command to create and join a room
  function commandCreateRoom(newRoom)
  {   
    createChannel(newRoom);
    _joinRoom(newRoom);
  }
  // command to delete a room
  function commandDeleteRoom(room)
  {
    socket.emit('deleteRoom', room);
  }

  function createElementFunction(element, content) 
  {
      var newElement =  document.createElement(element);

      switch(element) 
      {
          case 'new_user' :
              newElement.classList.add(element, 'message');
              newElement.textContent = content + ' vient de se connecter !' ;
              document.getElementById( 'msgContainer' ).appendChild(newElement);
              break;

          case 'newMessageMe' :
              newElement.classList.add(element, 'message');
              // console.log(pseudo + ': '  + content);
              newElement.innerHTML = userName + ': '  + content;
              document.getElementById( 'msgContainer' ).appendChild(newElement);
              break;
          
          case 'newMessageAll' :
              newElement.classList.add(element, 'message');
              console.log(content.pseudo + ': '  + content.message + " in room " + content.room);
              newElement.innerHTML = content.pseudo + ': '  + content.message;
              document.getElementById( 'msgContainer' ).appendChild(newElement);
              break;

          case 'whispers':
              newElement.classList.add(element, 'message');
              console.log(content.pseudo + ' whispers to you : '  + content.message);
              newElement.innerHTML = content.pseudo + ' whispers to you : '  + content.message;
              document.getElementById( 'msgContainer' ).appendChild(newElement);
              break;

          case 'quit_user' :
              newElement.classList.add(element, 'message');
              newElement.textContent = content.pseudo + ' vient de se déconnecter ! ';
              document.getElementById( 'msgContainer' ).appendChild(newElement);
              break;
      }
  }

  if (!loggedIn) 
  {
    return (
      <div className="containerLog">
        <div className="Appdiv">
          <div className="App">
            <input type="text" onChange={(e) => setUserName(e.target.value)} />
            <button onClick={login}>Login</button>
          </div>
        </div>
      </div>
    );
  }
  else 
  {
    return (
      <div class="app">
          <h1 class="chatTitle">Bienvenue sur notre chat</h1>
          
          <div class="container">
              <div class="channelList">
                  <h1>Listes des channels</h1>

                  <input type="text" placeholder="nom de votre channel.."
                  onChange={(e) => {
                    setRoom(e.target.value)}} 
                  />
                  <button onClick={joinRoom}>rejoindre une room</button>
                  <button onClick={createRoom}>Créer une room</button>
                  <ul id="roomList">
                      <li class="elementList" id="general" onClick={() => _joinRoom('general')}>general</li>
                    {roomList.map((channel) => (
                        <li class="elementList" id={channel} onClick={() => _joinRoom(channel)}>{channel}</li>
                    ))}

                    {/* <li class="elementList" id="createNewRoom" onClick={() => _createRoom()}>Créer une nouvelle room</li> */}
                  </ul>
              </div>
              <div class="msgContainer" id="msgContainer"></div>
          </div>

          <div id="users"></div>
          <div id="listServer"></div>
          <div id="isWritting"></div>
          <div className="chatSender">
            <div id="chatForm">
                <input type="text" id="msgInput" placeholder="Entrer votre message..." onKeyPress={writting} onBlur={notWritting} autofocus 
                  onChange={(e) => {
                    setMessage(e.target.value);
                  }} />
                {/* <select name="receiver" id="receiverInput">
                    <option value="all">Tous</option>
                    {users.map((user) => (
                      <option value={user.pseudo}>{user.pseudo}</option>
                      ))}
                    </select> */}
                <button id="btnSend" onClick={sendMessage}>Envoyer</button>
            </div>
          </div>
      </div>
    );
  }
}

export default App;