import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { ChatRoomScreen } from "../screens/Chat/ChatRoomScreen";

const Stack = createStackNavigator();

export const ChatNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </Stack.Navigator>
  );
};
