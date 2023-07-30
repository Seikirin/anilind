'use client';

import { signIn, signOut } from 'next-auth/react';

function UserComponent({ session }) {
  const image = session?.user.image;
  const name = session?.user.name;
  const id = session?.user.id;

  return (
    <div className={`h-full ${!session && "w-full"} flex justify-center items-center gap-2 p-2 px-8`}>
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
  return (
    <nav className={`w-full fixed ${session ? "h-12" : "h-full"} bg-anilist-100 flex justify-between z-10 shadow-xl bg-opacity-80`}>
      <UserComponent session={session} />
    </nav>
  );
}
