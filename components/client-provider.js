'use client';

import { SessionProvider } from "next-auth/react";

export default async function Provider({ children, session }) {
    return (
        <SessionProvider session={session}>
            {children}
        </SessionProvider>
    )
}