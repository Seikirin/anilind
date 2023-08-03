'use client';
import { useContext, useEffect, useMemo, useRef } from "react"
import { useState } from "react"
import { signIn, signOut, useSession } from 'next-auth/react'
import { getToken } from "next-auth/jwt";
import DataContext from "@/contexts/DataContext";

function getAnilistUserWatchingList(user, setDataState) {

  setDataState("loading")

  return fetch(`https://graphql.anilist.co`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: `
      query ($user: String) {
        MediaListCollection(userName: $user, type: ANIME, status: CURRENT) {
          lists {
            entries {
              media {
                title {
                  romaji
                  english
                  native
                }
                coverImage {
                  extraLarge
                  large
                  medium
                  color
                }
                bannerImage
                episodes
                duration
                genres
                averageScore
                popularity
                siteUrl
                description
                bannerImage
                season
                seasonYear
                id
                startDate {
                  year
                  month
                  day
                }
                endDate {
                  year
                  month
                  day
                }
                nextAiringEpisode {
                  airingAt
                  timeUntilAiring
                  episode
                }
              }
              progress
              score
              status
              updatedAt
              startedAt {
                year
                month
                day
              }
              completedAt {
                year
                month
                day
              }
            }
          }
        }
      }
    `, variables: { user }
    }),
  })
    .then(r => r.json())
    .then(data => {
      setDataState("loaded")
      return data.data.MediaListCollection.lists[0].entries
    })
    .catch(err => {
      setDataState("error")
      console.error(err)
    })
}

function getEpisodesBehind(anime) {
  if (!anime.media.nextAiringEpisode && anime.media.episodes)
    return anime.media.episodes - anime.progress
  else if (anime.media.nextAiringEpisode)
    return anime.media.nextAiringEpisode?.episode - 1 - anime.progress
  else
    return 0;
}

function getPercentUntilAiring(anime) {
  const timeUntilAiring = anime.media.nextAiringEpisode?.timeUntilAiring
  const timeUntilAiringDividedByAWeek = timeUntilAiring / 604800
  return Math.floor(100 - timeUntilAiringDividedByAWeek * 100)
}

function getAiringDay(anime) {
  const airingDay = anime.media.nextAiringEpisode?.airingAt
  return airingDay ? new Date(airingDay * 1000).toLocaleDateString('en-US', { weekday: 'long' }) : ''
}

function requestAnilistIncreaseProgressByOne(anime, session, setChanged, setList) {
  const { accessToken } = session;

  console.log("Changing progress of", anime.media.title.romaji, "to", anime.progress + 1);

  fetch(`https://graphql.anilist.co`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: `
      mutation ($mediaId: Int, $progress: Int) {
        SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
          id
          progress
        }
      }
    `, variables: { mediaId: anime.media.id, progress: anime.progress + 1 }
    }),
  })
    .then(r => r.json())
    .then(data => {
      setList((list) => {
        const newList = [...list]
        const item = newList.find(item => item.media.id === anime.media.id)
        item.progress = data.data.SaveMediaListEntry.progress
        return newList
      })
    })
    .catch(err => console.error(err))
}



