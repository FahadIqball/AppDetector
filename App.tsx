/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/views/AppNavigator';
import Toast from 'react-native-toast-message';

const App = () => {
  return (
    <>
      <AppNavigator />
      <Toast />
    </>
  );
};

export default App;
