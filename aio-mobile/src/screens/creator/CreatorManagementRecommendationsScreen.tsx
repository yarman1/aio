import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useGetCreatorCategoriesQuery,
  useGetPlansQuery,
} from '../../services/baseAPI';
import {
  useGetCategoryRecommendationsQuery,
  useGetPlanRecommendationsQuery,
} from '../../services/baseAPI';

function formatDateYYYYMMDD(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreatorManagementRecommendationsScreen() {
  const { data: categories, isLoading: loadingCats } =
    useGetCreatorCategoriesQuery();
  const { data: plans, isLoading: loadingPlans } = useGetPlansQuery();

  const yesterdayString = useMemo(() => {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() - 1);
    return formatDateYYYYMMDD(now);
  }, []);

  const [categoryDate, setCategoryDate] = useState<string>(yesterdayString);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const {
    data: categoryRec,
    isFetching: fetchingCategoryRec,
    refetch: fetchCategoryRec,
  } = useGetCategoryRecommendationsQuery(
    { categoryId: selectedCategoryId || 0, date: categoryDate },
    { skip: selectedCategoryId === null },
  );

  const [planDate, setPlanDate] = useState<string>(yesterdayString);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const {
    data: planRec,
    isFetching: fetchingPlanRec,
    refetch: fetchPlanRec,
  } = useGetPlanRecommendationsQuery(
    { planId: selectedPlanId || 0, date: planDate },
    { skip: selectedPlanId === null },
  );

  useEffect(() => {
    if (selectedCategoryId !== null) fetchCategoryRec();
  }, [selectedCategoryId, categoryDate, fetchCategoryRec]);

  useEffect(() => {
    if (selectedPlanId !== null) fetchPlanRec();
  }, [selectedPlanId, planDate, fetchPlanRec]);

  if (loadingCats || loadingPlans) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  const STATUS_BAR_HEIGHT = Platform.select({
    android: StatusBar.currentHeight ?? 0,
    web: 0,
  });

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS !== 'web' && (
        <>
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle="dark-content"
          />
          <View style={{ height: STATUS_BAR_HEIGHT }} />
        </>
      )}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Category Recommendations</Text>
        {categories && categories.length === 0 && (
          <Text style={styles.emptyText}>You have no categories yet.</Text>
        )}

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Date: {categoryDate}</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() =>
              Platform.OS === 'web' ? null : setShowCategoryPicker(true)
            }
          >
            <Text style={styles.dateButtonText}>Select Date</Text>
          </Pressable>
        </View>
        {Platform.OS === 'web' ? (
          <View style={styles.webDateInputContainer}>
            {/* @ts-ignore */}
            <input
              type="date"
              value={categoryDate}
              max={yesterdayString}
              onChange={(e) => setCategoryDate(e.target.value)}
              style={styles.webDateInput}
            />
          </View>
        ) : showCategoryPicker ? (
          <DateTimePicker
            value={new Date(categoryDate)}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, selected) => {
              setShowCategoryPicker(false);
              if (selected) {
                const utc = new Date(
                  Date.UTC(
                    selected.getUTCFullYear(),
                    selected.getUTCMonth(),
                    selected.getUTCDate(),
                  ),
                );
                setCategoryDate(formatDateYYYYMMDD(utc));
              }
            }}
          />
        ) : null}

        {categories?.map((cat) => (
          <View key={cat.id} style={styles.itemContainer}>
            <Text style={styles.itemName}>{cat.name}</Text>
            <Pressable
              style={styles.button}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text style={styles.buttonText}>Get Recommendation</Text>
            </Pressable>
            {selectedCategoryId === cat.id && (
              <View style={styles.recContainer}>
                {fetchingCategoryRec ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : categoryRec?.recommendation ? (
                  <Text style={styles.recText}>
                    {categoryRec.recommendation}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        ))}

        <View style={styles.separator} />
        <Text style={styles.sectionTitle}>Plan Recommendations</Text>
        {plans && plans.length === 0 && (
          <Text style={styles.emptyText}>You have no plans yet.</Text>
        )}

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Date: {planDate}</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() =>
              Platform.OS === 'web' ? null : setShowPlanPicker(true)
            }
          >
            <Text style={styles.dateButtonText}>Select Date</Text>
          </Pressable>
        </View>
        {Platform.OS === 'web' ? (
          <View style={styles.webDateInputContainer}>
            {/* @ts-ignore */}
            <input
              type="date"
              value={planDate}
              max={yesterdayString}
              onChange={(e) => setPlanDate(e.target.value)}
              style={styles.webDateInput}
            />
          </View>
        ) : showPlanPicker ? (
          <DateTimePicker
            value={new Date(planDate)}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, selected) => {
              setShowPlanPicker(false);
              if (selected) {
                const utc = new Date(
                  Date.UTC(
                    selected.getUTCFullYear(),
                    selected.getUTCMonth(),
                    selected.getUTCDate(),
                  ),
                );
                setPlanDate(formatDateYYYYMMDD(utc));
              }
            }}
          />
        ) : null}

        {plans?.map((plan) => (
          <View key={plan.id} style={styles.itemContainer}>
            <Text style={styles.itemName}>{plan.name}</Text>
            <Pressable
              style={styles.button}
              onPress={() => setSelectedPlanId(plan.id)}
            >
              <Text style={styles.buttonText}>Get Recommendation</Text>
            </Pressable>
            {selectedPlanId === plan.id && (
              <View style={styles.recContainer}>
                {fetchingPlanRec ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : planRec?.recommendation ? (
                  <Text style={styles.recText}>{planRec.recommendation}</Text>
                ) : null}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
    color: '#555',
  },
  separator: { height: 1, backgroundColor: '#EEE', marginVertical: 24 },

  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  dateButton: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dateButtonText: { color: '#fff', fontSize: 14 },

  webDateInputContainer: { marginBottom: 16 },
  webDateInput: {
    width: 200,
    padding: 8,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
  },

  itemContainer: { marginBottom: 24 },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  recContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
    paddingLeft: 12,
  },
  recText: { fontSize: 14, color: '#333' },
});
