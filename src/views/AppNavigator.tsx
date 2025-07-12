import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppsListView } from './AppsListView';
import { AppDetailView } from './AppDetailView';
import { AppInfo } from '../models/AppInfo';

export type RootStackParamList = {
  AppsList: undefined;
  AppDetail: { app: AppInfo };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="AppsList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppsList" component={AppsListView} />
      <Stack.Screen name="AppDetail" component={AppDetailView} />
    </Stack.Navigator>
  </NavigationContainer>
); 