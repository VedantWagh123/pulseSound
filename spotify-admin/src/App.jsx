import React from 'react'
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddSong from './pages/AddSong/AddSong';
import ListSong from './pages/ListSong/ListSong';
import AddAlbum from './pages/AddAlbum/AddAlbum';
import ListAlbum from './pages/ListAlbum/ListAlbum';
import AddPlaylist from './pages/AddPlaylist/AddPlaylist';
import ListPlaylist from './pages/ListPlaylist/ListPlaylist';
import ImportYouTube from './pages/ImportYouTube/ImportYouTube';
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';

export const url = import.meta.env.VITE_BACKEND_URL || 'https://pulsesound.onrender.com';

const App = () => {
  return (
    <div className='flex items-start min-h-screen'>
      <ToastContainer />
      <Sidebar />
      <div className='flex-1 h-screen overflow-y-scroll bg-[#F3FFF7]'>
        <Navbar />
        <div className="pt-8 pl-5 sm:pt-12 sm:pl-12">
          <Routes>
            <Route path="/add-song" element={<AddSong />} />
            <Route path="/list-songs" element={<ListSong />} />
            <Route path="/add-album" element={<AddAlbum />} />
            <Route path="/list-albums" element={<ListAlbum />} />
            <Route path="/add-playlist" element={<AddPlaylist />} />
            <Route path="/list-playlists" element={<ListPlaylist />} />
            <Route path="/import-youtube" element={<ImportYouTube />} />
          </Routes>
        </div>

      </div>

    </div>
  )
}

export default App
