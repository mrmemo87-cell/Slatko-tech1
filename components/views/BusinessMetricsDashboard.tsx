import React, { useState, useEffect, useMemo } from 'react';
import { BusinessMetrics, MaterialPrediction } from '../../types';
import { businessIntelligence } from '../../services/businessIntelligence';
import { formatCurrency } from '../../utils';

interface BusinessMetricsDashboardProps {
  t: any;
}

export const BusinessMetricsDashboard: React.FC<BusinessMetricsDashboardProps> = ({ t }) => {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [predictions, setPredictions] = useState<MaterialPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      const businessMetrics = businessIntelligence.calculateBusinessMetrics();
      const materialPredictions = businessIntelligence.predictMaterialStockouts();
      
      setMetrics(businessMetrics);
      setPredictions(materialPredictions);
      setIsLoading(false);
    };

    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const MetricCard: React.FC<{ 
    title: string; 
    value: string | number; 
    subtext?: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
    icon?: string;
  }> = ({ title, value, subtext, color = 'blue', icon = '📊' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200',
      green: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200',
      red: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200',
      purple: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-200'
    };

    return (
      <div className={`p-4 border rounded-lg ${colorClasses[color]}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && <p className="text-xs opacity-60">{subtext}</p>}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const getScoreColor = (score: number): 'green' | 'yellow' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const getCashFlowColor = (amount: number): 'green' | 'red' => {
    return amount >= 0 ? 'green' : 'red';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Business Intelligence Dashboard
        </h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Inventory Value"
          value={formatCurrency(metrics.totalInventoryValue)}
          icon="💰"
          color="blue"
          subtext="Current material stock value"
        />
        
        <MetricCard
          title="Production Efficiency"
          value={`${metrics.productionEfficiency.toFixed(1)}%`}
          icon="⚙️"
          color={getScoreColor(metrics.productionEfficiency)}
          subtext="Last 30 days performance"
        />
        
        <MetricCard
          title="Quality Score"
          value={`${metrics.qualityScore.toFixed(1)}%`}
          icon="⭐"
          color={getScoreColor(metrics.qualityScore)}
          subtext="Average batch quality"
        />
        
        <MetricCard
          title="Cash Flow Status"
          value={formatCurrency(metrics.cashFlowStatus)}
          icon={metrics.cashFlowStatus >= 0 ? "📈" : "📉"}
          color={getCashFlowColor(metrics.cashFlowStatus)}
          subtext="Pending receivables"
        />
        
        <MetricCard
          title="Client Satisfaction"
          value={`${metrics.clientSatisfactionScore.toFixed(1)}%`}
          icon="😊"
          color={getScoreColor(metrics.clientSatisfactionScore)}
          subtext="Based on return rates"
        />
        
        <MetricCard
          title="Inventory Alerts"
          value={metrics.lowStockItems + metrics.expiringMaterials}
          icon="🚨"
          color={metrics.lowStockItems + metrics.expiringMaterials > 0 ? 'red' : 'green'}
          subtext={`${metrics.lowStockItems} low stock, ${metrics.expiringMaterials} expiring`}
        />
      </div>

      {/* Material Predictions */}
      {predictions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            📋 Material Stockout Predictions
          </h3>
          <div className="space-y-3">
            {predictions.slice(0, 5).map((prediction, index) => {
              const daysUntil = Math.ceil(
                (new Date(prediction.predictedStockoutDate).getTime() - new Date().getTime()) / 
                (1000 * 60 * 60 * 24)
              );
              
              return (
                <div 
                  key={prediction.materialId} 
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-slate-800 dark:text-white">
                      Material ID: {prediction.materialId}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      Predicted stockout in {daysUntil} days
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-800 dark:text-white">
                      Order: {prediction.recommendedOrderQuantity} units
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {prediction.confidenceLevel.toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {predictions.length > 5 && (
            <div className="mt-3 text-center">
              <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                View all {predictions.length} predictions
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
          🚀 Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg text-left transition-colors">
            <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
              🛒 Create Purchase Orders
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-300">
              For predicted stockouts
            </div>
          </button>
          
          <button className="p-4 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg text-left transition-colors">
            <div className="font-medium text-green-800 dark:text-green-200 mb-1">
              📞 Follow Up Payments
            </div>
            <div className="text-sm text-green-600 dark:text-green-300">
              Contact overdue clients
            </div>
          </button>
          
          <button className="p-4 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 rounded-lg text-left transition-colors">
            <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">
              📊 Generate Reports
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-300">
              Export detailed analytics
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};