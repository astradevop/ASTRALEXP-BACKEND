import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsAPI, BASE_URL } from '../services/api';
import { Colors, Spacing, Radius, Shadow } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mobile view padding is typically 32 combined (16 left/right). 
// For web/desktop, we clamp the chart width.
const CHART_WIDTH = Platform.OS === 'web' ? Math.min(SCREEN_WIDTH - 280, 800) : SCREEN_WIDTH - 32;

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [unusual, setUnusual] = useState(null);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      
      // Parallel fetch
      const [resSummary, resPrediction, resUnusual] = await Promise.all([
        analyticsAPI.getSummary(),
        analyticsAPI.getPredictions(),
        analyticsAPI.getUnusual(),
      ]);
      
      setSummary(resSummary.data);
      setPrediction(resPrediction.data);
      setUnusual(resUnusual.data);
    } catch (err) {
      console.error('Analytics Error:', err);
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [])
  );

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      
      if (Platform.OS === 'web') {
        // Quick web fallback for authenticated download
        const res = await analyticsAPI.exportCSV();
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'astralexp_report.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // Mobile download using FileSystem
      const fileUri = FileSystem.documentDirectory + 'astralexp_report.csv';
      const downloadRes = await FileSystem.downloadAsync(
        `${BASE_URL}/analytics/export-csv/`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri, { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv' });
        } else {
          alert('Sharing is not available on this device');
        }
      } else {
        alert('Failed to export CSV report.');
      }
    } catch (e) {
      console.error(e);
      alert('Error exporting CSV');
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: Colors.surfaceContainer,
    backgroundGradientTo: Colors.surfaceContainerHigh,
    backgroundGradientFromOpacity: 0.1,
    backgroundGradientToOpacity: 0.4,
    color: (opacity = 1) => `rgba(186, 195, 255, ${opacity})`, // Colors.primary
    strokeWidth: 3, 
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(197, 197, 212, ${opacity})`, // Colors.onSurfaceVariant
    style: {
      borderRadius: Radius.md,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: Colors.primaryContainer,
    },
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAnalytics}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!summary) return null;

  const hasDailyData = summary.daily?.dates?.length > 1;
  const hasMonthlyData = summary.monthly?.months?.length > 1;
  const hasCategoryData = summary.category?.categories?.length > 0;

  // Prepare Pie Chart data
  const pieColors = ['#bac3ff', '#bec4f2', '#78dc77', '#ffb4ab', '#8f909e', '#4355b9'];
  const pieData = (summary.category?.categories || []).map((cat, index) => ({
    name: cat,
    population: summary.category.totals[index] || 0,
    color: pieColors[index % pieColors.length],
    legendFontColor: Colors.onSurfaceVariant,
    legendFontSize: 12,
  })).filter(d => d.population > 0).slice(0, 6); // Top 6

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} tintColor={Colors.primary} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Analytics & Insights</Text>
          <Text style={styles.subtitle}>Powered by AI & Machine Learning</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <Ionicons name="download-outline" size={20} color={Colors.onPrimaryContainer} />
          <Text style={styles.exportBtnText}>CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Overview Cards */}
      <View style={styles.row}>
        <View style={styles.kpiCard}>
          <Ionicons name="wallet" size={24} color={Colors.primary} style={styles.kpiIcon} />
          <Text style={styles.kpiLabel}>Total Spent</Text>
          <Text style={styles.kpiValue}>₹{summary.total_spent?.toLocaleString()}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: Colors.tertiaryContainer + '30' }]}>
          <Ionicons name="calendar" size={24} color={Colors.tertiary} style={styles.kpiIcon} />
          <Text style={styles.kpiLabel}>Daily Avg</Text>
          <Text style={[styles.kpiValue, { color: Colors.tertiary }]}>₹{summary.average_daily?.toLocaleString()}</Text>
        </View>
      </View>

      {/* AI Prediction Card */}
      {prediction && prediction.predicted_amount !== null && (
        <View style={[styles.insightCard, styles.predictCard]}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={20} color={'#FACC15'} />
            <Text style={styles.insightTitle}>Next Month Forecast</Text>
          </View>
          <Text style={styles.predictAmount}>₹{prediction.predicted_amount.toLocaleString()}</Text>
          <Text style={styles.insightText}>
            Trend is <Text style={{ color: prediction.trend === 'increasing' ? Colors.error : Colors.tertiary, fontWeight: 'bold' }}>{prediction.trend}</Text>. 
            Confidence: {prediction.confidence.toUpperCase()}. {prediction.message}
          </Text>
        </View>
      )}

      {/* Unusual Expenses Flag */}
      {unusual && unusual.total_unusual > 0 && (
        <View style={[styles.insightCard, styles.unusualCard]}>
          <View style={styles.insightHeader}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <Text style={[styles.insightTitle, { color: Colors.error }]}>Anomalies Detected</Text>
          </View>
          {unusual.unusual_expenses.slice(0, 2).map((exp) => (
            <View key={exp.id.toString()} style={styles.anomalyItem}>
              <Text style={styles.anomalyCat}>{exp.category} - ₹{exp.amount}</Text>
              <Text style={styles.anomalyReason}>{exp.reason}</Text>
            </View>
          ))}
          {unusual.total_unusual > 2 && (
            <Text style={styles.anomalyReason}>+ {unusual.total_unusual - 2} more unusual expenses...</Text>
          )}
        </View>
      )}

      {/* Daily Trend Chart */}
      {hasDailyData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Daily Spend Trend (Last 30 Days)</Text>
          <LineChart
            data={{
              labels: summary.daily.dates.map(d => d.slice(5)).filter((_, i) => i % Math.ceil(summary.daily.dates.length/6) === 0),
              datasets: [{ data: summary.daily.totals }],
            }}
            width={CHART_WIDTH}
            height={220}
            yAxisLabel="₹"
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        </View>
      )}

      {/* Monthly Chart */}
      {hasMonthlyData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Month-over-Month Details</Text>
          <BarChart
            data={{
              labels: summary.monthly.months,
              datasets: [{ data: summary.monthly.totals }],
            }}
            width={CHART_WIDTH}
            height={220}
            yAxisLabel="₹"
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(120, 220, 119, ${opacity})`, // tertiary color for variation
            }}
            style={styles.chartStyle}
            showValuesOnTopOfBars
          />
        </View>
      )}

      {/* Category Pie Chart */}
      {hasCategoryData && pieData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Top Spending Categories</Text>
          <PieChart
            data={pieData}
            width={CHART_WIDTH}
            height={200}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"0"}
            center={[10, 0]}
            absolute // shows the absolute amounts instead of percentages
          />
        </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingTop: Platform.OS === 'web' ? Spacing.xl : Spacing.md,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerTitles: {
    flex: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  exportBtnText: {
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
    ...Shadow.ambient,
  },
  kpiIcon: {
    marginBottom: Spacing.sm,
  },
  kpiLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  insightCard: {
    backgroundColor: Colors.surfaceContainer,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    ...Shadow.ambient,
  },
  predictCard: {
    borderColor: '#FACC15' + '50',
    backgroundColor: '#FACC15' + '10',
  },
  unusualCard: {
    borderColor: Colors.error + '50',
    backgroundColor: Colors.error + '10',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FACC15',
  },
  insightText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  predictAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  anomalyItem: {
    marginTop: 8,
    padding: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
  },
  anomalyCat: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  anomalyReason: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
    ...Shadow.ambient,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: Radius.md,
  },
});
