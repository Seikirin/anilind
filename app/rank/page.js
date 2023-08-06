'use client';

import { useContext, useEffect, useMemo, useState, useRef } from "react";
import DataContext from "@/contexts/DataContext";
import { useSession } from "next-auth/react";

function getAnilistFavoriteCharacters(username, setDataState) {
    return fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },

        body: JSON.stringify({
            query: `
                query ($username: String) {
                    User(name: $username) {
                        favourites {
                            characters {
                                nodes {
                                    name {
                                        full
                                    }
                                    image {
                                        large
                                    }
                                }
                            }
                        }
                    }
                }
            `,
            variables: {
                username: username,
            },
        }),
    })
        .then((res) => res.json())
        .then((res) => {
            const characters = res.data.User.favourites.characters.nodes;
            const charactersData = characters.map((character) => {
                return {
                    name: character.name.full,
                    image: character.image.large,
                };
            });
            setDataState("loaded");
            return charactersData;
        })
        .catch((err) => {
            console.log(err);
            setDataState("error");
            return []
        }
        );
}

async function mergeSort(arr, asyncComparator) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const [left, right] = await Promise.all([
        mergeSort(arr.slice(0, mid), asyncComparator),
        mergeSort(arr.slice(mid), asyncComparator),
    ]);
    return merge(left, right, asyncComparator);
}

async function merge(left, right, asyncComparator) {
    let merged = [];
    while (left.length && right.length) {
        const compareResult = await asyncComparator(left[0], right[0]);
        merged.push(compareResult <= 0 ? left.shift() : right.shift());
    }
    return merged.concat(left, right);
}

