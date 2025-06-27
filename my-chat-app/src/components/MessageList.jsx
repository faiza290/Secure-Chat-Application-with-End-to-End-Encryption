import "../styles/MessageList.css"

const MessageList = ({ messages, currentUser, messagesEndRef }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.sender === currentUser ? "own-message" : "other-message"}`}
        >
          <div className="message-content">
            <p>{message.content}</p>
            <span className="message-time">{formatTime(message.timestamp)}</span>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList

