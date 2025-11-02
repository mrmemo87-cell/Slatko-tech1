import { Material, Product, Client, ProductionBatch, Delivery, BusinessAlert, BusinessMetrics, MaterialPrediction, AlertType, AlertPriority } from '../types';
import { api } from './api';
import { generateId } from '../utils';

class BusinessIntelligenceService {
  // Alert Management
  private alerts: BusinessAlert[] = this.getStoredAlerts();

  private getStoredAlerts(): BusinessAlert[] {
    try {
      const stored = localStorage.getItem('business_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveAlerts() {
    localStorage.setItem('business_alerts', JSON.stringify(this.alerts));
  }

  // Generate inventory alerts
  generateInventoryAlerts(): BusinessAlert[] {
    const materials = api.getMaterials();
    const newAlerts: BusinessAlert[] = [];
    const now = new Date();

    materials.forEach(material => {
      // Low stock alert
      if (material.stock <= material.lowStockThreshold) {
        const priority: AlertPriority = material.stock === 0 ? 'CRITICAL' : 
                                      material.stock < material.lowStockThreshold * 0.5 ? 'HIGH' : 'MEDIUM';
        
        newAlerts.push({
          id: generateId(),
          type: 'LOW_STOCK',
          priority,
          title: `Low Stock: ${material.name}`,
          message: `${material.name} is running low. Current stock: ${material.stock} ${material.unit}. Threshold: ${material.lowStockThreshold} ${material.unit}`,
          data: { materialId: material.id, currentStock: material.stock, threshold: material.lowStockThreshold },
          createdAt: now.toISOString(),
          isRead: false,
          isResolved: false
        });
      }

      // Expiration alert (if expiration date is set)
      if (material.expirationDate) {
        const expirationDate = new Date(material.expirationDate);
        const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          newAlerts.push({
            id: generateId(),
            type: 'EXPIRING_MATERIAL',
            priority: daysUntilExpiry <= 2 ? 'HIGH' : 'MEDIUM',
            title: `Material Expiring Soon: ${material.name}`,
            message: `${material.name} expires in ${daysUntilExpiry} days. Stock: ${material.stock} ${material.unit}`,
            data: { materialId: material.id, daysUntilExpiry, stock: material.stock },
            createdAt: now.toISOString(),
            isRead: false,
            isResolved: false
          });
        } else if (daysUntilExpiry <= 0) {
          newAlerts.push({
            id: generateId(),
            type: 'EXPIRING_MATERIAL',
            priority: 'CRITICAL',
            title: `Material Expired: ${material.name}`,
            message: `${material.name} has expired. Remove from inventory immediately. Stock: ${material.stock} ${material.unit}`,
            data: { materialId: material.id, daysUntilExpiry, stock: material.stock },
            createdAt: now.toISOString(),
            isRead: false,
            isResolved: false
          });
        }
      }
    });

    return newAlerts;
  }

  // Generate payment alerts
  generatePaymentAlerts(): BusinessAlert[] {
    const deliveries = api.getDeliveries();
    const clients = api.getClients();
    const newAlerts: BusinessAlert[] = [];
    const now = new Date();

    deliveries.forEach(delivery => {
      if (delivery.status === 'Settled' || delivery.status === 'Pending') {
        const client = clients.find(c => c.id === delivery.clientId);
        const deliveryDate = new Date(delivery.date);
        const paymentTermDays = client?.paymentTermDays || 30;
        const dueDate = new Date(deliveryDate.getTime() + (paymentTermDays * 24 * 60 * 60 * 1000));
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue > 0) {
          const totalAmount = delivery.items.reduce((sum, item) => {
            const returnedQty = delivery.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
            return sum + ((item.quantity - returnedQty) * item.price);
          }, 0);

          const paidAmount = delivery.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
          const amountDue = totalAmount - paidAmount;

          if (amountDue > 0) {
            const priority: AlertPriority = daysOverdue > 30 ? 'CRITICAL' : daysOverdue > 14 ? 'HIGH' : 'MEDIUM';
            
            newAlerts.push({
              id: generateId(),
              type: 'OVERDUE_PAYMENT',
              priority,
              title: `Overdue Payment: ${client?.name || 'Unknown'}`,
              message: `Invoice ${delivery.invoiceNumber} is ${daysOverdue} days overdue. Amount due: ${amountDue.toFixed(2)} KGS`,
              data: { 
                deliveryId: delivery.id, 
                clientId: delivery.clientId, 
                daysOverdue, 
                amountDue,
                invoiceNumber: delivery.invoiceNumber 
              },
              createdAt: now.toISOString(),
              isRead: false,
              isResolved: false
            });
          }
        }
      }
    });

    return newAlerts;
  }

