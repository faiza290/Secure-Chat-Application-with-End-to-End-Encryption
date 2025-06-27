"use client"
import "../styles/UserList.css"

const UserList = ({ users, selectedUser, onSelectUser, hasNewMessages }) => {
  return (
    <div className="user-list">
      <h3>Online Users</h3>
      {users.length === 0 ? (
        <p className="no-users">No users online</p>
      ) : (
        <ul>
          {users.map((user) => (
            <li
              key={user.username}
              className={selectedUser === user.username ? "selected" : ""}
              onClick={() => onSelectUser(user.username)}
            >
              <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
              <span>{user.username}</span>
              {hasNewMessages[user.username] && (
                <span className="notification-badge"></span>
              )}
              <span className={`online-indicator ${user.isOnline !== false ? "online" : "offline"}`}></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default UserList