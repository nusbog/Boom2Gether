const express = require('express');
const app = express();
const https = require('https');
const { Server } = require("socket.io");
const fs = require("fs");
const mysql = require('mysql');

var credentials = fs.readFileSync("credentials.txt", "utf8").split('\n');

var privkey = credentials[0].split("privkey: ")[1];
var cert = credentials[1].split("cert: ")[1];
var sqlpass = credentials[2].split("sqlpass: ")[1];

function getDate() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// SSL
const options = {
    key: fs.readFileSync(privkey),
    cert: fs.readFileSync(cert),
}

const server = https.createServer(options, app);
const io = new Server(server);

// MySQL
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: sqlpass,
    database: "boom2getherdb"
});

con.connect(function(err) {
    if(err) throw err;

    console.log("MySQL Connected");
});

// Get CSS, JS, Resources
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views'));

// Send HTML
app.get('/', (req, res) => {
  res.sendFile(__dirname + 'views/index.html');
});

// SOCKET.IO
io.on('connection', (socket) => {
    var address = socket.handshake.address;
    console.log("connected: " + address);

    var datetime = getDate();

    con.query(
    "INSERT INTO Connections(ip, dt) VALUES(?, ?)",
    [address, datetime],
    function(err, results) { if(err) throw err; }
    );

    socket.on('disconnect', () => {
        console.log("disconnected: " + address);
    });
});

io.on("connection", (socket) => {
  socket.on("timestamp", (arg) => {
    socket.broadcast.emit("timestamp", arg);
  });
});

io.on("connection", (socket) => {
  socket.on("statechange", (arg) => {
    socket.broadcast.emit("statechange", arg);
  });
});

io.on("connection", (socket) => {
  socket.on("loadvideo", (arg) => {
    console.log("Loaded new video with id: " + arg);
    socket.broadcast.emit("loadvideo", arg);
  });
});

io.on('connection', (socket) => {
  socket.on('chat', msgLog => {

    var address = socket.handshake.address;
    io.emit('chat', msgLog);

    var datetime = getDate();

    con.query(
    "INSERT INTO ChatLogs(ip, dt, msg) VALUES(?, ?, ?)",
    [address, datetime, msgLog],
    function(err, results) { if(err) throw err; }
    );
  });
});

// Start server
server.listen(443, function(req, res) {
    console.log("Starting...");
});
