'use client';

import { useContext, useEffect, useMemo, useState, useRef } from "react";
import DataContext from "@/contexts/DataContext";
import { useSession } from "next-auth/react";

function getAnilistFavoriteCharacters(username, setDataState) {
    const getBody = (username, page) => {
        return JSON.stringify({
            query: `
                query ($username: String, $page: Int) {
                    User(name: $username) {
                        favourites {
                            characters(page: $page) {
                                pageInfo {
                                    hasNextPage
                                    currentPage
                                }
                                nodes {
                                    name {
                                        full
                                    }
                                    image {
                                        large
                                    }
                                    id
                                }
                            }
                        }
                    }
                }
            `,
            variables: {
                username: username,
                page: page,
            },
        });
    };

    const getCharacters = (username, page) => {
        return fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: getBody(username, page),
        })
            .then((res) => res.json())
            .then((res) => {
                const characters = res.data.User.favourites.characters;
                const pageInfo = characters.pageInfo;
                const nodes = characters.nodes;
                if (pageInfo.hasNextPage) {
                    return getCharacters(username, pageInfo.currentPage + 1).then((nextNodes) => {
                        return nodes.concat(nextNodes);
                    });
                } else {
                    return nodes;
                }
            })
            .catch((err) => {
                console.log(err);
                setDataState("error");
                return [];
            }
            );
    };

    return getCharacters(username, 1).then((characters) => {
        console.log(characters);
        const charactersData = characters.map((character) => {
            return {
                name: character.name.full,
                image: character.image.large,
                id: character.id,
            };
        });
        setDataState("loaded");
        return charactersData;
    });
}

function updateAnilistFavoriteOrder(orderedCharacters, session) {
    const { accessToken } = session;
    const characterIds = orderedCharacters.map((character) => character.id);

    console.log("Updating with ")
    orderedCharacters.forEach((character) => {
        console.log(character.name + ": " + character.id);
    });
    console.log("Updating with " + characterIds.join(", "));

    const getBody = (orderedCharacterIds) => {
        return JSON.stringify({
            query: `
            mutation {
                UpdateFavouriteOrder(
                    characterIds: [${orderedCharacterIds.join(', ')}],
                    characterOrder: [${orderedCharacterIds.map((id, index) => `${index}`).join(', ')}]
                )
                {
                    characters {
                        nodes {
                            id
                        }
                    }
                }
            }
        `
        });
    };

    return fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
        },
        body: getBody(characterIds),
    }).then((res) => res.json()).then((res) => {
        console.log(res);
    });
}


async function mergeInsertionSort(arr, compareFn) {
    if (arr.length <= 1) return arr;

    async function merge(left, right) {
        const result = [];
        let leftIndex = 0;
        let rightIndex = 0;

        while (leftIndex < left.length && rightIndex < right.length) {
            const comparisonResult = await compareFn(left[leftIndex], right[rightIndex]);

            if (comparisonResult <= 0) {
                result.push(left[leftIndex]);
                leftIndex++;
            } else {
                result.push(right[rightIndex]);
                rightIndex++;
            }
        }

        // Add the remaining elements from both arrays
        while (leftIndex < left.length) {
            result.push(left[leftIndex]);
            leftIndex++;
        }

        while (rightIndex < right.length) {
            result.push(right[rightIndex]);
            rightIndex++;
        }

        return result;
    }

    async function mergeSort(arr) {
        if (arr.length <= 1) return arr;

        const middle = Math.floor(arr.length / 2);
        const left = arr.slice(0, middle);
        const right = arr.slice(middle);

        return merge(await mergeSort(left), await mergeSort(right));
    }

    return mergeSort(arr);
}


