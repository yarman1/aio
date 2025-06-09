import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useRoute,
  RouteProp,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { baseAPI } from '../services/baseAPI';
import { AppStackParamList } from '../navigation/AppNavigator';

type PlansReturnRouteProp = RouteProp<AppStackParamList, 'PlansReturn'>;
type PlansReturnNavProp = NativeStackNavigationProp<
  AppStackParamList,
  'PlansReturn'
>;

export default function PlansReturn() {
  const { creatorId: stringId } = useRoute<PlansReturnRouteProp>().params;
  const creatorId = Number(stringId);
  const navigation = useNavigation<PlansReturnNavProp>();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      baseAPI.util.invalidateTags([
        { type: 'CreatorPlans', id: 'PARTIAL-LIST' },
        { type: 'SubscriptionInfo', id: creatorId },
        { type: 'Followed' },
        { type: 'CreatorCategories' },
        { type: 'CreatorPosts' },
        { type: 'Post' },
        { type: 'CreatorPublic' },
      ]),
    );

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: 'MainTabs',
            state: {
              routes: [{ name: 'Home' }],
            },
          },
          {
            name: 'Creator',
            params: { creatorId },
            state: {
              routes: [{ name: 'Plans', params: { creatorId } }],
            },
          },
        ],
      }),
    );
  }, [dispatch, navigation, creatorId]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
