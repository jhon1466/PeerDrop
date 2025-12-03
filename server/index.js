import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Almacenar salas de conexión (solo en memoria, no persistente)
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Crear o unirse a una sala
  socket.on('create-room', (roomId) => {
    socket.join(roomId);
    rooms.set(roomId, { host: socket.id, peer: null });
    socket.emit('room-created', roomId);
    console.log(`Sala creada: ${roomId} por ${socket.id}`);
  });

  socket.on('join-room', (roomId) => {
    const room = rooms.get(roomId);
    if (room && !room.peer) {
      socket.join(roomId);
      room.peer = socket.id;
      socket.emit('room-joined', roomId);
      // Notificar al host que alguien se unió
      io.to(room.host).emit('peer-joined', socket.id);
      console.log(`Usuario ${socket.id} se unió a la sala ${roomId}`);
    } else if (room && room.peer) {
      socket.emit('room-full');
    } else {
      socket.emit('room-not-found');
    }
  });

  // Señalización WebRTC
  socket.on('offer', (data) => {
    console.log(` Oferta recibida en sala ${data.roomId} de ${socket.id}`);
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('answer', (data) => {
    console.log(` Respuesta recibida en sala ${data.roomId} de ${socket.id}`);
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    // Limpiar salas cuando se desconecta el host o el peer
    for (const [roomId, room] of rooms.entries()) {
      if (room.host === socket.id || room.peer === socket.id) {
        rooms.delete(roomId);
        io.to(roomId).emit('room-closed');
        console.log(`Sala ${roomId} cerrada`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor de señalización corriendo en puerto ${PORT}`);
});

