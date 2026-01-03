import { AuthProvider } from './context/AuthContext'
import { AuthRouter } from './components/AuthRouter'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <AuthRouter />
    </AuthProvider>
  )
}

export default App
