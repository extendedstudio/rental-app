import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminApp from './AdminApp'
import CustomerApp from './CustomerApp'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminApp />} />
        <Route path="/booking" element={<CustomerApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
