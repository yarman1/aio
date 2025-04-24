import "react-native-reanimated";
import "react-native-gesture-handler";
import React from "react";
import "./global.css";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store } from "./src/store/store";
import RootNavigator from "./src/navigation";

const App: React.FC = () => (
  <SafeAreaProvider>
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  </SafeAreaProvider>
);

export default App;
