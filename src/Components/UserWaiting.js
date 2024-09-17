import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, BackHandler, StyleSheet } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute, CommonActions, useFocusEffect } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import LottieView from 'lottie-react-native';
import { Buffer } from 'buffer';

const WaitingUser = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [decodedId, setDecodedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('waiting');
  const [cancelMessage, setCancelMessage] = useState('');
  const [city, setCity] = useState(null);
  const [area, setArea] = useState(null);
  const [pincode, setPincode] = useState(null);
  const [alternatePhoneNumber, setAlternatePhoneNumber] = useState(null);
  const [service, setService] = useState(null);
  const [alternateName, setAlternateName] = useState(null);
  const [encodedData, setEncodedData] = useState(null);
  const attemptCountRef = useRef(0);

  useEffect(() => {
    if (encodedData && encodedData !== 'No workers found within 2 km radius') {
      try {
        const decoded = Buffer.from(encodedData, 'base64').toString('utf-8');
        setDecodedId(decoded);
      } catch (error) {
        console.error('Error decoding Base64:', error);
      }
    }
  }, [encodedData]);

  const fetchData = async () => {
    const { area, city, pincode, alternateName, alternatePhoneNumber, serviceBooked } = route.params;
    setCity(city);
    setArea(area);
    setPincode(pincode);
    setAlternatePhoneNumber(alternatePhoneNumber);
    setAlternateName(alternateName);
    setService(serviceBooked);

    try {
      const jwtToken = await EncryptedStorage.getItem('cs_token');
      if (!jwtToken) {
        Alert.alert('Error', 'No token found');
        return;
      }

      const response = await axios.post(
        `${process.env.BACKEND}/api/workers-nearby`,
        { area, city, pincode, alternateName, alternatePhoneNumber, serviceBooked },
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );

      if (response.status === 200) {
        const encode = response.data;
        setEncodedData(encode);
        console.log(encode)
        if (encode && encode !== 'No workers found within 2 km radius') {
          await axios.post(
            `${process.env.BACKEND}/api/user/action`,
            { encodedId: encode, screen: 'userwaiting', serviceBooked, area, city, pincode, alternateName, alternatePhoneNumber },
            { headers: { Authorization: `Bearer ${jwtToken}` } }
          );
        }
      } else {
        Alert.alert('Error', 'Unexpected response status');
      }
    } catch (error) {
      console.error('Error fetching nearby workers:', error);
      Alert.alert('Error', 'Failed to fetch nearby workers');
    }
  };

  useEffect(() => {
    const { encodedId } = route.params;
    if (encodedId && encodedData !== 'No workers found within 2 km radius') {
      setEncodedData(encodedId);
      try {
        const decoded = Buffer.from(encodedId, 'base64').toString('utf-8');
        setDecodedId(decoded);
      } catch (error) {
        console.error('Error decoding Base64:', error);
      }
    } else {
      fetchData();
    }
  }, [route.params]);

  const handleManualCancel = async () => {
    try {
      if (decodedId) {
        await axios.post(`${process.env.BACKEND}/api/user/cancellation`, { user_notification_id: decodedId });

        const cs_token = await EncryptedStorage.getItem('cs_token');
        await axios.post(
          `${process.env.BACKEND}/api/user/action/cancel`,
          { encodedId: encodedData, screen: 'userwaiting' },
          { headers: { Authorization: `Bearer ${cs_token}` } } 
        );
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Tabs', state: { routes: [{ name: 'Home' }] } }],
        })
      );
    } catch (error) {
      console.error('Error calling cancellation API:', error);
      setCancelMessage('Cancel timed out');
      setTimeout(() => setCancelMessage(''), 3000);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Tabs', state: { routes: [{ name: 'Home' }] } }],
        })
      );
    }
  };

  const handleCancelAndRetry = async () => {
    attemptCountRef.current += 1;

    if (attemptCountRef.current > 3) {
      Alert.alert("No workers found", "Unable to find workers after 3 attempts. Please try again later.");
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Tabs', state: { routes: [{ name: 'Home' }] } }],
        })
      );
      return;
    }

    if (decodedId) {
      try {
        await axios.post(`${process.env.BACKEND}/api/user/cancellation`, { user_notification_id: decodedId });
      } catch (error) {
        console.error("Error cancelling previous request:", error);
      }
    }

    const cs_token = await EncryptedStorage.getItem('cs_token');
    await axios.post(
      `${process.env.BACKEND}/api/user/action/cancel`,
      { encodedId: encodedData, screen: 'userwaiting' },
      { headers: { Authorization: `Bearer ${cs_token}` } }
    );

    await fetchData();
  };

  useEffect(() => {
    let intervalId;
    if (decodedId || encodedData === 'No workers found within 2 km radius') {
      intervalId = setInterval(handleCancelAndRetry, 120000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [decodedId, encodedData]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${process.env.BACKEND}/api/checking/status`, {
          params: { user_notification_id: decodedId }
        });
    
        console.log('API Response:', response.data);
    
        const { status, notification_id } = response.data;
    
        // Update type checks to accommodate number type for notification_id
        if (typeof status !== 'string' || typeof notification_id !== 'number') {
          throw new TypeError('Unexpected type in API response');
        }
    
        if (status === 'accept') {
          setStatus('accepted');
          // Convert notification_id to a string if needed
          const encodedNotificationId = Buffer.from(notification_id.toString(), 'utf-8').toString('base64');
          const cs_token = await EncryptedStorage.getItem('cs_token');
    
          await axios.post(
            `${process.env.BACKEND}/api/user/action/cancel`,
            { encodedId: encodedData, screen: 'userwaiting' },
            { headers: { Authorization: `Bearer ${cs_token}` } }
          );

          await axios.post(
            `${process.env.BACKEND}/api/user/action`,
            { encodedId: encodedNotificationId, screen: 'UserNavigation', serviceBooked: service },
            { headers: { Authorization: `Bearer ${cs_token}` } }
          );


    
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'UserNavigation', params: { encodedId: encodedNotificationId, service: service } }]
            })
          );
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };
    
    
    

    if (decodedId) {
      const intervalId = setInterval(checkStatus, 3000);
      return () => clearInterval(intervalId);
    }
  }, [decodedId, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Cancel', 'Are you sure you want to cancel?', [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: handleManualCancel },
        ]);
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finding the nearest worker for you</Text>
      {loading && (
        <LottieView
          source={require('../assets/waitingLoading.json')}
          autoPlay
          loop
          style={styles.loadingAnimation}
        />
      )}
      <Text style={styles.subtitle}>Please wait</Text>
      <View style={styles.buttonContainer}>
        <Text style={styles.greet}>We are currently finding the best nearby worker to help you out</Text>
        <TouchableOpacity style={styles.button} onPress={handleManualCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      {cancelMessage && <Text style={styles.errorText}>{cancelMessage}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#888',
  },
  loadingAnimation: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  greet: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#555',
  },
  button: {
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    fontSize: 14,
  },
});

export default WaitingUser;
