// lib/linking.ts
import { LinkingOptions } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  AlarmScreen: { type: 'medication' | 'appointment' | 'treatment'; id: string };
};

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['recuerdamed://'],
  config: {
    screens: {
      AlarmScreen: 'alarm/:type/:id',
    },
  },
};


