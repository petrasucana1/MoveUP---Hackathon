import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedLine from '../components/lines/AnimatedLine';
import {Colors} from '../constants/Colors';


const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/start-screen'); 
    }, 4000); 
    
    return () => clearTimeout(timer); 
  }, [router]);

  return (
    <LinearGradient
      colors={[Colors.white, Colors.white, Colors.white]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <Image source={require('../assets/images/logo1.png')} style={styles.logo} />
        <AnimatedLine />
      </View>
      
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -100,
  },
  logo: {
    width: 350, 
    height: 200,
    resizeMode: 'contain',
  },
});

export default SplashScreen;
