import * as Linking from 'expo-linking';

export const linking = {
  prefixes: ['tmbc://'],
  config: {
    screens: {
      Register: {
        path: 'register',
        parse: {
          token: (token: string) => token,
        },
      },
    },
  },
};
