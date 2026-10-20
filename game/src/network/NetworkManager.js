/**
 * NetworkManager — KAME WebSocket Multiplayer Client
 * Handles real-time communication with the KAME game server
 */
export class NetworkManager {
    constructor() {
        this.ws = null;
        this.roomCode = null;
        this.playerId = null;
        this.isHost = false;
        this.connected = false;
        this.callbacks = {};
    }

    connect() {
        return new Promise((resolve, reject) => {
            const host = window.location.hostname || 'localhost';
            const url = `ws://${host}:3001`;

            try {
                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    this.connected = true;
                    resolve(true);
                };

                this.ws.onerror = (err) => {
                    this.connected = false;
                    reject(err);
                };

                this.ws.onclose = () => {
                    this.connected = false;
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (e) {
                        console.error('[Network] Parse error:', e);
                    }
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    on(type, callback) {
        if (!this.callbacks[type]) this.callbacks[type] = [];
        this.callbacks[type].push(callback);
    }

    emit(type, payload) {
        if (this.callbacks[type]) {
            this.callbacks[type].forEach(cb => cb(payload));
        }
    }

    handleMessage(data) {
        const { type, payload } = data;
        switch (type) {
            case 'ROOM_CREATED':
                this.roomCode = payload.roomCode;
                this.playerId = payload.playerId;
                this.isHost = true;
                break;
            case 'ROOM_JOINED':
                this.roomCode = payload.roomCode;
                this.playerId = payload.playerId;
                this.isHost = false;
                break;
        }
        this.emit(type, payload);
    }

    send(type, payload = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        }
    }

    createRoom(playerName, charId) {
        this.send('CREATE_ROOM', { playerName, charId });
    }

    joinRoom(roomCode, playerName, charId) {
        this.send('JOIN_ROOM', { roomCode, playerName, charId });
    }

    startGame() {
        this.send('START_GAME');
    }

    sendRoll(result) {
        this.send('ROLL_DICE', { result });
    }

    sendMove(tileIndex) {
        this.send('MOVE_STEP', { tileIndex });
    }

    sendCard(cardId) {
        this.send('USE_CARD', { cardId });
    }

    sendTrap(tileIndex, trapType) {
        this.send('PLANT_TRAP', { tileIndex, trapType });
    }

    sendEmote(emote) {
        this.send('SEND_EMOTE', { emote });
    }

    sendAttack(defenderId, baseDmg) {
        this.send('PLAYER_ATTACK', { defenderId, baseDmg });
    }

    sendPropertyAction(action, tileId, level = 1, turret = null) {
        this.send('PROPERTY_ACTION', { action, tileId, level, turret });
    }

    setGameMode(gameMode) {
        this.send('SET_GAME_MODE', { gameMode });
    }
}

export const network = new NetworkManager();
