'use client';
import { useState } from "react";
import DataContext from "@/contexts/DataContext";

export default function ContextProvider({ children }) {
    const [changed, setChanged] = useState(false);
    const [dataState, setDataState] = useState("idle");

    return (
        <DataContext.Provider value={{ changed, setChanged, dataState, setDataState }}>
            {children}
        </DataContext.Provider>
    )
}