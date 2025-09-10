import { AppRegistry } from 'react-native';
import AlarmScreen from './screens/AlarmScreen/AlarmScreen';

// Register the alarm screen component.
// The name "AlarmScreen" must match the string returned by getMainComponentName() in AlarmActivity.java.
AppRegistry.registerComponent("AlarmScreen", () => AlarmScreen);
