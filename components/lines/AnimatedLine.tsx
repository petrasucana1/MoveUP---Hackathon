import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {Colors} from '../../constants/Colors';

const { width } = Dimensions.get('window');

const AnimatedLine = () => {
  const translateX = useSharedValue(-width); 

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  useEffect(() => {
    
    translateX.value = withRepeat(
      withTiming(0, { duration: 2000 }),  
      -1,  
      true  
    );
  }, [translateX]);

  return (
    <View style={styles.lineContainer}>
      <Animated.View style={[styles.animatedGradient, animatedStyle]}>
        <LinearGradient
          colors={[Colors.red, Colors.gray_blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  lineContainer: {
    width: '80%',
    height: 4,
    backgroundColor: Colors.blue,
    overflow: 'hidden',
    borderRadius: 2,
  },
  animatedGradient: {
    width: '250%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
});

export default AnimatedLine;