export default function Page({ searchParams }) {
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
    const canChoose = useRef(false);
    const fadeSpeed = 100;

    const onClickRight = () => {
        if (choices.current.length != 2 || !canChoose.current)
            return;
        pickedChoice.current = choices.current[1];
    };
    const onClickLeft = () => {
        if (choices.current.length != 2 || !canChoose.current)
            return;
        pickedChoice.current = choices.current[0];
    };

    useEffect(() => {
        if (status === "authenticated") {
            getAnilistFavoriteCharacters('sysmek', setDataState).then((characters) => {
                if (searchParams.limit != null)
                    characters = characters.slice(0, searchParams.limit);
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
            if (maxComparisonsRef.current == 1)
            {
                let comparisons = 0;
                async function compare(a, b) {
                    comparisons++;
                    return Math.random() - 0.5;
                }
                mergeInsertionSort(characters, compare).then((sortedCharacters) => {
                    setMaxComparisons(comparisons);
                    maxComparisonsRef.current = comparisons;
                });
            }
        }
        if (characters.length === 0 || running.current == true)
            return;
        running.current = true;
        console.log("running");
        async function compare(a, b) {
            console.log("comparing", a, b);
            const elements = [rightRef.current.querySelector("img"), leftRef.current.querySelector("img")];
            canChoose.current = false;
            choices.current = [a, b];
            pickedChoice.current = null;
            // rightRef.current.querySelector("img").style.opacity = 0;
            // leftRef.current.querySelector("img").style.opacity = 0;
            elements.forEach((element) => {
                element.src = "https://cdn.discordapp.com/attachments/633768073068806144/1138119420317810892/brave_vOA72DIU8U.png";
            });
            // await new Promise((resolve) => setTimeout(resolve, fadeSpeed));
            rightRef.current.querySelector("img").src = b.image;
            leftRef.current.querySelector("img").src = a.image;
            elements.forEach((element) => {
                element.style.opacity = 1
            });
            let bothImagesLoaded = true;
            elements.forEach((element) => {
                if (!element.complete) {
                    bothImagesLoaded = false;
                }
            });
            if (!bothImagesLoaded) {
                elements.forEach((element) => {
                    element.style.opacity = 0.5;
                });
            }
            // await until both images are loaded
            await new Promise((resolve) => {
                let loaded = 0;
                elements.forEach((element) => {
                    if (element.complete) {
                        loaded++;
                        if (loaded == elements.length)
                            resolve();
                    }
                    else {
                        element.addEventListener("load", () => {
                            loaded++;
                            if (loaded == elements.length)
                                resolve();
                        });
                    }
                });
            });
            elements.forEach((element) => {
                // make image not blurry
                element.style.opacity = 1;
            });
            setTimeout(() => {
                if (rightRef.current == null || leftRef.current == null)
                    return;
                rightRef.current.querySelector("img").style.removeProperty("max-height");
                leftRef.current.querySelector("img").style.removeProperty("max-height");
            }, 1000);
            canChoose.current = true;
            while (pickedChoice.current === null) {
                console.log("waiting");
                await new Promise((resolve) => setTimeout(resolve, fadeSpeed));
            }
            setComparisons((c) => {
                    return c + 1;
            })
            choices.current = null;
            // rightRef.current.querySelector("img").style.opacity = 0;
            // leftRef.current.querySelector("img").style.opacity = 0;
            // await new Promise((resolve) => setTimeout(resolve, fadeSpeed * 1.5));
            return pickedChoice.current === b;
        }
        rightRef.current.querySelector("img").style.transition = `opacity ${fadeSpeed}ms, filter ${fadeSpeed}ms`;
        leftRef.current.querySelector("img").style.transition = `opacity ${fadeSpeed}ms`;
        rightRef.current.querySelector("img").style.opacity = 1;
        leftRef.current.querySelector("img").style.opacity = 1;
        mergeInsertionSort(characters, compare).then((sortedCharacters) => {
            console.log(sortedCharacters)
            setOrderedCharacters(sortedCharacters);
        });
        return () => {
            console.log("cleaning up");
            if (rightRef.current == null || leftRef.current == null)
                return;
            rightRef.current.querySelector("img").removeEventListener("click", onClickRight);
            leftRef.current.querySelector("img").removeEventListener("click", onClickLeft);
        }
    }, [characters]);

    useEffect(() => {
    }, [orderedCharacters]);

    return (
        orderedCharacters.length == 0 ?
            <div className="absolute inset-0 bg-anilist-300 flex items-center justify-center flex-col gap-2">
                <div className="w-3/4 md:w-4/12 bg-anilist-100 rounded-full h-6 overflow-hidden relative shadow-xs shadow-anilist-400">
                    <div className=" absolute inset-0 text-white text-xs p-3 flex justify-between items-center">
                        <span className="font-semibold flex-1 flex items-center gap-0.5">
                            {comparisons}
                            <span className="text-[0.5rem] pt-1">
                                / {maxComparisons}
                            </span>
                        </span>
                        <span className="text-[0.65rem] flex-1 text-center">
                            {comparisons >= maxComparisons ? "Any time now..." : maxComparisons == 1 ? "" : "About " + (maxComparisons - comparisons) + " left"}
                        </span>
                        <span className="font-semibold flex-1 text-right">
                            {Math.floor(
                                    (comparisons > maxComparisons ? maxComparisons : comparisons)
                                 * 100 / maxComparisons)}%
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
            <div className="bg-anilist-300 min-h-screen py-16 pb-2">
                <div className="w-full h-full flex justify-center items-center flex-col pt-4">
                    <button
                        onClick={() => {
                            console.log(orderedCharacters);
                            console.log(orderedCharacters.map((character) => character.id).join(", "));
                            updateAnilistFavoriteOrder(orderedCharacters, session);
                        }}
                        className="rounded bg-anilist-400 hover:bg-opacity-75 transition-all px-4 py-2 mb-2 text-white" >
                        Update Order
                    </button>
                    <div className="w-full md:w-1/4 h-1/2 flex flex-wrap justify-center items-center content-center rounded overflow-hidden">
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
