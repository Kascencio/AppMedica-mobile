import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';
import AlarmScreen from './screens/AlarmScreen/AlarmScreen';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Register the alarm screen so it can be launched by the native AlarmActivity
AppRegistry.registerComponent('AlarmScreen', () => AlarmScreen);
