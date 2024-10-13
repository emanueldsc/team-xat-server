const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')

const app = express()
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*', // Permitir todas as origens (para produção, especifique o domínio)
    methods: ['GET', 'POST'],
  },
})

const PORT = process.env.PORT || 3000

// Armazenar usuários conectados e salas
const rooms = {}

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`)

  // Evento para entrar em uma sala
  socket.on('join', (roomId) => {
    socket.join(roomId)
    console.log(`Usuário ${socket.id} entrou na sala ${roomId}`)

    if (!rooms[roomId]) {
      rooms[roomId] = []
    }

    rooms[roomId].push(socket.id)

    // Notificar outros usuários na sala que um novo usuário entrou
    socket.to(roomId).emit('user-joined', socket.id)
  })

  // Evento para enviar uma mensagem de sinalização
  socket.on('signal', (data) => {
    const { roomId, signalData, to } = data
    console.log(`Sinal de ${socket.id} para ${to} na sala ${roomId}`)
    io.to(to).emit('signal', {
      from: socket.id,
      signalData: signalData,
    })
  })

  // Evento de desconexão
  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`)

    // Remover o usuário das salas que ele participou
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id)
      // Notificar outros usuários na sala que um usuário saiu
      socket.to(roomId).emit('user-left', socket.id)

      // Remover a sala se não houver mais usuários
      if (rooms[roomId].length === 0) {
        delete rooms[roomId]
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`Servidor de sinalização ouvindo na porta ${PORT}`)
})
