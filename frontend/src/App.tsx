import { Route, Routes } from 'react-router-dom'
import './App.css'
import GameBoard from './components/GameBoard'
import { NotFoundPage } from './components/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<GameBoard/>}/>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  )
}

export default App
