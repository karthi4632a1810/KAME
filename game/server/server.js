/**
 * KAME Real-Time Multiplayer WebSocket Server
 * Enables browser multiplayer matches with room codes (e.g. ROOM: KAME)
 * Supports state sync for dice rolling, movement, power cards, combat, and mini-games.
 */
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 3001;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'KAME Multiplayer Server', rooms: Object.keys(rooms).length }));
});

const wss = new WebSocketServer({ server });
const rooms = {}; // roomCode -> { code, hostId, players: [], gameState: {} }

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return rooms[code] ? generateRoomCode() : code;
}

wss.on('connection', (ws) => {
    let currentRoomCode = null;
    let playerId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            const { type, payload } = data;

            switch (type) {
                case 'CREATE_ROOM': {
                    const code = generateRoomCode();
                    currentRoomCode = code;
                    playerId = 0;

                    rooms[code] = {
                        code,
                        host: ws,
                        clients: [{ ws, id: 0, name: payload.playerName || 'Host Player', charId: payload.charId || 0 }],
                        turn: 0,
                        state: 'lobby',
                    };

                    ws.send(JSON.stringify({
                        type: 'ROOM_CREATED',
                        payload: { roomCode: code, playerId: 0, players: rooms[code].clients.map(c => ({ id: c.id, name: c.name, charId: c.charId })) }
                    }));
                    console.log(`[KAME Server] Room created: ${code}`);
                    break;
                }

                case 'JOIN_ROOM': {
                    const code = (payload.roomCode || '').toUpperCase();
                    const room = rooms[code];

                    if (!room) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
                        return;
                    }

                    if (room.clients.length >= 6) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room is full (max 6 players)' } }));
                        return;
                    }

                    currentRoomCode = code;
                    playerId = room.clients.length;
                    room.clients.push({ ws, id: playerId, name: payload.playerName || `Player ${playerId + 1}`, charId: payload.charId || playerId });

                    // Notify joined player
                    ws.send(JSON.stringify({
                        type: 'ROOM_JOINED',
                        payload: {
                            roomCode: code,
                            playerId,
                            players: room.clients.map(c => ({ id: c.id, name: c.name, charId: c.charId }))
                        }
                    }));

                    // Broadcast to all clients in room
                    broadcastToRoom(code, {
                        type: 'PLAYER_JOINED',
                        payload: {
                            players: room.clients.map(c => ({ id: c.id, name: c.name, charId: c.charId }))
                        }
                    });
                    console.log(`[KAME Server] Player joined room: ${code} (Total: ${room.clients.length})`);
                    break;
                }

                case 'START_GAME': {
                    const room = rooms[currentRoomCode];
                    if (room && room.clients[0].ws === ws) {
                        room.state = 'playing';
                        broadcastToRoom(currentRoomCode, {
                            type: 'GAME_STARTED',
                            payload: { players: room.clients.map(c => ({ id: c.id, name: c.name, charId: c.charId })) }
                        });
                    }
                    break;
                }

                case 'ROLL_DICE': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'DICE_ROLLED',
                        payload: { playerId, result: payload.result }
                    });
                    break;
                }

                case 'MOVE_STEP': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'PLAYER_MOVED',
                        payload: { playerId, tileIndex: payload.tileIndex }
                    });
                    break;
                }

                case 'USE_CARD': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'CARD_USED',
                        payload: { playerId, cardId: payload.cardId }
                    });
                    break;
                }

                case 'PLANT_TRAP': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'TRAP_PLANTED',
                        payload: { playerId, tileIndex: payload.tileIndex, trapType: payload.trapType }
                    });
                    break;
                }

                case 'MINIGAME_SCORE': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'MINIGAME_SCORE_UPDATE',
                        payload: { playerId, score: payload.score }
                    });
                    break;
                }

                case 'SEND_EMOTE': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'EMOTE_RECEIVED',
                        payload: { playerId, emote: payload.emote }
                    });
                    break;
                }

                case 'PLAYER_ATTACK': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'ATTACK_OCCURRED',
                        payload: { attackerId: playerId, defenderId: payload.defenderId, baseDmg: payload.baseDmg }
                    });
                    break;
                }

                case 'PROPERTY_ACTION': {
                    broadcastToRoom(currentRoomCode, {
                        type: 'PROPERTY_UPDATED',
                        payload: { playerId, action: payload.action, tileId: payload.tileId, level: payload.level, turret: payload.turret }
                    });
                    break;
                }

                case 'SET_GAME_MODE': {
                    if (rooms[currentRoomCode]) {
                        rooms[currentRoomCode].gameMode = payload.gameMode;
                    }
                    broadcastToRoom(currentRoomCode, {
                        type: 'GAME_MODE_SET',
                        payload: { gameMode: payload.gameMode }
                    });
                    break;
                }
            }
        } catch (e) {
            console.error('[KAME Server] Message error:', e);
        }
    });

    ws.on('close', () => {
        if (currentRoomCode && rooms[currentRoomCode]) {
            const room = rooms[currentRoomCode];
            room.clients = room.clients.filter(c => c.ws !== ws);
            if (room.clients.length === 0) {
                delete rooms[currentRoomCode];
                console.log(`[KAME Server] Room deleted: ${currentRoomCode}`);
            } else {
                broadcastToRoom(currentRoomCode, {
                    type: 'PLAYER_LEFT',
                    payload: { playerId, players: room.clients.map(c => ({ id: c.id, name: c.name, charId: c.charId })) }
                });
            }
        }
    });
});

function broadcastToRoom(roomCode, data) {
    const room = rooms[roomCode];
    if (!room) return;
    const msg = JSON.stringify(data);
    room.clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(msg);
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 [KAME Server] WebSocket Multiplayer Server running on http://localhost:${PORT}`);
});
