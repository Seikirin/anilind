'use client';

import DataContext from '@/contexts/DataContext';
import { signIn, signOut } from 'next-auth/react';
import { useContext, useEffect, useState } from 'react';

function UserComponent({ session }) {
  const image = session?.user.image;
  const name = session?.user.name;
  const id = session?.user.id;

  return (
    <div className={`h-full ${!session && "w-full"} flex justify-center items-center gap-4 py-2`}>
      {session ?
        <>
          <button
            onClick={() => signOut()}
            className='bg-red-500 text-white  p-1 px-2 text-xs rounded-md hover:bg-red-800 transition-colors duration-300'>
            Sign Out
          </button><div className='w-8 aspect-square bg-anilist-200 bg-opacity-50 rounded-full overflow-hidden'>
            <img src={image} alt={name} className="w-full h-full object-cover" />
          </div>
          <div className="text-white text-opacity-100">
            {name}
          </div>
        </> :
        <button
          onClick={() => signIn("AniListProvider")}
          className='bg-anilist-400 text-white rounded-md hover:bg-opacity-80 transition-colors duration-300 flex gap-2 justify-center items-center p-2 px-4'>
          <img className={"h-5 aspect-square rounded-full"} src='https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg' />
          Sign In
        </button>
      }
    </div>
  )
}

export function Navbar({ session }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { setChanged, dataState } = useContext(DataContext)
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    let debounce = false;
    let lastScroll = 0;
    const scale = 2
    const handleScroll = () => {
        if (lastScroll > window.scrollY || window.scrollY <= 0) {
          setTranslateY(0)
        }
        else {
          setTranslateY(-100);
        }
        lastScroll = window.scrollY;
    }
    //   const currentScroll = window.scrollY;
    //   const difference = currentScroll - lastScroll;
    //   if (currentScroll <= 0)
    //     setTranslateY(0)
    //   else if (!debounce)
    //     setTranslateY(t => Math.min(0, Math.max(-100, t - (difference))))
    //   if (!debounce) {
    //     debounce = true;
    //     setTimeout(() => debounce = false, 100);
    //   }
    //   lastScroll = currentScroll;
    // }
    // // handleScroll as soon as scrolling starts
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div className='w-full h-16 -translate-y-full bg-anilist-100 z-20 fixed'>

      </div>
      <nav className={`w-full fixed ${session ? "h-16" : "h-full"} bg-anilist-100 flex justify-between transition-transform z-10 shadow-xl duration-500 items-center px-8`}
        style={{ transform: `translateY(${translateY}px)` }}
      >
        <UserComponent session={session} />
        {session && <div>
          <button
            onClick={() => dataState != "loading" && setChanged(c => c + 1)}
            className={`${dataState != "error" ? "bg-anilist-400" : "bg-red-600"}  text-white transition-all rounded-full duration-300 flex gap-2 justify-center items-center p-2 ${dataState == "loading" ? "animate-spin bg-opacity-50" : "hover:bg-opacity-80 "}`}>
            <img src='/refresh.png' alt='refresh' className='h-5 aspect-square invert' />
          </button>
        </div>}
      </nav>
    </>
  );
}
