"use client"

import { useState, useEffect, useContext, useRef } from "react"
import { useNavigate } from "react-router-dom"
import io from "socket.io-client"
import { v4 as uuidv4 } from "uuid"
import { AuthContext } from "../context/AuthContext"
import { EncryptionContext } from "../context/EncryptionContext"
import MessageList from "./MessageList"
import UserList from "./UserList"
import "../styles/Chat.css"

const SOCKET_SERVER_URL = "http://localhost:5000"

let socketInstance = null;

const Chat = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext)
  const { encryptMessage, decryptMessage, publicKey, exchangeKeys, receiveSessionKey } = useContext(EncryptionContext)
  const [messageHistory, setMessageHistory] = useState({})
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState("")
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [hasNewMessages, setHasNewMessages] = useState({})
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const isSocketInitialized = useRef(false)
  const retryCounts = useRef({})

  console.log("Chat rendering");

  const initializeSocket = () => {
    if (!socketInstance) {
      console.log("Creating socket...");
      socketInstance = io(SOCKET_SERVER_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ["websocket", "polling"],
      });
      isSocketInitialized.current = true;

      socketInstance.on("connect", () => {
        console.log("Connected to server");
        if (user?.username && publicKey) {
          console.log("Emitting join:", { username: user.username });
          socketInstance.emit("join", { username: user.username, public_key: publicKey });
        }
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Connection error:", error.message);
        setError(`Connection failed: ${error.message}`);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setError(`Disconnected: ${reason}`);
      });

      socketInstance.on("reconnect_attempt", (attempt) => {
        console.log("Reconnection attempt:", attempt);
      });

      socketInstance.on("users", (connectedUsers) => {
        console.log("Received users:", connectedUsers);
        setUsers(connectedUsers.filter(u => u.username !== user.username));
      });

      socketInstance.on("user_joined", (newUser) => {
        console.log("User joined:", newUser);
        setUsers(prevUsers => {
          if (!prevUsers.find(u => u.username === newUser.username) && newUser.username !== user.username) {
            return [...prevUsers, newUser];
          }
          return prevUsers;
        });
        if (newUser.username !== user.username) {
          exchangeKeys(socketInstance, newUser.username, newUser.publicKey);
        }
      });

      socketInstance.on("user_left", (username) => {
        console.log("User left:", username);
        setUsers(prevUsers => prevUsers.filter(u => u.username !== username));
        if (selectedUser === username) {
          setSelectedUser(null);
          setMessages([]);
        }
      });

      socketInstance.on("key_exchange", async ({ from, sessionKey }) => {
        console.log("Received key_exchange from:", from);
        const success = await receiveSessionKey(sessionKey, from, socketInstance);
        if (!success) {
          retryCounts.current[from] = (retryCounts.current[from] || 0) + 1;
          if (retryCounts.current[from] < 3) {
            console.warn(`Key exchange failed for ${from}, retry ${retryCounts.current[from]}/3...`);
            setTimeout(() => {
              const user = users.find(u => u.username === from);
              if (user) exchangeKeys(socketInstance, from, user.publicKey);
            }, 1000);
          } else {
            console.error(`Key exchange failed for ${from} after 3 retries`);
            setError(`Failed to connect with ${from}`);
          }
        } else {
          retryCounts.current[from] = 0;
        }
      });

      socketInstance.on("private_message", async (data) => {
        try {
          console.log("Received message from:", data.from);
          const decryptedContent = await decryptMessage(data.content, data.from);
          const newMessage = {
            id: uuidv4(),
            sender: data.from,
            content: decryptedContent,
            timestamp: new Date(),
            isOwn: false,
          };

          setMessageHistory(prev => ({
            ...prev,
            [data.from]: [...(prev[data.from] || []), newMessage],
          }));

          if (selectedUser === data.from) {
            setMessages(prev => [...prev, newMessage]);
            scrollToBottom();
          } else {
            setHasNewMessages(prev => ({ ...prev, [data.from]: true }));
          }
        } catch (error) {
          console.error("Error decrypting message:", error);
          setError(`Failed to decrypt message: ${error.message}`);
        }
      });

      socketInstance.on("error", ({ message }) => {
        console.error("Server error:", message);
        setError(message);
      });
    }
    return socketInstance;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    if (!user?.username || !publicKey || publicKey === "") {
      console.log("Waiting for data:", { username: user?.username, publicKey: publicKey ? publicKey.substring(0, 50) + "..." : "" });
      setError("Initializing...");
      return;
    }

    setError("");
    const socket = initializeSocket();

    if (socket.connected && !isSocketInitialized.current) {
      console.log("Socket connected, emitting join:", { username: user.username });
      socket.emit("join", { username: user.username, public_key: publicKey });
      isSocketInitialized.current = true;
    }

    return () => console.log("Chat unmounting...");
  }, [isAuthenticated, user, publicKey, navigate]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socketInstance) {
        console.log("Disconnecting socket...");
        socketInstance.disconnect();
        socketInstance = null;
        isSocketInitialized.current = false;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setMessages(messageHistory[selectedUser] || []);
      scrollToBottom();
    }
  }, [selectedUser, messageHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUserSelect = (username) => {
    setSelectedUser(username);
    setHasNewMessages(prev => ({ ...prev, [username]: false }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUser || !socketInstance) {
      setError("Cannot send: Missing input, recipient, or connection");
      return;
    }

    try {
      const encryptedContent = await encryptMessage(messageInput, selectedUser);
      console.log("Sending message to:", selectedUser);
      socketInstance.emit("private_message", { to: selectedUser, content: encryptedContent });

      const newMessage = {
        id: uuidv4(),
        sender: user.username,
        receiver: selectedUser,
        content: messageInput,
        timestamp: new Date(),
        isOwn: true,
      };

      setMessageHistory(prev => ({
        ...prev,
        [selectedUser]: [...(prev[selectedUser] || []), newMessage],
      }));
      setMessages(prev => [...prev, newMessage]);
      setMessageInput("");
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
      setError(`Failed to send: ${error.message}`);
    }
  };

  const handleLogout = () => {
    if (socketInstance) {
      console.log("Disconnecting socket on logout...");
      socketInstance.disconnect();
      socketInstance = null;
      isSocketInitialized.current = false;
    }
    localStorage.clear();
    logout();
    navigate("/");
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="user-profile">
          <h3>Secure Chat - CN Project</h3>
          <p>{user?.username}</p>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleUserSelect}
          hasNewMessages={hasNewMessages}
        />
      </div>
      <div className="chat-main">
        {error && <p className="error-message">{error}</p>}
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>{selectedUser}</h3>
              <div className="encryption-badge">
                <span>🔒 End-to-End Encrypted</span>
              </div>
            </div>
            <div className="message-container" ref={chatContainerRef}>
              <MessageList messages={messages} currentUser={user?.username} messagesEndRef={messagesEndRef} />
            </div>
            <form className="message-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                disabled={!selectedUser}
              />
              <button type="submit" disabled={!selectedUser || !messageInput.trim()}>Send</button>
            </form>
          </>
        ) : (
          <div className="select-user-prompt">
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;