'use client';
import { useEffect, useMemo } from "react"
import { useState } from "react"
import { signIn, signOut, useSession } from 'next-auth/react'
import { getToken } from "next-auth/jwt";

function getAnilistUserWatchingList(user) {
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
    .then(data => data.data.MediaListCollection.lists[0].entries)
    .catch(err => console.error(err))
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

function requestAnilistIncreaseProgressByOne(anime, session, setChanged) {
  const { accessToken } = session;

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
    .then(data => setChanged(c => c + 1))
    .catch(err => console.error(err))
}



function AnimeCard({ anime, session, setChanged }) {
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

  return (
    <div className="w-full h-full aspect-[10/5] xs:aspect-[10/7] flex items-end relative rounded overflow-hidden shadow-sm flex-col">
      {episodesBehind > 0 && <div className="absolute inset-0 bg-anilist-400 z-[1] bg-opacity-25 backdrop-blur-sm flex justify-center items-center opacity-0 hover:opacity-100 transition-opacity">
        <button
          onClick={() => requestAnilistIncreaseProgressByOne(anime, session, setChanged)}
          className='bg-anilist-400 text-white rounded-md hover:bg-opacity-80 transition-colors duration-300 flex gap-2 justify-center items-center p-2 px-4'>
          +1
        </button>
      </div>}
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

function AnimeList({ list, filterFunction, title, className, session, setChanged }) {
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
        {newList.length > 0 ? newList.map((item, i) => (
          <AnimeCard session={session} setChanged={setChanged} anime={item} key={i} />
        )) : <div className="text-white text-opacity-50">wtf...</div>}
      </div>
    </div>
  )
}


export default function Home() {
  const { data: session, status } = useSession()
  const [username, setUsername] = useState(session?.user.name || '')
  const [list, setList] = useState([])
  const [changed, setChanged] = useState(0)
  const request = useMemo(() => username.length > 0 && getAnilistUserWatchingList(username).then((newList) => setList([...newList].filter(anime => anime.media.nextAiringEpisode))), [username, changed])
  const weekDaysStartingWithToday = getWeekDaysStartingWithToday();
  if (!session)
    return <div className="absolute inset-0 text-white flex justify-center items-center"></div>
  if (!list)
    return <div className="absolute inset-0 text-white flex justify-center items-center">Loading...</div>

  return (
    <main className="">
      <div className="bg-anilist-300 rounded shadow-lg md:min-h-screen">
        <AnimeList session={session} list={list} setChanged={setChanged} filterFunction={anime => getEpisodesBehind(anime) > 0} title={`${getTotalBehind(list)} episodes behind`} className="pt-20" />
      </div>
      {
        weekDaysStartingWithToday.map((day, i) => (
          <AnimeList session={session} list={list} setChanged={setChanged} filterFunction={anime => getAiringDay(anime) === day} title={day} key={i} />
        ))
      }
    </main>
  )
}
