import React from "react";
import { View, StyleSheet } from "react-native";

export const OnlineDot = ({ online, size = 12, style }) => {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: online ? "#25D366" : "#95A5A6",
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
    borderColor: "#FFF",
  },
});
