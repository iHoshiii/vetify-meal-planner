import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolveServerUrls } from './server-urls';

export function serverUrls() {
  return resolveServerUrls({
    hostUri: Constants.expoConfig?.hostUri,
    platform: Platform.OS,
    development: __DEV__,
    plannerUrl: process.env.EXPO_PUBLIC_PLANNER_API_URL,
    mainUrl: process.env.EXPO_PUBLIC_MAIN_API_URL,
  });
}
