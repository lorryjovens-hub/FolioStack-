import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import WorkList from './pages/WorkList'
import WorkDetail from './pages/WorkDetail'
import WorkCreate from './pages/WorkCreate'
import WorkEdit from './pages/WorkEdit'
import Layout from './components/Layout'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="works" element={<WorkList />} />
          <Route path="works/:id" element={<WorkDetail />} />
          <Route path="works/create" element={<WorkCreate />} />
          <Route path="works/:id/edit" element={<WorkEdit />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App