'use client';

import { signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

function UserComponent({ session }) {
  const image = session?.user.image;
  const name = session?.user.name;
  const id = session?.user.id;

  return (
    <div className={`h-full ${!session && "w-full"} flex justify-center items-center gap-4 p-2 px-8`}>
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

  useEffect(() => {
    let lastScroll = 0;
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 0 && lastScroll <= currentScroll) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
      lastScroll = currentScroll;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`${isScrolled ? "translate-y-[-200%]" : ""} w-full fixed ${session ? "h-16" : "h-full"} bg-anilist-100 flex justify-between z-10 shadow-xl transition-transform duration-300`}>
      <div className='absolute inset-0 bg-anilist-100 translate-y-[-99%]'></div>
      <UserComponent session={session} />
    </nav>
  );
}
