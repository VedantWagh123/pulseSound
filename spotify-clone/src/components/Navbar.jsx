import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <div className='w-full flex justify-between items-center font-semibold relative'>
        <div className='flex items-center gap-2'>
            <img onClick={()=>navigate(-1)} className='w-8 bg-black p-2 rounded-2xl cursor-pointer hover:bg-neutral-800 transition' src={assets.arrow_left} alt="" />
            <img onClick={()=>navigate(1)} className='w-8 bg-black p-2 rounded-2xl cursor-pointer hover:bg-neutral-800 transition' src={assets.arrow_right} alt="" />
        </div>
        <div className='flex items-center gap-4 relative'>
            <p className='bg-white text-black text-[15px] px-4 py-1 rounded-2xl hidden md:block cursor-pointer hover:scale-105 transition'>Explore Premium</p>
            <p className='bg-black py-1 px-3 rounded-2xl text-[15px] cursor-pointer hover:bg-neutral-800 transition'>Install App</p>
            
            {/* Interactive Profile Avatar with Dropdown */}
            <div className='relative'>
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className='bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer hover:scale-105 active:scale-95 transition shadow-md'
              >
                V
              </div>

              {/* Smooth Dropdown Menu */}
              {isProfileOpen && (
                <>
                  <div 
                    onClick={() => setIsProfileOpen(false)} 
                    className='fixed inset-0 z-40' 
                  />
                  <div className='absolute right-0 mt-2 w-56 bg-[#282828] text-white rounded-lg p-1.5 shadow-2xl z-50 border border-neutral-700 animate-in fade-in zoom-in-95 duration-150'>
                    <div className='px-3 py-2 border-b border-neutral-700/60'>
                      <p className='text-sm font-bold text-white'>Vedant Wagh</p>
                      <p className='text-xs text-neutral-400'>vedant@pulse.music</p>
                    </div>
                    <div className='py-1 text-sm'>
                      <div onClick={() => setIsProfileOpen(false)} className='px-3 py-2 hover:bg-neutral-700/70 rounded cursor-pointer flex justify-between items-center'>
                        <span>Account</span>
                        <span className='text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-semibold'>Pro</span>
                      </div>
                      <div onClick={() => setIsProfileOpen(false)} className='px-3 py-2 hover:bg-neutral-700/70 rounded cursor-pointer'>
                        Profile
                      </div>
                      <div onClick={() => setIsProfileOpen(false)} className='px-3 py-2 hover:bg-neutral-700/70 rounded cursor-pointer'>
                        Settings
                      </div>
                      <div onClick={() => setIsProfileOpen(false)} className='px-3 py-2 hover:bg-neutral-700/70 rounded cursor-pointer text-amber-400 font-medium'>
                        Upgrade to Premium
                      </div>
                    </div>
                    <div className='border-t border-neutral-700/60 pt-1'>
                      <div onClick={() => setIsProfileOpen(false)} className='px-3 py-2 hover:bg-neutral-700/70 rounded cursor-pointer text-red-400 font-medium'>
                        Log out
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
        </div>
      </div>
      <div className='flex items-center gap-2 mt-4'>
            <p className='bg-white text-black px-4 py-1 rounded-2xl cursor-pointer'>All</p>
            <p className='bg-black px-4 py-1 rounded-2xl cursor-pointer hover:bg-neutral-800 transition'>Music</p>
            <p className='bg-black px-4 py-1 rounded-2xl cursor-pointer hover:bg-neutral-800 transition'>Podcasts</p>
      </div>
    </>
  )
}

export default Navbar
