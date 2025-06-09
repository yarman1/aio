import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { CreatorTabsParamList } from '../../navigation/CreatorTabs';
import {
  baseAPI,
  useGetCreatorPlansQuery,
  useGetSubscriptionInfoQuery,
  useLazyGetCheckoutSessionQuery,
  useLazyGetPortalLinkQuery,
  useUpgradeConfirmMutation,
  useUpgradePreviewMutation,
} from '../../services/baseAPI';
import { useDispatch } from 'react-redux';

type PlansRoute = RouteProp<CreatorTabsParamList, 'Plans'>;

export default function CreatorPlansScreen() {
  const { creatorId } = useRoute<PlansRoute>().params;

  const {
    data: plans,
    isFetching: loadingPlans,
    refetch: refetchPlans,
  } = useGetCreatorPlansQuery(creatorId, {
    refetchOnMountOrArgChange: true,
  });

  const {
    data: subInfo,
    isFetching: loadingSub,
    refetch: refetchSubInfo,
  } = useGetSubscriptionInfoQuery(creatorId, {
    refetchOnMountOrArgChange: true,
  });

  const [fetchCheckout] = useLazyGetCheckoutSessionQuery();
  const [fetchPortal] = useLazyGetPortalLinkQuery();

  const dispatch = useDispatch();

  const [previewUpgrade] = useUpgradePreviewMutation();
  const [confirmUpgrade] = useUpgradeConfirmMutation();

  useFocusEffect(
    useCallback(() => {
      refetchSubInfo();
      refetchPlans();
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
    }, [refetchSubInfo, refetchPlans]),
  );

  const onSubscribe = async (planId: number) => {
    try {
      const session = await fetchCheckout(planId).unwrap();
      await Linking.openURL(session.url);
    } catch (err) {
      console.error(err);
      Alert.alert('Oops', 'Could not start checkout. Try again.');
    }
  };

  const onManage = async () => {
    try {
      const portal = await fetchPortal(creatorId).unwrap();
      await Linking.openURL(portal.url);
    } catch (err) {
      console.error(err);
      Alert.alert('Oops', 'Could not open billing portal.');
    }
  };

  if (loadingPlans || loadingSub) {
    return <ActivityIndicator style={styles.center} />;
  }

  const hasAnySub = !!subInfo;

  const handlePreview = async (newPlanId: number) => {
    try {
      const preview = await previewUpgrade({ creatorId, newPlanId }).unwrap();

      const netCents = preview.lines.reduce((sum, l) => sum + l.amount, 0);
      const net = netCents / 100;

      const title =
        net > 0
          ? `You’ll owe $${net.toFixed(2)}`
          : net < 0
            ? `You’ll receive $${Math.abs(net).toFixed(2)} credit`
            : `No additional charge`;

      const message =
        `${title}\n\n` +
        preview.lines
          .map(
            (l) =>
              `${l.description}: ${l.amount > 0 ? '+' : ''}$${(
                l.amount / 100
              ).toFixed(2)}`,
          )
          .join('\n');

      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Upgrade',
          onPress: async () => {
            await confirmUpgrade({ creatorId, newPlanId }).unwrap();
            refetchSubInfo();
            refetchPlans();
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
          },
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not retrieve upgrade preview.');
    }
  };

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={plans}
      keyExtractor={(p) => p.id.toString()}
      ListHeaderComponent={<Text style={styles.header}>Available Plans</Text>}
      renderItem={({ item }) => {
        const isCurrent = subInfo?.planId === item.id;

        return (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>
              ${item.price} / {item.intervalCount} {item.interval}
            </Text>
            <Text style={styles.description}>{item.description}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.badgeRow}>
                {item.creatorCategories.map((c) => (
                  <View key={c.id} style={styles.categoryBadge}>
                    <Text style={styles.badgeText}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Benefits</Text>
              <View style={styles.badgeRow}>
                {item.externalBenefits.map((b) => (
                  <View key={b.id} style={styles.benefitBadge}>
                    <Text style={styles.benefitText}>{b.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {isCurrent && subInfo && (
              <View style={styles.subscriptionInfo}>
                {subInfo.isCancelled ? (
                  <Text style={styles.subInfoText}>
                    ❗ Cancelled — expires on{' '}
                    {new Date(subInfo.currentPeriodEnd).toLocaleDateString()}
                  </Text>
                ) : (
                  <Text style={styles.subInfoText}>
                    ✅ Renews on{' '}
                    {new Date(subInfo.currentPeriodEnd).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}

            {isCurrent ? (
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={onManage}
              >
                <Text style={styles.buttonText}>Edit Subscription</Text>
              </TouchableOpacity>
            ) : hasAnySub ? (
              <TouchableOpacity
                style={[styles.button, styles.upgradeButton]}
                onPress={() => handlePreview(item.id)}
              >
                <Text style={styles.buttonText}>Preview Upgrade</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.subscribeButton]}
                onPress={async () => await onSubscribe(item.id)}
              >
                <Text style={styles.buttonText}>Subscribe</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },

  card: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  name: { fontSize: 18, fontWeight: '600' },
  price: { marginVertical: 8, fontWeight: '500' },
  description: { color: '#666', marginBottom: 12 },

  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap' },
  categoryBadge: {
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: { fontSize: 12, color: '#00796B' },
  benefitBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  benefitText: { fontSize: 12, color: '#E65100' },

  subscriptionInfo: {
    marginTop: 8,
    marginBottom: 4,
  },
  subInfoText: {
    marginVertical: 8,
    fontSize: 13,
    color: '#444',
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButton: { backgroundColor: '#4CAF50' },
  editButton: { backgroundColor: '#2196F3' },
  upgradeButton: { backgroundColor: '#FF9800' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
