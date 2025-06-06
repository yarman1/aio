import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {
  useGetMyPlanQuery,
  useUpdatePlanMutation,
  useGetCreatorCategoriesQuery,
  useGetExternalBenefitsQuery,
} from '../../services/baseAPI';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

function CheckBoxItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.checkboxContainer,
        checked && styles.checkboxContainerChecked,
      ]}
    >
      <Text style={styles.checkboxLabel}>{label}</Text>
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked && <View style={styles.checkboxTick} />}
      </View>
    </Pressable>
  );
}

type EditPlanRouteProp = RouteProp<AppStackParamList, 'EditPlan'>;
type EditPlanNavProp = NativeStackNavigationProp<AppStackParamList, 'EditPlan'>;

export default function CreatorEditPlanScreen() {
  const route = useRoute<EditPlanRouteProp>();
  const navigation = useNavigation<EditPlanNavProp>();
  const { planId } = route.params;

  const {
    data: plan,
    isLoading: loadingPlan,
    refetch: refetchPlan,
  } = useGetMyPlanQuery(planId, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const {
    data: categories,
    isLoading: loadingCategories,
    refetch: refetchCategories,
  } = useGetCreatorCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const {
    data: benefits,
    isLoading: loadingBenefits,
    refetch: refetchBenefits,
  } = useGetExternalBenefitsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const [updatePlan, { isLoading: savingPlan }] = useUpdatePlanMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<number[]>([]);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setDescription(plan.description);
      setSelectedCategoryIds(plan.creatorCategories.map((c) => c.id));
      setSelectedBenefitIds(plan.externalBenefits.map((b) => b.id));
    }
  }, [plan]);

  useEffect(() => {
    if (plan) {
      refetchCategories();
      refetchBenefits();
    }
  }, [plan, refetchCategories, refetchBenefits]);

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      return Alert.alert('Validation', 'Name is required.');
    }

    try {
      await updatePlan({
        planId,
        name: name.trim(),
        description: description.trim(),
        categoryIds: selectedCategoryIds,
        externalBenefits: selectedBenefitIds,
      }).unwrap();

      refetchPlan();
      Alert.alert('Success', 'Plan updated.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Failed to update plan.');
    }
  };

  if (loadingPlan || loadingCategories || loadingBenefits) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.heading}>Plan not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View
        style={[
          styles.statusBarShim,
          { height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 },
        ]}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Edit Plan: “{plan.name}”</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Price</Text>
        <Text style={styles.readOnlyValue}>${plan.price}</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Interval</Text>
        <Text style={styles.readOnlyValue}>
          {plan.intervalCount} {plan.interval}
        </Text>

        <Text style={[styles.subheading, { marginTop: 16 }]}>Categories</Text>
        {categories?.map((cat) => {
          const isChecked = selectedCategoryIds.includes(cat.id);
          return (
            <CheckBoxItem
              key={cat.id}
              label={cat.name}
              checked={isChecked}
              onToggle={() => {
                if (isChecked) {
                  setSelectedCategoryIds((prev) =>
                    prev.filter((id) => id !== cat.id),
                  );
                } else {
                  setSelectedCategoryIds((prev) => [...prev, cat.id]);
                }
              }}
            />
          );
        })}

        <Text style={[styles.subheading, { marginTop: 16 }]}>
          External Benefits
        </Text>
        {benefits?.map((b) => {
          const isChecked = selectedBenefitIds.includes(b.id);
          return (
            <CheckBoxItem
              key={b.id}
              label={b.name}
              checked={isChecked}
              onToggle={() => {
                if (isChecked) {
                  setSelectedBenefitIds((prev) =>
                    prev.filter((id) => id !== b.id),
                  );
                } else {
                  setSelectedBenefitIds((prev) => [...prev, b.id]);
                }
              }}
            />
          );
        })}

        <Pressable
          style={[
            styles.button,
            (!name.trim() || savingPlan) && styles.buttonDisabled,
          ]}
          onPress={handleSaveChanges}
          disabled={!name.trim() || savingPlan}
        >
          {savingPlan ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </Pressable>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safe: { flex: 1, backgroundColor: '#fff' },
  statusBarShim: { width: '100%', backgroundColor: '#fff' },
  container: { padding: 16 },

  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#FAFAFA',
    fontSize: 14,
  },
  readOnlyValue: {
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    color: '#333',
  },

  subheading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkboxContainerChecked: {
    backgroundColor: '#E6F8E6',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxTick: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
  },

  button: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
