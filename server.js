const express = require('express');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const PORT = 8080;
const TWENTY_MINUTES_IN_MS = 1000 * 60 * 20;
const PUBLIC_PATH = path.join(__dirname, 'public');

let messages = [];
let authors = [];

app.use(express.static(PUBLIC_PATH));
app.set('views', PUBLIC_PATH);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use('/', (req, res) => {
    res.render('index.html');
});

setInterval(function autoDeleteMessages() {
    messages = [];
    authors = [];
    io.emit('autoDeleteMessages');
    console.log("[server] Excluindo todas as mensagens!");
}, TWENTY_MINUTES_IN_MS);

io.on('connection', socket => {
    console.log(`<Socket conectado: ${socket.id}>`);

    socket.emit('previousMessages', messages);

    socket.on('sendAuthor', data => {
        let authorExists = authors.map(e => e.author).indexOf(data.author) >= 0;
        if (authorExists) {
            socket.emit('authorAlreadyInUse');
        }else{
            let idPosition = authors.map(e => e.id).indexOf(data.id);
            let idExists = idPosition >= 0;
            if (idExists) {
                authors[idPosition].author = data.author;
            }else{
                authors.push(data);
            }
        }
    });

    socket.on('sendMessage', data => {
        messages.push(data);
        socket.broadcast.emit('receivedMessage', data);
        socket.emit('blockUsernameChange');
    });

    socket.on("disconnect", reason => {
        console.log(`<Socket desconectado: ${socket.id} - ${reason}>`);
        let idPosition = authors.map(e => e.id).indexOf(socket.id);
        let idExists = idPosition >= 0;
        if (idExists) {
            let messageObject = {
                dateTime: new Date(),
                author: 'SERVER',
                message: '<'+authors[idPosition].author+'> se desconectou.',
                notification: 1
            };
            messages.push(messageObject);
            socket.broadcast.emit('sendNotification', messageObject);
            authors.splice(idPosition, 1);
        }
    });
});

server.listen(PORT, () => {
    console.log(`[server] Running in: http://localhost:${PORT}`);
});