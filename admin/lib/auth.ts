import NextAuth, { AuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';
import { API_ENDPOINTS, SESSION_MAX_AGE, ROUTES } from './constants';

interface ExtendedUser extends User {
  token?: string;
  role?: string;
  permissions?: string[];
}

interface ExtendedSession extends Session {
  accessToken?: string;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    permissions?: string[];
  };
}

interface ExtendedJWT extends JWT {
  accessToken?: string;
  role?: string;
  permissions?: string[];
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (res.ok && data.token) {
            return {
              id: data.admin.id,
              name: data.admin.name,
              email: data.admin.email,
              role: data.admin.role,
              permissions: data.admin.permissions,
              token: data.token,
            };
          }

          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: ExtendedJWT; user: ExtendedUser }) {
      if (user) {
        token.accessToken = user.token;
        token.role = user.role;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      const extendedSession = session as ExtendedSession;
      if (extendedSession.user) {
        extendedSession.accessToken = token.accessToken as string;
        extendedSession.user.id = token.sub;
        extendedSession.user.role = token.role as string;
        extendedSession.user.permissions = token.permissions as string[];
      }
      return extendedSession;
    }
  },
  pages: {
    signIn: ROUTES.LOGIN,
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: SESSION_MAX_AGE,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
