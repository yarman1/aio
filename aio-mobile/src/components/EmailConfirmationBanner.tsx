import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { AppStackParamList } from '../navigation/AppNavigator';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export default function EmailConfirmationBanner() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<Record<string, undefined>>,
        BottomTabNavigationProp<AppStackParamList>
      >
    >();
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Your email isn’t confirmed yet.</Text>
      <TouchableOpacity onPress={() => navigation.navigate('ConfirmEmail')}>
        <Text style={styles.link}>Confirm email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF4E5',
    padding: 10,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderColor: '#FFD2A5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
});