  // Calculate business metrics
  calculateBusinessMetrics(): BusinessMetrics {
    const materials = api.getMaterials();
    const production = api.getProduction();
    const deliveries = api.getDeliveries();
    const inventory = api.getInventory();

    // Total inventory value
    const totalInventoryValue = materials.reduce((sum, material) => {
      return sum + (material.stock * (material.costPerUnit || 0));
    }, 0);

    // Low stock items count
    const lowStockItems = materials.filter(m => m.stock <= m.lowStockThreshold).length;

    // Expiring materials count
    const now = new Date();
    const expiringMaterials = materials.filter(material => {
      if (!material.expirationDate) return false;
      const expirationDate = new Date(material.expirationDate);
      const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 7;
    }).length;

    // Production efficiency (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentProduction = production.filter(batch => new Date(batch.date) >= thirtyDaysAgo);
    const totalProduced = recentProduction.reduce((sum, batch) => sum + batch.quantity, 0);
    const productionEfficiency = recentProduction.length > 0 ? 
      Math.min(100, (totalProduced / (recentProduction.length * 20)) * 100) : 0; // Assume 20 units per batch is optimal

    // Cash flow status (pending receivables - overdue amounts)
    const pendingReceivables = deliveries
      .filter(d => d.status !== 'Paid')
      .reduce((sum, delivery) => {
        const totalAmount = delivery.items.reduce((itemSum, item) => {
          const returnedQty = delivery.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0;
          return itemSum + ((item.quantity - returnedQty) * item.price);
        }, 0);
        const paidAmount = delivery.payments?.reduce((paySum, p) => paySum + p.amount, 0) || 0;
        return sum + (totalAmount - paidAmount);
      }, 0);

    // Quality score (based on recent production batches with quality scores)
    const batchesWithQuality = recentProduction.filter(batch => batch.qualityScore !== undefined);
    const qualityScore = batchesWithQuality.length > 0 ?
      batchesWithQuality.reduce((sum, batch) => sum + (batch.qualityScore || 0), 0) / batchesWithQuality.length : 85;

    // Client satisfaction score (based on returns and complaints)
    const recentDeliveries = deliveries.filter(d => new Date(d.date) >= thirtyDaysAgo);
    const totalReturns = recentDeliveries.reduce((sum, d) => 
      sum + (d.returnedItems?.reduce((returnSum, item) => returnSum + item.quantity, 0) || 0), 0);
    const totalDelivered = recentDeliveries.reduce((sum, d) => 
      sum + d.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    const returnRate = totalDelivered > 0 ? (totalReturns / totalDelivered) : 0;
    const clientSatisfactionScore = Math.max(0, 100 - (returnRate * 100 * 10)); // 10% return = 0% satisfaction

    return {
      totalInventoryValue,
      lowStockItems,
      expiringMaterials,
      productionEfficiency,
      cashFlowStatus: pendingReceivables,
      qualityScore,
      clientSatisfactionScore
    };
  }

  // Predict material stockouts
  predictMaterialStockouts(): MaterialPrediction[] {
    const materials = api.getMaterials();
    const production = api.getProduction();
    const products = api.getProducts();
    const predictions: MaterialPrediction[] = [];

    // Get last 30 days of production for usage patterns
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const recentProduction = production.filter(batch => new Date(batch.date) >= thirtyDaysAgo);

    materials.forEach(material => {
      // Calculate daily usage rate
      let totalUsage = 0;
      
      recentProduction.forEach(batch => {
        const product = products.find(p => p.id === batch.productId);
        if (product?.recipe) {
          const recipeItem = product.recipe.find(r => r.materialId === material.id);
          if (recipeItem) {
            totalUsage += recipeItem.quantity * batch.quantity;
          }
        }
      });

      const dailyUsageRate = totalUsage / 30; // Average daily usage

      if (dailyUsageRate > 0 && material.stock > 0) {
        const daysUntilStockout = Math.floor(material.stock / dailyUsageRate);
        const stockoutDate = new Date(Date.now() + (daysUntilStockout * 24 * 60 * 60 * 1000));
        
        // Recommend order quantity (for 2 weeks + safety stock)
        const leadTime = material.leadTimeDays || 7;
        const safetyStockDays = 7;
        const recommendedOrderQuantity = Math.ceil(dailyUsageRate * (leadTime + safetyStockDays + 14));
        
        // Confidence based on data consistency
        const confidenceLevel = Math.min(100, (recentProduction.length / 10) * 100);

        if (daysUntilStockout <= 30) { // Only predict for next 30 days
          predictions.push({
            materialId: material.id,
            predictedStockoutDate: stockoutDate.toISOString(),
            recommendedOrderQuantity,
            confidenceLevel
          });
        }
      }
    });

    return predictions.sort((a, b) => 
      new Date(a.predictedStockoutDate).getTime() - new Date(b.predictedStockoutDate).getTime()
    );
  }

  // Get all active alerts
  getActiveAlerts(): BusinessAlert[] {
    // Remove old alerts (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.createdAt) > sevenDaysAgo || !alert.isResolved
    );

    // Generate new alerts
    const inventoryAlerts = this.generateInventoryAlerts();
    const paymentAlerts = this.generatePaymentAlerts();
    
    // Add new alerts (avoid duplicates)
    [...inventoryAlerts, ...paymentAlerts].forEach(newAlert => {
      const exists = this.alerts.some(existing => 
        existing.type === newAlert.type && 
        JSON.stringify(existing.data) === JSON.stringify(newAlert.data)
      );
      
      if (!exists) {
        this.alerts.push(newAlert);
      }
    });

    this.saveAlerts();
    return this.alerts.filter(alert => !alert.isResolved);
  }

  // Mark alert as read
  markAlertAsRead(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
      this.saveAlerts();
    }
  }

  // Resolve alert
  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isResolved = true;
      this.saveAlerts();
    }
  }

  // Get critical alerts count
  getCriticalAlertsCount(): number {
    return this.getActiveAlerts().filter(alert => alert.priority === 'CRITICAL').length;
  }
}

export const businessIntelligence = new BusinessIntelligenceService();