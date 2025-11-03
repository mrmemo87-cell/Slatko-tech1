import React, { useState, useEffect } from 'react';
import { BusinessAlert, AlertPriority } from '../../types';
import { businessIntelligence } from '../../services/businessIntelligence';
import { formatDate } from '../../utils';

interface AlertCenterProps {
  t: any;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({ t }) => {
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | AlertPriority>('ALL');

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        // Generate fresh alerts first
        await businessIntelligence.generateAllAlerts();
        // Then get the active ones
        const activeAlerts = businessIntelligence.getActiveAlerts();
        setAlerts(activeAlerts);
      } catch (error) {
        console.error('Error loading alerts:', error);
        // Fallback to just getting existing alerts
        const activeAlerts = businessIntelligence.getActiveAlerts();
        setAlerts(activeAlerts);
      }
    };

    loadAlerts();
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return '📦';
      case 'EXPIRING_MATERIAL':
        return '⏰';
      case 'OVERDUE_PAYMENT':
        return '💰';
      case 'PRODUCTION_CAPACITY':
        return '⚙️';
      case 'QUALITY_ISSUE':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const handleMarkAsRead = (alertId: string) => {
    businessIntelligence.markAlertAsRead(alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const handleResolve = (alertId: string) => {
    businessIntelligence.resolveAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const filteredAlerts = alerts.filter(alert => 
    filter === 'ALL' || alert.priority === filter
  );

  const criticalCount = alerts.filter(a => a.priority === 'CRITICAL').length;
  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="relative">
      {/* Alert Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors ${
          criticalCount > 0 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : unreadCount > 0
            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        🔔
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center text-white ${
            criticalCount > 0 ? 'bg-red-500' : 'bg-orange-500'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Alert Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-slate-800 dark:text-white">
                Business Alerts ({alerts.length})
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            {/* Priority Filter */}
            <div className="flex space-x-2">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(priority => (
                <button
                  key={priority}
                  onClick={() => setFilter(priority)}
                  className={`px-2 py-1 text-xs rounded ${
                    filter === priority 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Alert List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                {filter === 'ALL' ? 'No alerts' : `No ${filter.toLowerCase()} priority alerts`}
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    !alert.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-block px-2 py-1 text-xs rounded border ${getPriorityColor(alert.priority)}`}>
                          {alert.priority}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(alert.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm text-slate-800 dark:text-white mb-1">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                        {alert.message}
                      </p>
                      <div className="flex space-x-2">
                        {!alert.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(alert.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="text-xs text-green-600 hover:text-green-800 dark:text-green-400"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};