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
  useGetMyCreatorQuery,
  useGetCreatorCategoriesQuery,
  useCreateCreatorCategoryMutation,
  useGetExternalBenefitsQuery,
  useCreateExternalBenefitMutation,
  useGetPlansQuery,
  useCreatePlanMutation,
} from '../../services/baseAPI';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

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

type PlansNavProp = NativeStackNavigationProp<
  AppStackParamList,
  'CreatorManagement'
>;

export default function CreatorManagementPlansScreen() {
  const navigation = useNavigation<PlansNavProp>();

  const { data: creator, isLoading: loadingCreator } = useGetMyCreatorQuery(
    undefined,
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );

  const {
    data: categories,
    isLoading: loadingCategories,
    refetch: refetchCategories,
  } = useGetCreatorCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const [createCategory, { isLoading: creatingCategory }] =
    useCreateCreatorCategoryMutation();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPublic, setNewCategoryPublic] = useState(false);

  const {
    data: benefits,
    isLoading: loadingBenefits,
    refetch: refetchBenefits,
  } = useGetExternalBenefitsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const [createBenefit, { isLoading: creatingBenefit }] =
    useCreateExternalBenefitMutation();
  const [newBenefitName, setNewBenefitName] = useState('');

  const {
    data: plans,
    isLoading: loadingPlans,
    refetch: refetchPlans,
  } = useGetPlansQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const [createPlan, { isLoading: creatingPlan }] = useCreatePlanMutation();
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [intervalType, setIntervalType] = useState<
    'day' | 'week' | 'month' | 'year'
  >('month');
  const [intervalCount, setIntervalCount] = useState('1');

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<number[]>([]);

  useEffect(() => {
    if (creator) {
      refetchCategories();
      refetchBenefits();
      refetchPlans();
    }
  }, [creator, refetchCategories, refetchBenefits, refetchPlans]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      return Alert.alert('Validation', 'Category name cannot be empty.');
    }
    try {
      await createCategory({
        name: newCategoryName.trim(),
        isPublic: newCategoryPublic,
      }).unwrap();
      setNewCategoryName('');
      setNewCategoryPublic(false);
      refetchCategories();
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Could not create category.');
    }
  };

  const handleCreateBenefit = async () => {
    if (!newBenefitName.trim()) {
      return Alert.alert('Validation', 'Benefit name cannot be empty.');
    }
    try {
      await createBenefit({ name: newBenefitName.trim() }).unwrap();
      setNewBenefitName('');
      refetchBenefits();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.data?.message || 'Could not create external benefit.',
      );
    }
  };

  const handleCreatePlan = async () => {
    if (!planName.trim() || !planPrice.trim()) {
      return Alert.alert('Validation', 'Plan name and price are required.');
    }
    const count = parseInt(intervalCount, 10) || 1;

    try {
      await createPlan({
        name: planName.trim(),
        description: planDescription.trim(),
        intervalType,
        intervalCount: count,
        price: planPrice.trim(),
        categoryIds: selectedCategoryIds,
        externalBenefits: selectedBenefitIds,
      }).unwrap();

      setPlanName('');
      setPlanDescription('');
      setPlanPrice('');
      setIntervalCount('1');
      setSelectedCategoryIds([]);
      setSelectedBenefitIds([]);
      refetchPlans();
      Alert.alert('Success', 'Plan created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Could not create plan.');
    }
  };

  if (loadingCreator) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  if (!creator) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.heading}>
          You must create/verify your Creator account first.
        </Text>
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
        <Text style={styles.sectionTitle}>Creator Categories</Text>
        {loadingCategories ? (
          <ActivityIndicator size="small" style={{ marginVertical: 8 }} />
        ) : (
          categories?.map((cat) => (
            <View key={cat.id} style={styles.listItem}>
              <Text style={styles.listItemText}>
                {cat.name} {cat.isPublic ? '(Public)' : '(Private)'}
              </Text>
            </View>
          ))
        )}
        <View style={styles.formRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="New category name"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <Pressable
            onPress={() => setNewCategoryPublic((prev) => !prev)}
            style={[
              styles.toggleBtn,
              newCategoryPublic && styles.toggleBtnChecked,
            ]}
          >
            <Text style={styles.toggleBtnText}>
              {newCategoryPublic ? 'Public' : 'Private'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={[
            styles.button,
            (!newCategoryName.trim() || creatingCategory) &&
              styles.buttonDisabled,
          ]}
          onPress={handleCreateCategory}
          disabled={!newCategoryName.trim() || creatingCategory}
        >
          {creatingCategory ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Category</Text>
          )}
        </Pressable>

        <View style={styles.sectionSeparator} />
        <Text style={styles.sectionTitle}>External Benefits</Text>
        {loadingBenefits ? (
          <ActivityIndicator size="small" style={{ marginVertical: 8 }} />
        ) : (
          benefits?.map((b) => (
            <View key={b.id} style={styles.listItem}>
              <Text style={styles.listItemText}>{b.name}</Text>
            </View>
          ))
        )}
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="New benefit name"
          value={newBenefitName}
          onChangeText={setNewBenefitName}
        />
        <Pressable
          style={[
            styles.button,
            (!newBenefitName.trim() || creatingBenefit) &&
              styles.buttonDisabled,
          ]}
          onPress={handleCreateBenefit}
          disabled={!newBenefitName.trim() || creatingBenefit}
        >
          {creatingBenefit ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Benefit</Text>
          )}
        </Pressable>

        <View style={styles.sectionSeparator} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Create a New Plan</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Plan Name"
          value={planName}
          onChangeText={setPlanName}
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Description (optional)"
          value={planDescription}
          onChangeText={setPlanDescription}
          multiline
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Price (e.g. 9.99)"
          value={planPrice}
          onChangeText={setPlanPrice}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Interval</Text>
        <View style={styles.intervalContainer}>
          {(['day', 'week', 'month', 'year'] as const).map((unit) => (
            <Pressable
              key={unit}
              onPress={() => setIntervalType(unit)}
              style={[
                styles.intervalBtn,
                intervalType === unit && styles.intervalBtnChecked,
              ]}
            >
              <Text
                style={[
                  styles.intervalBtnText,
                  intervalType === unit && styles.intervalBtnTextChecked,
                ]}
              >
                {unit.charAt(0).toUpperCase() + unit.slice(1)}
              </Text>
            </Pressable>
          ))}
          <TextInput
            style={styles.intervalCountInput}
            placeholder="#"
            value={intervalCount}
            onChangeText={setIntervalCount}
            keyboardType="number-pad"
          />
        </View>

        <Text style={[styles.subheading, { marginTop: 16 }]}>
          Select Categories:
        </Text>
        {loadingCategories ? (
          <ActivityIndicator size="small" />
        ) : (
          categories?.map((cat) => {
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
          })
        )}

        <Text style={[styles.subheading, { marginTop: 16 }]}>
          Select External Benefits:
        </Text>
        {loadingBenefits ? (
          <ActivityIndicator size="small" />
        ) : (
          benefits?.map((b) => {
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
          })
        )}

        <Pressable
          style={[
            styles.button,
            (!planName.trim() || !planPrice.trim() || creatingPlan) &&
              styles.buttonDisabled,
          ]}
          onPress={handleCreatePlan}
          disabled={!planName.trim() || !planPrice.trim() || creatingPlan}
        >
          {creatingPlan ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Plan</Text>
          )}
        </Pressable>

        <View style={styles.sectionSeparator} />
        <Text style={styles.sectionTitle}>Existing Plans</Text>
        {loadingPlans ? (
          <ActivityIndicator size="small" />
        ) : (
          plans?.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => navigation.navigate('EditPlan', { planId: p.id })}
              style={styles.planListItem}
            >
              <Text style={styles.planName}>{p.name}</Text>
              <Text style={styles.planDetail}>
                ${p.price} / {p.intervalCount} {p.interval}
              </Text>
              <Text style={styles.planDetail}>{p.description}</Text>
            </Pressable>
          ))
        )}

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

  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#FAFAFA',
    fontSize: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  intervalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCC',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  intervalBtnChecked: {
    backgroundColor: '#28A745',
    borderColor: '#28A745',
  },
  intervalBtnText: {
    fontSize: 14,
    color: '#333',
  },
  intervalBtnTextChecked: {
    color: '#fff',
  },
  intervalCountInput: {
    width: 60,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#FAFAFA',
    fontSize: 14,
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

  planListItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
  },
  planDetail: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },

  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  listItemText: {
    fontSize: 14,
    color: '#333',
  },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleBtn: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#EEE',
  },
  toggleBtnChecked: {
    backgroundColor: '#4CAF50',
  },
  toggleBtnText: {
    fontSize: 14,
    color: '#333',
  },

  button: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#28A745',
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

  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
});
