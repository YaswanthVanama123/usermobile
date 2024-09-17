import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import EncryptedStorage from 'react-native-encrypted-storage';
import HomeScreen from './screens/HomeScreen';
import MyServicesScreen from './screens/MyServicesScreen';
import AccountScreen from './screens/AccountScreen';
import Maps from './screens/Maps';
import Feather from 'react-native-vector-icons/Feather'
import UserLocation from './Components/userLocation';
import Login from './Components/Login';
import UserWaiting from './Components/UserWaiting';
import Navigation from './Components/Navigation';
import TimingScreen from './Components/TimingScreen';
import Payment from './Components/Paymentscreen';
import Rating from './Components/RatingScreen';
import NavigationObserver from './Components/NavigationObserver'; 
import { Alert,PermissionsAndroid } from 'react-native';
import LoginAuth from './screens/LoginAuth';
import UserNotifications from './screens/UserNotifications';
import ServiceApp from './screens/SecondPage';
import PaintingServices from './screens/Indiv';
import Entypo from 'react-native-vector-icons/Entypo'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import SearchItem from './Components/SearchItem';
import Time from './screens/Time';
// import TimerComponent from './Components/TimerComponent';
import Phonepe from './screens/Phonepe';
import OnboardingScreen from './screens/OnBoarding';
import SplashScreen from 'react-native-splash-screen';
import Help from './Components/Help';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


function TabNavigator() { 

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home';
            return <Feather name={iconName} size={size} color={color} />;
          } else if (route.name === 'MyServices') {
            iconName = focused ? 'bookmark' : 'bookmark';
            return <Feather name={iconName} size={size} color={color} />;
          } else if (route.name === 'Notification') {
            iconName = focused ? 'notification' : 'notification';
            return <Entypo name={iconName} size={size} color={color} />;
          } else if (route.name === 'Account') {
            iconName = focused ? 'account-outline' : 'account-outline';
            return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
          }

          // You can return any component that you like here!
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      {/* <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} /> */}
      <Tab.Screen name="Home" component={ServiceApp} options={{ headerShown: false }} />
      <Tab.Screen name="MyServices" component={MyServicesScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Notification" component={UserNotifications} options={{ headerShown: false }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
      <Tab.Screen name="OnBoard" component={OnboardingScreen} options={{ headerShown: false }} />
      {/* <Tab.Screen name="Time" component={Time} options={{ headerShown: false }} /> */}
      <Tab.Screen name="Phonepe" component={Phonepe} options={{ headerShown: false }} />
      <Tab.Screen name="LoginAuth" component={LoginAuth} options={{ headerShown: false }} />

      {/* <Tab.Screen name="Second" component={ServiceApp} options={{ headerShown: false }} /> */}
      {/* <Tab.Screen name="Indiv" component={PaintingServices} options={{ headerShown: false }} /> */}
      {/* <Tab.Screen name="Maps" component={Maps} options={{ headerShown: false }} />
      <Tab.Screen name="Notifications" component={Notifications} options={{ headerShown: false }} /> */}
    </Tab.Navigator>
  );
}




