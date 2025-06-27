# 🔐 Simple Secure Chat Application

The **Simple Secure Chat Application** is a real-time messaging platform designed to prioritize **user privacy** through **end-to-end encryption**. Built with modern web technologies and cryptographic standards, it provides a safe environment for personal, academic, or professional communication — without the fear of eavesdropping or data leaks.

---

## 🧩 Features

- 🔒 End-to-end encryption with **RSA** and **AES**
- 💬 Real-time messaging using **WebSockets**
- 🔔 Notifications and message timestamps
- 👥 Dynamic user list and chat updates
- 📱 Responsive web interface
- 🔁 Support for small-to-medium group chats (2–50 users)

---

## 🎯 Project Goals

The core goal of this application is to provide a **simple, educational**, and **secure** chat experience. It showcases how real-time systems and cryptography can be combined effectively for secure digital communication.

This is especially useful for:
- Students learning **network security**, **cryptography**, or **multithreading**
- Developers interested in **secure messaging**
- Teams or groups who want lightweight, private messaging

---

## 🛠️ Technologies Used

### Backend
- **Flask** with **Flask-SocketIO** for WebSocket support  
  📚 [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)

- **PyCryptodome** for RSA and AES cryptographic operations  
  🔐 [PyCryptodome Docs](https://pycryptodome.readthedocs.io/)

### Frontend
- **HTML/CSS/JS**
- **Web Crypto API** for client-side cryptography  
  🔐 [Web Crypto API - W3C](https://www.w3.org/TR/WebCryptoAPI/)

### Encryption
- **RSA**: Secure key exchange
- **AES-GCM**: Message encryption

---

## 🧪 Testing Info

This project was tested locally on a **single laptop** using **two browser tabs** to simulate two users. It demonstrates functionality in a basic environment but has not yet been tested in a real networked or multi-device scenario.

---

## 🤝 Collaborators

This project was developed as a **collaborative effort** by:
- **Faiza Khan** – [GitHub Profile](https://github.com/faiza290)
- **Amna Mansoor**

---

## 📚 References

- **WebSockets** (MDN):  
  [WebSockets API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

- **Cryptography**:  
  W. Stallings, *Cryptography and Network Security*, 7th ed., 2017

- **PyCryptodome**:  
  [PyCryptodome Docs](https://pycryptodome.readthedocs.io/)

- **Web Crypto API**:  
  [Web Cryptography API - W3C](https://www.w3.org/TR/WebCryptoAPI/)

---

## 🚀 Future Improvements

- User authentication system
- Encrypted file sharing
- Group creation and chat rooms
- Offline message storage with secure sync

---

## 📌 Disclaimer

This project is intended for **educational purposes** and small-group usage. While it demonstrates strong cryptographic principles, it is **not intended for production-level deployment** in high-security environments without further testing and auditing.

---
