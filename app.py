from flask import Flask, request
from flask_socketio import SocketIO, emit
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256
from Crypto.Random import get_random_bytes
import base64

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173", async_mode="threading", logger=True, engineio_logger=True)

clients = {}
session_keys = {}

server_private_key = RSA.generate(2048)
server_public_key = server_private_key.publickey()

def encrypt_aes_key(aes_key, public_key_str):
    try:
        public_key_str = public_key_str.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').strip()
        public_key_bytes = base64.b64decode(public_key_str)
        public_key = RSA.import_key(public_key_bytes)
        cipher = PKCS1_OAEP.new(public_key, hashAlgo=SHA256)
        encrypted_key = cipher.encrypt(aes_key)
        encoded_key = base64.b64encode(encrypted_key).decode()
        print(f"Encrypted AES key: {encoded_key[:50]}... (length: {len(encoded_key)}, AES key: {len(aes_key)})")
        return encoded_key
    except Exception as e:
        print(f"Error encrypting AES key: {e}")
        return None

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('join')
def handle_join(data):
    try:
        username = data.get('username')
        public_key = data.get('public_key')
        if not username or not public_key:
            print(f"Join rejected: username={username}, public_key={'[empty]' if not public_key else '[present]'}")
            emit('error', {'message': 'Username and public key required'})
            return
        if username in clients:
            print(f"Join rejected: Username {username} taken")
            emit('error', {'message': 'Username already taken'})
            return
        if not (isinstance(username, str) and username.isalnum() and 3 <= len(username) <= 20):
            print(f"Join rejected: Invalid username: {username}")
            emit('error', {'message': 'Username must be 3-20 alphanumeric characters'})
            return

        clients[username] = {'socket_id': request.sid, 'public_key': public_key, 'is_online': True}
        print(f"User {username} joined")
        socketio.emit('user_joined', {'username': username, 'publicKey': public_key, 'isOnline': True}, skip_sid=request.sid)
        emit_users()
    except Exception as e:
        print(f"Error in join: {e}")
        emit('error', {'message': f'Server error: {str(e)}'})

@socketio.on('key_exchange')
def handle_key_exchange(data):
    try:
        sender = next((u for u, c in clients.items() if c['socket_id'] == request.sid), None)
        receiver = data.get('to')
        if not sender or not receiver:
            print(f"Key exchange failed: sender={sender}, receiver={receiver}")
            emit('error', {'message': 'Invalid sender or receiver'})
            return
        if receiver not in clients:
            print(f"Key exchange failed: Receiver {receiver} not found")
            emit('error', {'message': 'Receiver not found'})
            return

        session_key_id = tuple(sorted([sender, receiver]))
        if session_key_id not in session_keys:
            aes_key = get_random_bytes(16)
            session_keys[session_key_id] = aes_key
        else:
            aes_key = session_keys[session_key_id]

        encrypted_key = encrypt_aes_key(aes_key, clients[receiver]['public_key'])
        if encrypted_key:
            print(f"Sending key_exchange to {receiver} from {sender}")
            emit('key_exchange', {'from': sender, 'sessionKey': encrypted_key}, room=clients[receiver]['socket_id'])
        else:
            print(f"Key exchange failed: Failed to encrypt for {receiver}")
            emit('error', {'message': 'Failed to encrypt session key'})

        encrypted_key_sender = encrypt_aes_key(aes_key, clients[sender]['public_key'])
        if encrypted_key_sender:
            print(f"Sending key_exchange to {sender} from {receiver}")
            emit('key_exchange', {'from': receiver, 'sessionKey': encrypted_key_sender}, room=clients[sender]['socket_id'])
        else:
            print(f"Key exchange failed: Failed to encrypt for {sender}")
            emit('error', {'message': 'Failed to encrypt session key'})
    except Exception as e:
        print(f"Error in key_exchange: {e}")
        emit('error', {'message': f'Server error: {str(e)}'})

@socketio.on('private_message')
def handle_private_message(data):
    try:
        sender = next((u for u, c in clients.items() if c['socket_id'] == request.sid), None)
        receiver = data.get('to')
        content = data.get('content')
        if not sender or not receiver or not content:
            print(f"Private message failed: sender={sender}, receiver={receiver}, content={'[empty]' if not content else '[present]'}")
            emit('error', {'message': 'Invalid message data'})
            return
        if receiver not in clients:
            print(f"Private message failed: Receiver {receiver} not found")
            emit('error', {'message': 'Receiver not found'})
            return

        print(f"Sending private message from {sender} to {receiver}")
        emit('private_message', {'from': sender, 'content': content}, room=clients[receiver]['socket_id'])
    except Exception as e:
        print(f"Error in private_message: {e}")
        emit('error', {'message': f'Server error: {str(e)}'})

@socketio.on('disconnect')
def handle_disconnect():
    try:
        username = next((u for u, c in clients.items() if c['socket_id'] == request.sid), None)
        if username:
            print(f"User {username} disconnected")
            del clients[username]
            socketio.emit('user_left', username)
            emit_users()
    except Exception as e:
        print(f"Error in disconnect: {e}")

def emit_users():
    try:
        users = [{'username': username, 'publicKey': client['public_key'], 'isOnline': client['is_online']} for username, client in clients.items()]
        print(f"Emitting users: {users}")
        socketio.emit('users', users)
    except Exception as e:
        print(f"Error in emit_users: {e}")

if __name__ == '__main__':
    print("Starting server...")
    socketio.run(app, debug=True, port=5000)