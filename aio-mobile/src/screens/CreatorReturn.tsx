import { CommonActions, useNavigation } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { baseAPI } from '../services/baseAPI';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type CreatorReturnNavProp = NativeStackNavigationProp<
  AppStackParamList,
  'CreatorReturn'
>;

export default function CreatorReturn() {
  const navigation = useNavigation<CreatorReturnNavProp>();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(baseAPI.util.invalidateTags(['Creator']));

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: 'MainTabs',
            state: {
              routes: [{ name: 'Settings' }],
            },
          },
          {
            name: 'CreatorManagement',
            state: {
              routes: [{ name: 'Settings' }],
            },
          },
        ],
      }),
    );
  }, [dispatch, navigation]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