function AnimeCard({ mediaId, session, setChanged, setList, list }) {
  const [opacity, setOpacity] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const anime = useMemo(() => list.find(item => item.media.id === mediaId), [list])
  const timeUntilAiring = anime.media.nextAiringEpisode?.timeUntilAiring
  const timeUntilAiringToDaysHoursAndMinutes = (timeUntilAiring) => {
    let days = Math.floor(timeUntilAiring / 86400)
    let hours = Math.floor((timeUntilAiring % 86400) / 3600)
    let minutes = Math.floor(((timeUntilAiring % 86400) % 3600) / 60)
    days = days > 0 ? `${days}d` : ''
    hours = hours > 0 ? `${hours}h` : ''
    minutes = minutes > 0 ? `${minutes}m` : ''
    return `${days} ${hours} ${minutes}`
  }
  const timeUntilAiringStr = timeUntilAiringToDaysHoursAndMinutes(timeUntilAiring)
  const episodesBehind = getEpisodesBehind(anime)
  const percentUntilAiring = getPercentUntilAiring(anime)
  const airingDayString = getAiringDay(anime)
  const ref = useRef(null)
  const addRef = useRef(null)
  const innerRef = useRef(null)
  const decreaseRef = useRef(null)
  const addTextRef = useRef(null)

  useEffect(() => {
    const timeout = setTimeout(() => setOpacity(1), 100)

    const handleResize = () => {
      if (window.innerWidth < 560)
        setIsMobile(true)
      else
        setIsMobile(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    const card = ref.current
    let startX = undefined
    let startY = undefined
    let offsetX = 0
    let startTranslateX = 0
    let translateX = 0
    const updateRefs = () => {
      card.style.transform = `translateX(${translateX}px)`
      innerRef.current.style.transform = `scale(${1 - Math.abs(translateX) / (card.clientWidth * 4)})`
      addRef.current.style.transform = `scale(${0.75 + Math.abs(translateX) / (card.clientWidth * 2)}) translate(${500 - (Math.abs(translateX) / (card.clientWidth * 0.4)) * 100}%)`
      addTextRef.current.style.opacity = `${Math.abs(translateX) / (card.clientWidth * 0.5)}`
      addTextRef.current.style.transform = `translateX(${Math.abs(translateX) / (card.clientWidth * -0.65) * 100}vw)`
    }
    const handleTouchMove = (e) => {
      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      if (startX === undefined)
        startX = touchX, startTranslateX = translateX
      if (startY === undefined)
        startY = touchY
      let diff = touchX - startX;
      let diffY = touchY - startY;
      if (translateX + diff > 0 || episodesBehind <= 0)
        return;
      let delta = (startTranslateX + diff) - translateX
      if (
        (translateX < 0 && delta < 0)
        || (translateX > 0 && delta > 0)) {
        delta = (1 - Math.abs(translateX) / (card.clientWidth / 2)) * delta
      }
      translateX += delta
      updateRefs();
      e.preventDefault()
    }
    const handleTouchEnd = (e) => {
      startX = undefined
      startY = undefined
      const speed = 100
      card.style.transition = `transform ${speed}ms ease-out`
      let o_translateX = translateX
      translateX = 0
      updateRefs()
      setTimeout(() => {
        card.style.transition = ''
        if (o_translateX < -card.clientWidth * 0.35)
          requestAnilistIncreaseProgressByOne(anime, session, setChanged, setList)
      }
        , speed)
      e.preventDefault()
    }
    card.addEventListener('touchmove', handleTouchMove)
    card.addEventListener('touchend', handleTouchEnd)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', handleResize)
      card.removeEventListener('touchmove', handleTouchMove)
      card.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="w-full h-full aspect-[10/5] xs:aspect-[10/7] relative">

      {!isMobile && episodesBehind > 0 && <div className="absolute inset-0 bg-anilist-400 z-[1] bg-opacity-10 backdrop-blur-sm flex justify-center items-center opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => { }}
          className='bg-anilist-400 text-white rounded-md hover:bg-opacity-80 transition-colors duration-300 flex gap-2 justify-center items-center p-2 px-4'>
          +1
        </button>
      </div>}
      {isMobile && <div
        ref={addRef}
        style={{
          transform: `translateX(500%)`,
          boxShadow: `0 0 300px 100px rgb(61,180,242)`,
      
      }}
        className="absolute h-full aspect-square scale-150 bg-transparent bg-gradient-to-l z-10 flex justify-center items-center rounded-full"
      >
        <div
          ref={addTextRef}
          className="text-white flex justify-center items-center ">
          Watched
        </div>
      </div>}

      <div
        ref={innerRef}
        style={{ opacity: opacity }}
        className="w-full h-full flex items-end relative rounded overflow-hidden shadow-sm flex-col transition-opacity duration-500">
        <div className="w-full h-1/2 relative">
          <img src={anime.media.bannerImage || anime.media.coverImage.extraLarge} alt={anime.media.title.romaji} className="w-full h-full object-cover brightness-50 absolute" />
        </div>
        <div className="w-full h-1/2 bg-anilist-100">
        </div>
        <div className="absolute inset-0 p-0 md:p-2 flex items-end  -translate-y-0.5">
          <div className="w-2/5 md:1/3 h-full flex items-center justify-center py-0.5">
            <img src={anime.media.coverImage.large} alt={anime.media.title.romaji} className="max-w-full md:aspect-[27/38] h-full w-full md:h-auto md:rounded object-cover" />
          </div>
          <div className="w-3/5 md:2/3 h-1/2 p-2 flex flex-col">
            <div className="truncate text-opacity-90 text-white mt-0.5">
              {anime.media.title.english || anime.media.title.romaji}
            </div>
            <div className="text-xs text-opacity-50 text-white">
              {timeUntilAiringStr}
            </div>
            <div className="flex justify-between text-anilist-200 flex-1">
              {episodesBehind > 0 ? <span className="text-xs mr-1 text-opacity-75 text-anilist-400">
                {episodesBehind + " behind"}
              </span> : <span className="text-white text-xs text-opacity-25">Caught up</span>}
              <span className="mt-auto">
                {anime.progress}
                {anime.media?.episodes > 0 && `/${anime.media.episodes}`}</span>
            </div>
          </div>
        </div>
        {episodesBehind > 0 && <div className={`absolute h-1 bottom-0 overflow-hidden bg-anilist-400 opacity-50 w-full`}>
        </div>}
        {<div style={{ width: percentUntilAiring + "%" }} className={`absolute h-1 bottom-0 overflow-hidden bg-anilist-200 w-full self-start`}></div>}
      </div>
    </div>
  )
}

function getWeekDaysStartingWithToday() {
  const today = new Date().getDay()
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const weekDaysStartingWithToday = []
  for (let i = 0; i < 7; i++)
    weekDaysStartingWithToday.push(weekDays[(today + i) % 7])
  return weekDaysStartingWithToday;
}

function getTotalBehind(list) {
  return list.reduce((acc, anime) => acc + getEpisodesBehind(anime), 0)
}

function LoadingCard() {
  return (
    <div className="w-full h-full aspect-[10/5] xs:aspect-[10/7] flex items-end relative rounded overflow-hidden shadow-sm flex-col animate-pulse">
      <div className="w-full h-1/2 relative">
        <div className="w-full h-full object-cover brightness-50 absolute bg-anilist-400 "></div>
      </div>
      <div className="w-full h-1/2 bg-anilist-100 ">
      </div>
      <div className="absolute inset-0 p-0 md:p-2 flex items-end  -translate-y-0.5">
        <div className="w-2/5 md:1/3 h-full flex items-center justify-center py-0.5">
          <div className="max-w-full md:aspect-[27/38] h-full w-full md:h-auto md:rounded object-cover bg-anilist-400 "></div>
        </div>
        <div className="w-3/5 md:2/3 h-1/2 p-2 flex flex-col">
          <div className="truncate text-opacity-90 text-white mt-0.5 ">
          </div>
          <div className="text-xs text-opacity-50 text-white ">
          </div>
          <div className="flex justify-between text-anilist-200 flex-1">
            <span className="text-xs mr-1 text-opacity-75 text-anilist-400 ">
            </span>
            <span className="mt-auto ">
            </span>
          </div>
        </div>
      </div>
      <div className={`absolute h-1 bottom-0 overflow-hidden bg-anilist-400 opacity-50 w-full `}>
      </div>
      <div style={{ width: "0%" }} className={`absolute h-1 bottom-0 overflow-hidden bg-anilist-200 w-full self-start `}></div>
    </div>
  )
}

function AnimeList({ list, filterFunction, title, className, session, setChanged, dataState, setList, loadingComponents }) {
  const newList = list.filter(filterFunction).sort((a, b) => a.media.nextAiringEpisode.timeUntilAiring - b.media.nextAiringEpisode.timeUntilAiring)

  return (
    <div className={`flex flex-wrap gap-4 p-8 ${className}`}>
      <div className="w-full text-xl font-semibold text-white">
        {title}
      </div>
      <div
        className="w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
          gap: "1rem"
        }}>
        {
          newList.length > 0 ?
            newList.map((item, i) => (
              <AnimeCard
                list={list} session={session} setChanged={setChanged}
                mediaId={item.media.id}
                key={item.media.id} setList={setList}
              />
            )) :
            dataState == "loading" ? loadingComponents.current :
              <div className="text-white text-opacity-50">wtf...</div>
        }
      </div>
    </div>
  )
}


export default function Home() {
  const { changed, setChanged, setDataState, dataState } = useContext(DataContext)
  const { data: session, status } = useSession()
  const [username, setUsername] = useState(session?.user.name || 'seikirin')
  const [list, setList] = useState([])
  const loadingComponents = useRef(<LoadingCard />)
  const weekDaysStartingWithToday = getWeekDaysStartingWithToday();

  useEffect(() => {
    if (username.length > 0) {
      setList([])
      getAnilistUserWatchingList(username, setDataState).then((newList) => {
        const toReturn = newList ? setList([...newList].filter(anime => anime.media.nextAiringEpisode)) : setList([])
        const listOfOnlyBehind = newList.filter(anime => getEpisodesBehind(anime) > 0)
        loadingComponents.current = Array.from({ length: Math.max(listOfOnlyBehind.length, 1) }, (_, i) => <LoadingCard key={i} />)
        return toReturn;
      })
    }
  }, [username, changed])

  if (!session)
    return <div className="absolute inset-0 text-white flex justify-center items-center"></div>

  return (
    <main className="bg-anilist-50 overflow-hidden">
      <div className="bg-anilist-300 rounded shadow-lg min-h-screen">
        <AnimeList loadingComponents={loadingComponents} setList={setList} session={session} list={list} dataState={dataState} setChanged={setChanged} filterFunction={anime => getEpisodesBehind(anime) > 0} title={dataState == "loading" ? "Loading..." : `${getTotalBehind(list)} episodes behind`} className="pt-20" />
      </div>
      {
        weekDaysStartingWithToday.map((day, i) => (
          <AnimeList loadingComponents={loadingComponents} setList={setList} session={session} list={list} dataState={dataState} setChanged={setChanged} filterFunction={anime => getAiringDay(anime) === day} title={day} key={i} />
        ))
      }
    </main>
  )
}
