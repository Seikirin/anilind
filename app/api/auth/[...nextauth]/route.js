import NextAuth from "next-auth"
import axios from "axios"

const authOptions = {
  providers: [
    {
      id: "AniListProvider",
      name: "AniList",
      type: "oauth",
      token: "https://anilist.co/api/v2/oauth/token",
      authorization: {
        url: "https://anilist.co/api/v2/oauth/authorize",
        params: { scope: "", response_type: "code" },
      },
      userinfo: {
        async request(context) {
          const { access_token } = context.tokens;
          const { data } = await axios.post(
            "https://graphql.anilist.co",
            {
              query: `
                query {
                  Viewer {
                    id
                    name
                    avatar {
                      large
                    }
                  }
                }
              `,
            },
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
              },
            }
          );

          return {
            name: data.data.Viewer.name,
            sub: data.data.Viewer.id,
            image: data.data.Viewer.avatar.large,
          };
        },
      },
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile?.name,
          image: profile.image,
        };
      },
    },
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    async signOut({ token, session }) {
    },
  },
}

// https://anilist.co/api/v2/oauth/authorize?client_id=11346&scope=&response_type=code&redirect_uri=https%3A%2F%2Fani-calendar.vercel.app%2Fapi%2Fauth%2Fcallback%2FAniListProvider&state=eOJKdrM_mFqKzO4Oe2Y3MJ3f7Rm9PuIr6-uUrLAJX_4

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST };