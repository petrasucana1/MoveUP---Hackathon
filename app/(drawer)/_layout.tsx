import React from 'react';
import 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import {Colors} from "../../constants/Colors"
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { View, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExerciseProvider } from '@/components/ExerciseContext'; 
import { ApolloProvider } from '@apollo/client';
import client from '../../apolloClient';
import { useUser } from '@/components/UserContext'; 

const CustomDrawer=(props :any) => {
    const router=useRouter();
    const {top, bottom} = useSafeAreaInsets();
    return(
        <View style={{flex:1}}>
            <DrawerContentScrollView {...props} scrollEnabled={false}
            contentContainerStyle={{backgroundColor:Colors.white}}>
            <View style={{padding:30}}>
                <Image 
                    source={require('@/assets/images/icon.png')}
                     style={{width:100, height:100, alignSelf: 'center'}} 
                />
                <Text style={{
                  alignSelf: 'center',
                  fontFamily: 'Montserrat',
                  paddingTop:10,
                  color: Colors.dark_blue,
                  fontSize:20,
                }}> 
                MoveUP 
                </Text>
            </View>
              <View style={{backgroundColor: Colors.white, paddingTop: 10}}>
                   <DrawerItemList {...props} />
                   <DrawerItem label={"Logout"} onPress={() => router.replace ('/')} 
                     icon={({ size, color }) => (
                      <Ionicons name="log-out-outline" size={size} color={color} />
                    )}
                    />
              </View>
            </DrawerContentScrollView>

            <View
                style={{
                    borderTopColor:'#dde3fe',
                    borderTopWidth:2,
                    padding:20,
                    paddingBottom:30+bottom,
                }}>
                
                </View>
        </View>

        
    

    );
}

const DrawerLayout = () => {
  const { screen } = useUser(); 
  

  return (
    <GestureHandlerRootView style={{ flex:1 }}>
      <ApolloProvider client={client}>
        <ExerciseProvider> 
            <Drawer
              drawerContent={CustomDrawer}
              screenOptions={{
                drawerHideStatusBarOnOpen: true,
                drawerActiveBackgroundColor: Colors.dark_blue,
                drawerActiveTintColor: Colors.white,
              }}
            >
              <Drawer.Screen
                name={'home_1'}
                options={{
                  drawerLabel: 'Home',
                  headerShown: false,
                  headerTitle: '',
                  drawerIcon: ({size, color}) => (
                    <Ionicons name="barbell-outline" size={size} color={color} />
                  ),
                }}
              />

              <Drawer.Screen
                name="track_progress"
                options={{
                  drawerLabel: 'Workouts Done',
                  headerShown: false,
                  headerTitle: '',
                  drawerIcon: ({size, color}) => (
                    <Ionicons name="stats-chart-outline" size={size} color={color} />
                  ),
                }}
              />

              <Drawer.Screen name="live-screen" options={{
                drawerLabel: '',
                headerShown: false,
                drawerItemStyle: { display: 'none' },
              }} />
        
              <Drawer.Screen name="exercises" options={{
                drawerLabel: '',
                headerShown: false,
                drawerItemStyle: { display: 'none' },
              }} />

            </Drawer>
        </ExerciseProvider>
      </ApolloProvider>
    </GestureHandlerRootView>
  );
};


export default DrawerLayout;




