import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Login from "./components/Login"
import Chat from "./components/Chat"
import { AuthProvider } from "./context/AuthContext"
import { EncryptionProvider } from "./context/EncryptionContext"
import "./App.css"

function App() {
  return (
    <Router>
      <AuthProvider>
        <EncryptionProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/chat" element={<Chat />} />
            </Routes>
          </div>
        </EncryptionProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
