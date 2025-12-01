import { Route, Routes } from 'react-router-dom'
import './App.css'
import GameComponent from './components/GameComponent'
import { NotFoundPage } from './components/NotFoundPage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<GameComponent/>}/>
        <Route path="*" element={<NotFoundPage/>}/>
      </Routes>
    </>
  )
}

export default App
