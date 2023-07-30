import NextAuth from "next-auth"
import axios from "axios"
import GithubProvider from "next-auth/providers/github"

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
            token: access_token,
          };
        },
      },
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      profile(profile, tokens) {
        return {
          id: profile.sub,
          name: profile?.name,
          image: profile.image,
          accessToken: tokens.access_token,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    session: async ({ session, token, user }) => {
      if (session?.user) {
        session.user.id = token.sub;
      }
      session.accessToken = token.accessToken
      return session;
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST, authOptions };