export default function Page() {
    const { dataState, setDataState } = useContext(DataContext);
    const { data: session, status } = useSession();
    const [characters, setCharacters] = useState([]);
    const [orderedCharacters, setOrderedCharacters] = useState([]);
    const [comparisons, setComparisons] = useState(0);
    const choices = useRef([]);
    const pickedChoice = useRef(null);
    const running = useRef(false);
    const rightRef = useRef(null);
    const leftRef = useRef(null);
    const idkRef = useRef(null);
    const [maxComparisons, setMaxComparisons] = useState(1);
    const maxComparisonsRef = useRef(1);

    const onClickRight = () => {
        pickedChoice.current = choices.current[1];
    };
    const onClickLeft = () => {
        pickedChoice.current = choices.current[0];
    };

    useEffect(() => {
        if (status === "authenticated") {
            getAnilistFavoriteCharacters(session.user.name, setDataState).then((characters) => {
                setCharacters(characters.sort(() => Math.random() - 0.5));
                console.log(characters.length)
            });
        }
    }, [dataState]);

    useEffect(() => {
        if (orderedCharacters.length > 0)
            return;
        if (characters.length > 0) {
            rightRef.current.querySelector("img").addEventListener("click", onClickRight);
            leftRef.current.querySelector("img").addEventListener("click", onClickLeft);
            if (characters.length === 0)
                return 1;
            let comparisons = 0;
            async function compare(a, b) {
                comparisons++;
                return 1
            }
            mergeSort(characters, compare).then((sortedCharacters) => {
                setMaxComparisons(comparisons);
                maxComparisonsRef.current = comparisons;
            });
        }
        if (characters.length === 0 || running.current == true)
            return;
        running.current = true;

        async function compare(a, b) {
            console.log("comparing", a, b);
            choices.current = [a, b];
            console.log(choices);
            pickedChoice.current = null;
            rightRef.current.querySelector("img").src = b.image;
            leftRef.current.querySelector("img").src = a.image;
            setTimeout(() => {
                rightRef.current.querySelector("img").style.removeProperty("max-height");
                leftRef.current.querySelector("img").style.removeProperty("max-height");
            }, 1000);
            while (pickedChoice.current === null) {
                console.log("waiting");
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            console.log("picked", pickedChoice.current);
            setComparisons((c) => {
                if (c == maxComparisonsRef.current)
                    return c;
                else
                    return c + 1;
            })
            return pickedChoice.current === a;
        }
        rightRef.current.querySelector("img").style.transition = "opacity 0.5s";
        leftRef.current.querySelector("img").style.transition = "opacity 0.5s";
        rightRef.current.querySelector("img").style.opacity = 1;
        leftRef.current.querySelector("img").style.opacity = 1;
        mergeSort(characters, compare).then((sortedCharacters) => {
            setOrderedCharacters(sortedCharacters);
        });
        return () => {
            console.log("cleaning up");
            rightRef.current.querySelector("img").removeEventListener("click", onClickRight);
            leftRef.current.querySelector("img").removeEventListener("click", onClickLeft);
        }
    }, [characters]);

    useEffect(() => {
    }, [orderedCharacters]);

    return (
        orderedCharacters.length == 0 ?
            <div className="absolute inset-0 bg-anilist-300 flex items-center justify-center flex-col gap-2">
                <div className="w-3/4 md:w-1/6 bg-anilist-100 rounded-full h-6 overflow-hidden relative shadow-xs shadow-anilist-400">
                    <div className=" absolute inset-0 text-white text-xs flex items-center justify-center p-3">
                        <span className="text-[0.65rem]">
                            {comparisons == maxComparisons ? "Any time now..." : maxComparisons == 1 ? "" : "Approximately " + (maxComparisons - comparisons) + " left"}
                        </span>
                        <span className="ml-auto font-semibold ">
                            {Math.floor(comparisons * 100 / maxComparisons)}%
                        </span>
                    </div>
                    <div
                        style={{
                            width: `${comparisons / maxComparisons * 100}%`,
                        }}
                        className="bg-anilist-400 h-full">
                    </div>
                </div>
                <div className="w-full h-1/2 flex justify-center items-center gap-2">
                    <div
                        ref={leftRef}
                        key={"left"}
                        className="rounded overflow-hidden h-full aspect-[2/3] cursor-pointer hover:brightness-110 transition-all relative">
                        <img draggable={false} src={null} style={{ opacity: 0, maxHeight: 0 }} className="h-full aspect-[2/3] object-cover z-10 absolute inset-0 select-none" />
                        <SlidingSuspense />
                    </div>
                    <div
                        ref={rightRef}
                        key={"idk"}
                        className="rounded overflow-hidden h-full aspect-[2/3] cursor-pointer hover:brightness-110 transition-all relative">
                        <img draggable={false} src={null} style={{ opacity: 0, maxHeight: 0 }} className="h-full aspect-[2/3] object-cover z-10 absolute inset-0 select-none " />
                        <SlidingSuspense />
                    </div>
                </div>
                {/* <div className="text-white">
                    <button
                        ref={idkRef}
                        key={"idk"}
                        className="rounded bg-anilist-400 hover:bg-anilist-500 transition-all px-4 py-2">
                        I don't know
                    </button>
                </div> */}
            </div> :
            <div className="bg-anilist-300 min-h-screen pt-24">
                <div className="w-full h-full flex justify-center items-center">
                    <div className="w-full m-5 md:w-1/4 h-1/2 flex flex-wrap justify-center items-center content-center rounded overflow-hidden">
                        {
                            orderedCharacters.map((character) => {
                                return <div
                                    key={character.name}
                                    className="overflow-hidden w-[calc(100%/5)] aspect-[2/3] cursor-pointer hover:brightness-110 transition-all relative">
                                    <img src={character.image} className="h-full aspect-[2/3] object-cover z-10 absolute inset-0 m-0.5 rounded" />
                                </div>
                            })
                        }
                    </div>
                </div>
            </div>
    )
}

function SlidingSuspense() {
    return <div className="w-full h-full bg-anilist-100 animate-pulse">
        <div className="w-full h-full flex justify-center items-center animate-slide">
            <div className="w-1/4 h-[200%] bg-gradient-to-r from-transparent via-white to-transparent opacity-5 rotate-45"></div>
        </div>
    </div>;
}