function App() {
  useEffect(() => {
    async function requestUserPermission() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  
      if (enabled) {
        console.log('Authorization status:', authStatus);
      } else {
        console.log('Notification permission not granted');
      }
    }

    async function requestNotificationPermission() {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message:
            "This app needs access to your notifications " +
            "so you can receive important updates.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK" 
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("You can use the notifications");
      } else {
        console.log("Notification permission denied");
      }
    }


    const getTokens = async () => {
      try {
        console.log("fcm dhi",process.env.REACT_APP_API_BACKEND)
        const token = await messaging().getToken();
        console.log("fcm",token)
        // Store or update the FCM token in encrypted storage
        await EncryptedStorage.setItem('fcm_token', token);

        // Retrieve cs_token from storage
        const cs_token = await EncryptedStorage.getItem('cs_token');
        console.log("user token",cs_token)
        if(cs_token){
        // Send the token to the backend
        //await axios.post('http://10.0.2.2:5000/api/user/store-fcm-token', 
          // await axios.post(`${process.env.REACT_APP_API_BACKEND}/api/user/store-fcm-token`, 
          await axios.post(`${process.env.BACKEND}/api/user/store-fcm-token`,
          { fcmToken: token },
          { headers: { Authorization: `Bearer ${cs_token}` } }
        );
      }
      } catch (error) {
        console.error('Error storing FCM token in the backend:', error);
      }
    };
  
    requestUserPermission();
    requestNotificationPermission();
    getTokens()

    // Create notification channel
    PushNotification.createChannel(
      {
        channelId: "default-channel-id", 
        channelName: "Default Channel", 
        channelDescription: "A default channel", 
        soundName: "default", 
        importance: 4, 
        vibrate: true, 
      },
      (created) => console.log(`createChannel returned '${created}'`) 
    );

    const storeNotificationInBackend = async (notification) => {
      console.log(process.env.REACT_APP_API_BACKEND)
      try {
        const pcs_token = await EncryptedStorage.getItem('cs_token');
        const fcmToken = await EncryptedStorage.getItem('fcm_token');
        await axios.post(
          `${process.env.BACKEND}/api/user/store-notification`, 
          { notification, fcmToken }, // data object
          { headers: { Authorization: `Bearer ${pcs_token}` } } // configuration with headers
        );
    
        console.log('Notification stored in backend:', notification);
      } catch (error) {
        console.error('Failed to store notification in backend:', error);
      }
    };


    const storeNotificationLocally = async (notification) => {
      try {
        const existingNotifications = await EncryptedStorage.getItem('notifications');
        let notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
    
        notifications.push(notification);
    
        await EncryptedStorage.setItem('notifications', JSON.stringify(notifications));
        console.log('Notification stored locally:', notification);
    
        // Also store in backend
        storeNotificationInBackend(notification);
      } catch (error) {
        console.error('Failed to store notification locally:', error);
      }
    };

    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));

      const notification = {
        title: remoteMessage.notification.title,
        body: remoteMessage.notification.body,
        data: remoteMessage.data,
        userNotificationId: remoteMessage.data.user_notification_id, // Include the user_notification_id
        receivedAt: new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date()),
      };

      storeNotificationLocally(notification);

      PushNotification.localNotification({
        channelId: "default-channel-id", 
        title: remoteMessage.notification.title, 
        message: remoteMessage.notification.body, 
        playSound: true, 
        soundName: 'default', 
        data: remoteMessage.data, 
        userInfo: remoteMessage.data, 
      });
    });

    
    PushNotification.configure({
      onNotification: function(notification) {
        if (notification.userInteraction) {
          const userNotificationId = notification.data.user_notification_id;
          console.log("User notification ID from foreground state:", userNotificationId);
          if (userNotificationId && navigationRef.current) {
            navigationRef.current.dispatch(
              CommonActions.navigate('Acceptance', { userNotificationId })
            );
          }
        }
      }
    }); 

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', JSON.stringify(remoteMessage));
      const notification = {
        title: remoteMessage.notification.title,
        body: remoteMessage.notification.body,
        receivedAt: new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date()),
      };
      storeNotificationLocally(notification);
    });

    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', JSON.stringify(remoteMessage));
      const userNotificationId = remoteMessage.data.user_notification_id;
      console.log("User notification ID from background state:", userNotificationId);
      if (userNotificationId && navigationRef.current) {
        navigationRef.current.dispatch(
          CommonActions.navigate('Acceptance', { userNotificationId })
        );
      }
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', JSON.stringify(remoteMessage));
        const notification = {
          title: remoteMessage.notification.title,
          body: remoteMessage.notification.body,
          receivedAt: new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(new Date()),
        };
        storeNotificationLocally(notification);
      }
    });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
    };
    
  }, []);
  
  useEffect(() =>{
    SplashScreen.hide()
  },[])

  return (
    <NavigationContainer>
      {/* <NavigationObserver /> */}
      <Stack.Navigator>
        {/* <Stack.Screen name="RouteFetcher" component={RouteFetcher} options={{ headerShown: false }} /> */}
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="UserLocation" component={UserLocation} options={{ title: 'User Location', headerShown: false }} />
        <Stack.Screen name="Login" component={Login} options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="userwaiting" component={UserWaiting} options={{ title: 'userwaiting', headerShown: false }} />
        <Stack.Screen name="UserNavigation" component={Navigation} options={{ title: 'UserNavigation', headerShown: false }} />
        <Stack.Screen name="worktimescreen" component={TimingScreen} options={{ title: 'worktimescreen', headerShown: false }} />
        <Stack.Screen name="Paymentscreen" component={Payment} options={{ title: 'Paymentscreen', headerShown: false }} />
        <Stack.Screen name="Rating" component={Rating} options={{ title: 'Rating', headerShown: false }} />
        <Stack.Screen name="serviceCategory" component={PaintingServices} options={{ title: 'serviceCategory', headerShown: false }} />
        <Stack.Screen name="SearchItem" component={SearchItem} options={{ title: 'SearchItem', headerShown: false }} />
        <Stack.Screen name="Help" component={Help} options={{ title: 'Help', headerShown: false }} />
        {/* <Stack.Screen name="TimerComponent" component={TimerComponent} options={{ title: 'TimerComponent', headerShown: false }} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;