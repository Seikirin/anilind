import './globals.css'
import { Poppins } from 'next/font/google'
import Provider from "@/components/Provider"
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Navbar } from '../components/Navbar';
import Head from 'next/head';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700']
});

export const metadata = {
  title: 'AniLind',
  appleWebApp: {
    title: 'AniLind',
    statusBarStyle: 'black-translucent',
    startupImage: [
      '/icon.png',
    ],
  },
}

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={poppins.className + ` bg-anilist-50`}>
        <Head>

        </Head>
        <Navbar session={session} />
        <Provider session={session}>
          {children}
        </Provider>
      </body>
    </html>
  )
}
